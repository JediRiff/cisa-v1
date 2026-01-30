"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Database,
  Globe,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import {
  getAllRealThreatIntel,
  getRecentThreatIntel,
  getTrendingThreats,
  type RealThreatIntel,
} from "@/lib/real-ti-data"
import { TIFeedAggregator, realTIFeeds, type FeedSource } from "@/lib/ti-feed-parser"

export function TiFeeds() {
  const [threatIntel, setThreatIntel] = useState<RealThreatIntel[]>([])
  const [filteredIntel, setFilteredIntel] = useState<RealThreatIntel[]>([])
  const [feeds, setFeeds] = useState<FeedSource[]>(realTIFeeds)
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [aggregator] = useState(new TIFeedAggregator(realTIFeeds))

  // Load initial data
  useEffect(() => {
    const initialData = getAllRealThreatIntel()
    setThreatIntel(initialData)
    setFilteredIntel(initialData)
  }, [])

  // Auto-refresh feeds every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      async () => {
        await fetchLatestIntel()
      },
      5 * 60 * 1000,
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  // Filter threat intelligence
  useEffect(() => {
    let filtered = threatIntel

    if (searchTerm) {
      filtered = filtered.filter(
        (intel) =>
          intel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          intel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          intel.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((intel) => intel.severity === severityFilter)
    }

    if (sectorFilter !== "all") {
      filtered = filtered.filter(
        (intel) => intel.sectors.includes(sectorFilter) || intel.sectors.includes("All Sectors"),
      )
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((intel) => intel.source === sourceFilter)
    }

    setFilteredIntel(filtered)
  }, [threatIntel, searchTerm, severityFilter, sectorFilter, sourceFilter])

  const fetchLatestIntel = async () => {
    setIsLoading(true)
    try {
      // Combine static data with live feed data
      const staticData = getAllRealThreatIntel()
      const liveData = await aggregator.fetchAllFeeds()
      const combinedData = [...liveData, ...staticData]
        .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
        .slice(0, 100) // Limit to most recent 100 items

      setThreatIntel(combinedData)
      setFeeds(aggregator.getFeedStatus())
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error fetching threat intelligence:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFeed = (feedName: string, enabled: boolean) => {
    if (enabled) {
      aggregator.enableFeed(feedName)
    } else {
      aggregator.disableFeed(feedName)
    }
    setFeeds(aggregator.getFeedStatus())
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-500"
      case "High":
        return "bg-orange-500"
      case "Medium":
        return "bg-yellow-500"
      case "Low":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <AlertTriangle className="h-4 w-4" />
      case "High":
        return <AlertCircle className="h-4 w-4" />
      case "Medium":
        return <Eye className="h-4 w-4" />
      case "Low":
        return <Shield className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getFeedStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "disabled":
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getUniqueValues = (key: keyof RealThreatIntel) => {
    const values = new Set<string>()
    threatIntel.forEach((intel) => {
      if (key === "sectors") {
        ;(intel[key] as string[]).forEach((sector) => values.add(sector))
      } else {
        values.add(intel[key] as string)
      }
    })
    return Array.from(values).sort()
  }

  const getStatistics = () => {
    const total = threatIntel.length
    const critical = threatIntel.filter((i) => i.severity === "Critical").length
    const high = threatIntel.filter((i) => i.severity === "High").length
    const recent = getRecentThreatIntel(7).length
    const activeSources = feeds.filter((f) => f.enabled && f.status === "active").length

    return { total, critical, high, recent, activeSources }
  }

  const stats = getStatistics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Threat Intelligence Feeds</h2>
          <p className="text-muted-foreground">
            Real-time threat intelligence from leading security vendors and researchers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button onClick={fetchLatestIntel} disabled={isLoading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Intelligence</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active threat reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <p className="text-xs text-muted-foreground">High severity threats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent (7 days)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recent}</div>
            <p className="text-xs text-muted-foreground">New this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <Globe className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSources}</div>
            <p className="text-xs text-muted-foreground">Live intelligence feeds</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="intelligence" className="space-y-4">
        <TabsList>
          <TabsTrigger value="intelligence">Threat Intelligence</TabsTrigger>
          <TabsTrigger value="feeds">Feed Management</TabsTrigger>
          <TabsTrigger value="trending">Trending Threats</TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search threats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {getUniqueValues("sectors").map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {getUniqueValues("source").map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSeverityFilter("all")
                    setSectorFilter("all")
                    setSourceFilter("all")
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Threat Intelligence List */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredIntel.map((intel) => (
                <Card key={intel.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(intel.severity)}
                          <CardTitle className="text-lg">{intel.title}</CardTitle>
                          <Badge className={`${getSeverityColor(intel.severity)} text-white`}>{intel.severity}</Badge>
                        </div>
                        <CardDescription className="text-sm">{intel.description}</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={intel.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(intel.published).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Globe className="h-4 w-4" />
                          <span>{intel.source}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          TLP:{intel.tlp}
                        </Badge>
                      </div>

                      {/* Sectors */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Affected Sectors:</h4>
                        <div className="flex flex-wrap gap-1">
                          {intel.sectors.map((sector) => (
                            <Badge key={sector} variant="secondary" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Indicators */}
                      {intel.indicators.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Indicators of Compromise:</h4>
                          <div className="space-y-1">
                            {intel.indicators.slice(0, 3).map((indicator, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {indicator.type.toUpperCase()}
                                  </Badge>
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{indicator.value}</code>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-muted-foreground">
                                    {indicator.confidence}% confidence
                                  </span>
                                  <Progress value={indicator.confidence} className="w-16 h-2" />
                                </div>
                              </div>
                            ))}
                            {intel.indicators.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{intel.indicators.length - 3} more indicators
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* MITRE Techniques */}
                      {intel.mitreTechniques.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">MITRE ATT&CK Techniques:</h4>
                          <div className="flex flex-wrap gap-1">
                            {intel.mitreTechniques.map((technique) => (
                              <Badge key={technique} variant="outline" className="text-xs">
                                {technique}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Tags:</h4>
                        <div className="flex flex-wrap gap-1">
                          {intel.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="feeds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feed Sources Management</CardTitle>
              <CardDescription>Configure and monitor threat intelligence feed sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeds.map((feed) => (
                  <div key={feed.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getFeedStatusIcon(feed.status)}
                      <div>
                        <h4 className="font-medium">{feed.name}</h4>
                        <p className="text-sm text-muted-foreground">{feed.category}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {feed.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updates every {feed.updateFrequency} minutes
                          </span>
                          {feed.lastFetch && (
                            <span className="text-xs text-muted-foreground">
                              Last: {new Date(feed.lastFetch).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch checked={feed.enabled} onCheckedChange={(enabled) => toggleFeed(feed.name, enabled)} />
                      <Button variant="ghost" size="sm" asChild>
                        <a href={feed.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trending Threats</CardTitle>
              <CardDescription>
                Most critical and recent threat intelligence requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getTrendingThreats().map((intel, index) => (
                  <div key={intel.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(intel.severity)}
                        <h4 className="font-medium">{intel.title}</h4>
                        <Badge className={`${getSeverityColor(intel.severity)} text-white`}>{intel.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{intel.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{intel.source}</span>
                        <span>{new Date(intel.published).toLocaleDateString()}</span>
                        <div className="flex space-x-1">
                          {intel.sectors.slice(0, 2).map((sector) => (
                            <Badge key={sector} variant="outline" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={intel.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
