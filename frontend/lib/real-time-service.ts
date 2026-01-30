// Real-time threat intelligence service with background processing
import { NISTClient, CISAClient, RSSFeedClient, type APIConfig } from "./api-clients"
import { threatIntelDB, type ThreatIntelRecord, type FeedStatus } from "./database"

export interface FeedConfiguration {
  id: string
  name: string
  url: string
  type: "nist" | "cisa" | "rss" | "json"
  category: string
  enabled: boolean
  updateFrequency: number // minutes
  lastFetch?: string
  status: "active" | "error" | "disabled"
}

export class RealTimeThreatIntelService {
  private nistClient: NISTClient
  private cisaClient: CISAClient
  private rssClient: RSSFeedClient
  private feeds: FeedConfiguration[]
  private isRunning = false
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private subscribers: Set<(data: ThreatIntelRecord[]) => void> = new Set()

  constructor(config: APIConfig) {
    this.nistClient = new NISTClient(config)
    this.cisaClient = new CISAClient(config)
    this.rssClient = new RSSFeedClient(config)

    this.feeds = [
      {
        id: "nist-nvd",
        name: "NIST NVD",
        url: "https://services.nvd.nist.gov/rest/json/cves/2.0",
        type: "nist",
        category: "Vulnerabilities",
        enabled: true,
        updateFrequency: 60, // 1 hour
        status: "active",
      },
      {
        id: "cisa-alerts",
        name: "CISA Alerts",
        url: "https://www.cisa.gov/sites/default/files/feeds/alerts.xml",
        type: "cisa",
        category: "Government",
        enabled: true,
        updateFrequency: 30, // 30 minutes
        status: "active",
      },
      {
        id: "cisa-kev",
        name: "CISA KEV",
        url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
        type: "cisa",
        category: "Government",
        enabled: true,
        updateFrequency: 120, // 2 hours
        status: "active",
      },
      {
        id: "microsoft-security",
        name: "Microsoft Security",
        url: "https://msrc.microsoft.com/blog/feed/",
        type: "rss",
        category: "Vendor Intelligence",
        enabled: true,
        updateFrequency: 180, // 3 hours
        status: "active",
      },
      {
        id: "sans-isc",
        name: "SANS ISC",
        url: "https://isc.sans.edu/rssfeed.xml",
        type: "rss",
        category: "Community Intelligence",
        enabled: true,
        updateFrequency: 60, // 1 hour
        status: "active",
      },
    ]
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Real-time service is already running")
      return
    }

    console.log("Starting real-time threat intelligence service...")
    this.isRunning = true

    // Initialize database with feed configurations
    await this.initializeFeedStatuses()

    // Start processing each enabled feed
    for (const feed of this.feeds.filter((f) => f.enabled)) {
      await this.startFeedProcessing(feed)
    }

    console.log("Real-time threat intelligence service started")
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log("Stopping real-time threat intelligence service...")
    this.isRunning = false

    // Clear all intervals
    for (const [feedId, interval] of this.intervals) {
      clearInterval(interval)
      this.intervals.delete(feedId)
    }

    console.log("Real-time threat intelligence service stopped")
  }

  subscribe(callback: (data: ThreatIntelRecord[]) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private async initializeFeedStatuses(): Promise<void> {
    for (const feed of this.feeds) {
      const feedStatus: FeedStatus = {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        type: feed.type,
        category: feed.category,
        enabled: feed.enabled,
        last_fetch: null,
        status: feed.status,
        update_frequency: feed.updateFrequency,
        error_count: 0,
        last_error: null,
      }

      await threatIntelDB.updateFeedStatus(feedStatus)
    }
  }

  private async startFeedProcessing(feed: FeedConfiguration): Promise<void> {
    // Process immediately
    await this.processFeed(feed)

    // Set up recurring processing
    const interval = setInterval(
      async () => {
        if (this.isRunning && feed.enabled) {
          await this.processFeed(feed)
        }
      },
      feed.updateFrequency * 60 * 1000,
    ) // Convert minutes to milliseconds

    this.intervals.set(feed.id, interval)
  }

  private async processFeed(feed: FeedConfiguration): Promise<void> {
    console.log(`Processing feed: ${feed.name}`)

    try {
      let threatData: ThreatIntelRecord[] = []

      switch (feed.type) {
        case "nist":
          threatData = await this.nistClient.fetchRecentCVEs(50)
          break
        case "cisa":
          if (feed.id === "cisa-kev") {
            threatData = await this.cisaClient.fetchKEVCatalog()
          } else {
            threatData = await this.cisaClient.fetchAlerts()
          }
          break
        case "rss":
          threatData = await this.rssClient.fetchRSSFeed(feed.url, feed.name)
          break
      }

      // Store in database
      for (const threat of threatData) {
        try {
          await threatIntelDB.insertThreatIntel(threat)
        } catch (error) {
          console.error(`Error storing threat intel for ${feed.name}:`, error)
        }
      }

      // Update feed status
      await this.updateFeedStatus(feed.id, "active", null)

      // Notify subscribers
      if (threatData.length > 0) {
        this.notifySubscribers(threatData)
      }

      console.log(`Successfully processed ${threatData.length} items from ${feed.name}`)
    } catch (error) {
      console.error(`Error processing feed ${feed.name}:`, error)
      await this.updateFeedStatus(feed.id, "error", error.message)
    }
  }

  private async updateFeedStatus(
    feedId: string,
    status: "active" | "error" | "disabled",
    errorMessage: string | null,
  ): Promise<void> {
    try {
      const feedStatuses = await threatIntelDB.getFeedStatuses()
      const existingStatus = feedStatuses.find((fs) => fs.id === feedId)

      if (existingStatus) {
        const updatedStatus: FeedStatus = {
          ...existingStatus,
          status,
          last_fetch: new Date().toISOString(),
          error_count: status === "error" ? existingStatus.error_count + 1 : 0,
          last_error: errorMessage,
        }

        await threatIntelDB.updateFeedStatus(updatedStatus)
      }
    } catch (error) {
      console.error(`Error updating feed status for ${feedId}:`, error)
    }
  }

  private notifySubscribers(data: ThreatIntelRecord[]): void {
    for (const callback of this.subscribers) {
      try {
        callback(data)
      } catch (error) {
        console.error("Error notifying subscriber:", error)
      }
    }
  }

  async getRecentThreats(hours = 24): Promise<ThreatIntelRecord[]> {
    return threatIntelDB.getRecentThreats(hours)
  }

  async searchThreats(searchTerm: string): Promise<ThreatIntelRecord[]> {
    return threatIntelDB.searchThreats(searchTerm)
  }

  async getThreatsBySeverity(severity: string): Promise<ThreatIntelRecord[]> {
    return threatIntelDB.getThreatsBySeverity(severity)
  }

  async getThreatsBySector(sector: string): Promise<ThreatIntelRecord[]> {
    return threatIntelDB.getThreatsBySector(sector)
  }

  async getFeedStatuses(): Promise<FeedStatus[]> {
    return threatIntelDB.getFeedStatuses()
  }

  async enableFeed(feedId: string): Promise<void> {
    const feed = this.feeds.find((f) => f.id === feedId)
    if (feed) {
      feed.enabled = true
      await this.updateFeedStatus(feedId, "active", null)

      if (this.isRunning) {
        await this.startFeedProcessing(feed)
      }
    }
  }

  async disableFeed(feedId: string): Promise<void> {
    const feed = this.feeds.find((f) => f.id === feedId)
    if (feed) {
      feed.enabled = false
      await this.updateFeedStatus(feedId, "disabled", null)

      const interval = this.intervals.get(feedId)
      if (interval) {
        clearInterval(interval)
        this.intervals.delete(feedId)
      }
    }
  }
}

// Global service instance
let globalThreatIntelService: RealTimeThreatIntelService | null = null

export function getThreatIntelService(): RealTimeThreatIntelService {
  if (!globalThreatIntelService) {
    const config: APIConfig = {
      nistApiKey: process.env.NIST_API_KEY,
      cisaFeedUrl: "https://www.cisa.gov/sites/default/files/feeds/alerts.xml",
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    }

    globalThreatIntelService = new RealTimeThreatIntelService(config)
  }

  return globalThreatIntelService
}
