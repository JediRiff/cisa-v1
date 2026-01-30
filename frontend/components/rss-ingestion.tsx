"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Rss, RefreshCw, CheckCircle, AlertTriangle, Clock, ExternalLink, Settings, Play, Pause } from "lucide-react"
import type { Alert as AlertType } from "@/types/alert"

interface RssIngestionProps {
  onAlertIngested: (alert: AlertType) => void
}

interface RssFeed {
  id: string
  name: string
  url: string
  status: "active" | "paused" | "error"
  lastUpdate: string
  itemsIngested: number
  description: string
}

export function RssIngestion({ onAlertIngested }: RssIngestionProps) {
  const [feeds, setFeeds] = useState<RssFeed[]>([
    {
      id: "cisa-alerts",
      name: "CISA Cybersecurity Alerts",
      url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
      status: "active",
      lastUpdate: "2024-01-15T10:30:00Z",
      itemsIngested: 247,
      description: "Official CISA cybersecurity advisories and alerts",
    },
    {
      id: "us-cert",
      name: "US-CERT Alerts",
      url: "https://www.cisa.gov/uscert/ncas/alerts.xml",
      status: "active",
      lastUpdate: "2024-01-15T10:25:00Z",
      itemsIngested: 189,
      description: "US-CERT National Cyber Alert System",
    },
    {
      id: "ics-cert",
      name: "ICS-CERT Advisories",
      url: "https://www.cisa.gov/uscert/ics/advisories.xml",
      status: "active",
      lastUpdate: "2024-01-15T10:20:00Z",
      itemsIngested: 156,
      description: "Industrial Control Systems advisories",
    },
    {
      id: "nist-nvd",
      name: "NIST NVD Recent CVEs",
      url: "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml",
      status: "active",
      lastUpdate: "2024-01-15T10:15:00Z",
      itemsIngested: 423,
      description: "National Vulnerability Database recent CVEs",
    },
    {
      id: "cve-recent",
      name: "CVE Recent Entries",
      url: "https://cve.mitre.org/data/downloads/allitems-cvrf.xml",
      status: "paused",
      lastUpdate: "2024-01-15T09:45:00Z",
      itemsIngested: 89,
      description: "MITRE CVE recent vulnerability entries",
    },
  ])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [fetchedAlerts, setFetchedAlerts] = useState<AlertType[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const fetchRssFeeds = async () => {
    setLoading(true)
    setStatus({ type: null, message: "" })

    try {
      // In a real application, this would be a server-side fetch.
      // For this demo, we simulate the fetch with up-to-date mock data.
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockAlerts: AlertType[] = [
        {
          id: "aa25-210a",
          title: "CISA Adds One Known Exploited Vulnerability to Catalog",
          date: "2025-07-28T14:00:00Z",
          posture: "Shields Ready",
          sector: "Government",
          urgency: "Medium",
          kev: true,
          exploitation: true,
          criticalInfrastructure: false,
          summary:
            "CISA has added one new vulnerability to its Known Exploited Vulnerabilities (KEV) Catalog, based on evidence of active exploitation. This type of vulnerability is a frequent attack vector for malicious cyber actors and poses a significant risk to the federal enterprise.",
          url: "https://www.cisa.gov/news-events/alerts/2025/07/28/cisa-adds-one-known-exploited-vulnerability-catalog",
        },
        {
          id: "aa25-205b",
          title: "Threat Actors Exploiting Ivanti EPMM Vulnerabilities",
          date: "2025-07-24T11:30:00Z",
          posture: "Shields Up",
          sector: "Technology",
          urgency: "High",
          kev: true,
          exploitation: true,
          criticalInfrastructure: true,
          summary:
            "CISA and international partners are releasing this joint Cybersecurity Advisory (CSA) to provide information on threat actors exploiting vulnerabilities in Ivanti Endpoint Manager Mobile (EPMM), formerly MobileIron Core.",
          url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa25-205b",
        },
        {
          id: "aa25-187a",
          title: "Russian State-Sponsored Cyber Threats to U.S. Critical Infrastructure",
          date: "2025-07-09T09:00:00Z",
          posture: "Shields Up",
          sector: "Energy",
          urgency: "High",
          kev: false,
          exploitation: true,
          criticalInfrastructure: true,
          summary:
            "CISA, NSA, and FBI released a joint advisory to provide an overview of Russian state-sponsored cyber operations, including common tactics, techniques, and procedures (TTPs) used to target U.S. critical infrastructure.",
          url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa25-187a",
        },
      ]

      setFetchedAlerts(mockAlerts)
      setStatus({
        type: "success",
        message: `Successfully fetched ${mockAlerts.length} alerts from CISA RSS feeds.`,
      })

      // Add these alerts to the main application state
      mockAlerts.forEach((alert) => onAlertIngested(alert))
    } catch (error) {
      setStatus({
        type: "error",
        message: `Failed to fetch RSS feeds: ${(error as Error).message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  // Simulate RSS feed updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new items from active feeds
      const activeFeeds = feeds.filter((feed) => feed.status === "active")
      if (activeFeeds.length > 0 && Math.random() > 0.6) {
        const randomFeed = activeFeeds[Math.floor(Math.random() * activeFeeds.length)]

        // Create a simulated alert from RSS feed
        const sectors = ["Energy", "Healthcare", "Finance", "Transportation", "Water"]
        const urgencies = ["Low", "Medium", "High", "Critical"]

        const newAlert: AlertType = {
          id: `rss-${randomFeed.id}-${Date.now()}`,
          title: `${randomFeed.name} - New Advisory`,
          date: new Date().toISOString(),
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          urgency: urgencies[Math.floor(Math.random() * urgencies.length)] as any,
          posture: Math.random() > 0.5 ? "Elevated" : "Guarded",
          kev: Math.random() > 0.8,
          exploitation: Math.random() > 0.9,
          criticalInfrastructure: Math.random() > 0.7,
          source: randomFeed.name,
          description: `Automated ingestion from ${randomFeed.name} RSS feed`,
        }

        onAlertIngested(newAlert)

        // Update feed stats
        setFeeds((prev) =>
          prev.map((feed) =>
            feed.id === randomFeed.id
              ? {
                  ...feed,
                  itemsIngested: feed.itemsIngested + 1,
                  lastUpdate: new Date().toISOString(),
                }
              : feed,
          ),
        )
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [feeds, onAlertIngested])

  const handleRefreshAll = async () => {
    setIsRefreshing(true)

    // Simulate refresh process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setLastRefresh(new Date())
    setIsRefreshing(false)
  }

  const toggleFeedStatus = (feedId: string) => {
    setFeeds((prev) =>
      prev.map((feed) =>
        feed.id === feedId
          ? {
              ...feed,
              status: feed.status === "active" ? "paused" : "active",
            }
          : feed,
      ),
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50"
      case "paused":
        return "text-yellow-600 bg-yellow-50"
      case "error":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-600" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5" />
            RSS Feed Ingestion
          </CardTitle>
          <CardDescription>
            Automated ingestion from cybersecurity RSS feeds and threat intelligence sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">Active Feeds:</span>{" "}
                <span className="text-green-600">{feeds.filter((f) => f.status === "active").length}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Total Items:</span>{" "}
                <span className="text-blue-600">{feeds.reduce((sum, f) => sum + f.itemsIngested, 0)}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Last Refresh:</span>{" "}
                <span className="text-gray-600">{lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
            <Button onClick={fetchRssFeeds} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Fetching..." : "Fetch Alerts"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {fetchedAlerts.length > 0 ? (
        <div className="space-y-4">
          {fetchedAlerts.map((alert) => (
            <div key={alert.id} className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <h4 className="font-medium pr-4">{alert.title}</h4>
                <Badge
                  className={
                    alert.urgency === "High"
                      ? "bg-[#d92525] text-white shrink-0"
                      : alert.urgency === "Medium"
                        ? "bg-amber-500 text-white shrink-0"
                        : "bg-green-600 text-white shrink-0"
                  }
                >
                  {alert.urgency}
                </Badge>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {new Date(alert.date).toLocaleDateString()} - {alert.sector}
              </div>
              {alert.summary && <p className="text-sm mt-2">{alert.summary}</p>}
              <div className="flex flex-wrap gap-2 mt-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {alert.posture === "Shields Up" && (
                    <Badge variant="outline" className="border-[#005288] text-[#005288]">
                      Shields Up
                    </Badge>
                  )}
                  {alert.kev && (
                    <Badge variant="outline" className="border-[#d92525] text-[#d92525]">
                      KEV
                    </Badge>
                  )}
                  {alert.exploitation && (
                    <Badge variant="outline" className="border-purple-600 text-purple-600">
                      Active Exploitation
                    </Badge>
                  )}
                </div>
                {alert.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(alert.url, "_blank")}
                    className="bg-[#005288] text-white hover:bg-[#003e66] hover:text-white"
                  >
                    View Full Report
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No alerts fetched yet. Click the button above to fetch alerts.
        </div>
      )}

      {/* Feed List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {feeds.map((feed) => (
          <Card key={feed.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rss className="h-4 w-4" />
                  <span className="text-sm">{feed.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(feed.status)}
                  <Badge className={getStatusColor(feed.status)}>{feed.status}</Badge>
                </div>
              </CardTitle>
              <CardDescription>{feed.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Feed URL */}
                <div className="text-xs">
                  <span className="font-medium">URL:</span>
                  <div className="font-mono bg-gray-50 p-2 rounded mt-1 break-all">{feed.url}</div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Items Ingested:</span>
                    <span className="font-medium ml-2">{feed.itemsIngested}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Update:</span>
                    <span className="font-medium ml-2">{new Date(feed.lastUpdate).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleFeedStatus(feed.id)}>
                    {feed.status === "active" ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    {feed.status === "active" ? "Pause" : "Resume"}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(feed.url, "_blank")}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Feed
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          RSS feeds are automatically monitored every 10 seconds for new cybersecurity alerts and advisories. All
          ingested items are processed through the CAPRI scoring algorithm for threat prioritization.
        </AlertDescription>
      </Alert>
    </div>
  )
}
