// Real API clients for threat intelligence sources
import { XMLParser } from "fast-xml-parser"
import type { ThreatIntelRecord } from "./database"

export interface APIConfig {
  nistApiKey?: string
  cisaFeedUrl: string
  maxRetries: number
  retryDelay: number
  timeout: number
}

export class NISTClient {
  private apiKey?: string
  private baseUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0"
  private maxRetries: number
  private retryDelay: number
  private timeout: number

  constructor(config: APIConfig) {
    this.apiKey = config.nistApiKey
    this.maxRetries = config.maxRetries
    this.retryDelay = config.retryDelay
    this.timeout = config.timeout
  }

  async fetchRecentCVEs(resultsPerPage = 50, startIndex = 0): Promise<ThreatIntelRecord[]> {
    const url = `${this.baseUrl}?resultsPerPage=${resultsPerPage}&startIndex=${startIndex}`

    try {
      const response = await this.makeRequest(url)
      const data = await response.json()

      if (!data.vulnerabilities) {
        console.warn("No vulnerabilities found in NIST response")
        return []
      }

      return data.vulnerabilities.map((vuln: any) => this.transformNISTVulnerability(vuln))
    } catch (error) {
      console.error("Error fetching NIST CVEs:", error)
      throw error
    }
  }

  async fetchCVEsByDateRange(startDate: Date, endDate: Date): Promise<ThreatIntelRecord[]> {
    const pubStartDate = startDate.toISOString().split("T")[0]
    const pubEndDate = endDate.toISOString().split("T")[0]
    const url = `${this.baseUrl}?pubStartDate=${pubStartDate}&pubEndDate=${pubEndDate}`

    try {
      const response = await this.makeRequest(url)
      const data = await response.json()

      return data.vulnerabilities?.map((vuln: any) => this.transformNISTVulnerability(vuln)) || []
    } catch (error) {
      console.error("Error fetching CVEs by date range:", error)
      throw error
    }
  }

  private async makeRequest(url: string, attempt = 1): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "CISA-CAPRI-ThreatIntel/1.0",
    }

    if (this.apiKey) {
      headers["apiKey"] = this.apiKey
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429 && attempt <= this.maxRetries) {
          // Rate limited, wait and retry
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt))
          return this.makeRequest(url, attempt + 1)
        }
        throw new Error(`NIST API error: ${response.status} ${response.statusText}`)
      }

      return response
    } catch (error) {
      if (attempt <= this.maxRetries && error.name !== "AbortError") {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt))
        return this.makeRequest(url, attempt + 1)
      }
      throw error
    }
  }

  private transformNISTVulnerability(vuln: any): ThreatIntelRecord {
    const cve = vuln.cve
    const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0]
    const severity = metrics?.cvssData?.baseSeverity || "Medium"

    return {
      id: cve.id,
      title: `${cve.id}: ${cve.descriptions?.[0]?.value?.substring(0, 100) || "CVE Vulnerability"}`,
      description: cve.descriptions?.[0]?.value || "No description available",
      severity: this.mapCVSSSeverity(severity),
      published: cve.published,
      updated: cve.lastModified,
      source: "NIST NVD",
      source_url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
      sectors: ["All Sectors"],
      indicators: [
        {
          type: "cve",
          value: cve.id,
          confidence: 100,
        },
      ],
      mitre_techniques: this.extractMITRETechniques(cve),
      tags: this.extractTags(cve),
      tlp: "WHITE",
      raw_data: vuln,
    }
  }

  private mapCVSSSeverity(cvssString: string): "Critical" | "High" | "Medium" | "Low" {
    switch (cvssString?.toUpperCase()) {
      case "CRITICAL":
        return "Critical"
      case "HIGH":
        return "High"
      case "MEDIUM":
        return "Medium"
      case "LOW":
        return "Low"
      default:
        return "Medium"
    }
  }

  private extractMITRETechniques(cve: any): string[] {
    // Extract MITRE techniques from CVE data
    const techniques: string[] = []
    const description = cve.descriptions?.[0]?.value?.toLowerCase() || ""

    // Simple pattern matching for common techniques
    if (description.includes("remote code execution") || description.includes("rce")) {
      techniques.push("T1190")
    }
    if (description.includes("privilege escalation")) {
      techniques.push("T1068")
    }
    if (description.includes("buffer overflow")) {
      techniques.push("T1055")
    }

    return techniques
  }

  private extractTags(cve: any): string[] {
    const tags: string[] = []
    const description = cve.descriptions?.[0]?.value?.toLowerCase() || ""

    // Extract vendor/product information
    if (cve.configurations?.nodes) {
      cve.configurations.nodes.forEach((node: any) => {
        node.cpeMatch?.forEach((match: any) => {
          const cpe = match.criteria
          if (cpe.includes("microsoft")) tags.push("Microsoft")
          if (cpe.includes("apache")) tags.push("Apache")
          if (cpe.includes("linux")) tags.push("Linux")
          if (cpe.includes("windows")) tags.push("Windows")
        })
      })
    }

    return [...new Set(tags)]
  }
}

export class CISAClient {
  private feedUrl: string
  private maxRetries: number
  private retryDelay: number
  private timeout: number
  private xmlParser: XMLParser

  constructor(config: APIConfig) {
    this.feedUrl = config.cisaFeedUrl
    this.maxRetries = config.maxRetries
    this.retryDelay = config.retryDelay
    this.timeout = config.timeout
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    })
  }

  async fetchAlerts(): Promise<ThreatIntelRecord[]> {
    try {
      const response = await this.makeRequest(this.feedUrl)
      const xmlText = await response.text()
      const parsed = this.xmlParser.parse(xmlText)

      const items = parsed.rss?.channel?.item || []
      const itemsArray = Array.isArray(items) ? items : [items]

      return itemsArray.map((item: any) => this.transformCISAAlert(item))
    } catch (error) {
      console.error("Error fetching CISA alerts:", error)
      throw error
    }
  }

  async fetchKEVCatalog(): Promise<ThreatIntelRecord[]> {
    const kevUrl = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

    try {
      const response = await this.makeRequest(kevUrl)
      const data = await response.json()

      return data.vulnerabilities?.map((vuln: any) => this.transformKEVEntry(vuln)) || []
    } catch (error) {
      console.error("Error fetching CISA KEV catalog:", error)
      throw error
    }
  }

  private async makeRequest(url: string, attempt = 1): Promise<Response> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        headers: {
          "User-Agent": "CISA-CAPRI-ThreatIntel/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (attempt <= this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt))
          return this.makeRequest(url, attempt + 1)
        }
        throw new Error(`CISA API error: ${response.status} ${response.statusText}`)
      }

      return response
    } catch (error) {
      if (attempt <= this.maxRetries && error.name !== "AbortError") {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt))
        return this.makeRequest(url, attempt + 1)
      }
      throw error
    }
  }

  private transformCISAAlert(item: any): ThreatIntelRecord {
    return {
      id: `cisa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title || "CISA Alert",
      description: item.description || item.summary || "No description available",
      severity: this.determineSeverity(item.title, item.description),
      published: item.pubDate || new Date().toISOString(),
      updated: item.pubDate || new Date().toISOString(),
      source: "CISA",
      source_url: item.link || "https://www.cisa.gov",
      sectors: this.extractSectors(item.title, item.description),
      indicators: [],
      mitre_techniques: [],
      tags: ["CISA", "Government Alert"],
      tlp: "WHITE",
      raw_data: item,
    }
  }

  private transformKEVEntry(vuln: any): ThreatIntelRecord {
    return {
      id: `kev-${vuln.cveID}`,
      title: `KEV: ${vuln.cveID} - ${vuln.vulnerabilityName}`,
      description: vuln.shortDescription || "Known Exploited Vulnerability",
      severity: "High", // KEV entries are inherently high priority
      published: vuln.dateAdded,
      updated: vuln.dateAdded,
      source: "CISA KEV",
      source_url: `https://nvd.nist.gov/vuln/detail/${vuln.cveID}`,
      sectors: ["All Sectors"],
      indicators: [
        {
          type: "cve",
          value: vuln.cveID,
          confidence: 100,
        },
      ],
      mitre_techniques: [],
      tags: ["KEV", "Known Exploited", vuln.vendorProject, vuln.product].filter(Boolean),
      tlp: "WHITE",
      raw_data: vuln,
    }
  }

  private determineSeverity(title: string, description: string): "Critical" | "High" | "Medium" | "Low" {
    const text = `${title} ${description}`.toLowerCase()

    if (text.includes("critical") || text.includes("emergency") || text.includes("urgent")) {
      return "Critical"
    }
    if (text.includes("high") || text.includes("important") || text.includes("severe")) {
      return "High"
    }
    if (text.includes("medium") || text.includes("moderate")) {
      return "Medium"
    }
    return "Medium" // Default for CISA alerts
  }

  private extractSectors(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase()
    const sectors: string[] = []

    if (text.includes("energy") || text.includes("power") || text.includes("electric")) {
      sectors.push("Energy")
    }
    if (text.includes("healthcare") || text.includes("hospital") || text.includes("medical")) {
      sectors.push("Healthcare")
    }
    if (text.includes("finance") || text.includes("bank") || text.includes("financial")) {
      sectors.push("Finance")
    }
    if (text.includes("water") || text.includes("wastewater")) {
      sectors.push("Water")
    }
    if (text.includes("transportation") || text.includes("aviation") || text.includes("maritime")) {
      sectors.push("Transportation")
    }
    if (text.includes("government") || text.includes("federal") || text.includes("state")) {
      sectors.push("Government")
    }

    return sectors.length > 0 ? sectors : ["All Sectors"]
  }
}

export class RSSFeedClient {
  private maxRetries: number
  private retryDelay: number
  private timeout: number
  private xmlParser: XMLParser

  constructor(config: APIConfig) {
    this.maxRetries = config.maxRetries
    this.retryDelay = config.retryDelay
    this.timeout = config.timeout
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    })
  }

  async fetchRSSFeed(url: string, source: string): Promise<ThreatIntelRecord[]> {
    try {
      const response = await this.makeRequest(url)
      const xmlText = await response.text()
      const parsed = this.xmlParser.parse(xmlText)

      const items = parsed.rss?.channel?.item || parsed.feed?.entry || []
      const itemsArray = Array.isArray(items) ? items : [items]

      return itemsArray.map((item: any) => this.transformRSSItem(item, source, url))
    } catch (error) {
      console.error(`Error fetching RSS feed ${url}:`, error)
      throw error
    }
  }

  private async makeRequest(url: string, attempt = 1): Promise<Response> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        headers: {
          "User-Agent": "CISA-CAPRI-ThreatIntel/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (attempt <= this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt))
          return this.makeRequest(url, attempt + 1)
        }
        throw new Error(`RSS feed error: ${response.status} ${response.statusText}`)
      }

      return response
    } catch (error) {
      if (attempt <= this.maxRetries && error.name !== "AbortError") {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt))
        return this.makeRequest(url, attempt + 1)
      }
      throw error
    }
  }

  private transformRSSItem(item: any, source: string, sourceUrl: string): ThreatIntelRecord {
    const title = item.title || item.title?.["#text"] || "RSS Feed Item"
    const description = item.description || item.summary || item.content || "No description available"
    const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString()
    const link = item.link || item.link?.["@_href"] || sourceUrl

    return {
      id: `rss-${source.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: typeof title === "string" ? title : title?.["#text"] || "RSS Feed Item",
      description: typeof description === "string" ? description : description?.["#text"] || "No description available",
      severity: this.determineSeverity(title, description),
      published: pubDate,
      updated: pubDate,
      source,
      source_url: typeof link === "string" ? link : link?.["@_href"] || sourceUrl,
      sectors: this.extractSectors(title, description),
      indicators: [],
      mitre_techniques: [],
      tags: [source, "RSS Feed"],
      tlp: "WHITE",
      raw_data: item,
    }
  }

  private determineSeverity(title: any, description: any): "Critical" | "High" | "Medium" | "Low" {
    const text = `${title} ${description}`.toLowerCase()

    if (text.includes("critical") || text.includes("zero-day") || text.includes("rce")) {
      return "Critical"
    }
    if (text.includes("high") || text.includes("exploit") || text.includes("vulnerability")) {
      return "High"
    }
    if (text.includes("medium") || text.includes("security")) {
      return "Medium"
    }
    return "Low"
  }

  private extractSectors(title: any, description: any): string[] {
    // Similar sector extraction logic as CISA client
    return ["All Sectors"] // Simplified for RSS feeds
  }
}
