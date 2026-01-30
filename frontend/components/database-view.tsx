"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Database,
  Shield,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Filter,
  Hash,
  Globe,
  Mail,
  FileText,
  Activity,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { getAllRealThreatIntel } from "@/lib/real-ti-data"

interface DatabaseRecord {
  id: string
  type: "vulnerability" | "ioc" | "threat_intel" | "alert"
  title: string
  description: string
  severity: "Critical" | "High" | "Medium" | "Low"
  source: string
  timestamp: string
  indicators?: {
    type: string
    value: string
    confidence: number
  }[]
  sectors: string[]
  tags: string[]
  mitreTechniques?: string[]
  tlp?: string
}

export function DatabaseView() {
  const [records, setRecords] = useState<DatabaseRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<DatabaseRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Load and transform threat intelligence data into database records
  useEffect(() => {
    const threatIntel = getAllRealThreatIntel()
    const transformedRecords: DatabaseRecord[] = threatIntel.map((intel) => ({
      id: intel.id,
      type: intel.id.startsWith("CVE-")
        ? "vulnerability"
        : intel.id.startsWith("KEV-")
          ? "vulnerability"
          : intel.id.startsWith("APT-") || intel.id.startsWith("RANSOM-") || intel.id.startsWith("SUPPLY-")
            ? "threat_intel"
            : "alert",
      title: intel.title,
      description: intel.description,
      severity: intel.severity,
      source: intel.source,
      timestamp: intel.published,
      indicators: intel.indicators,
      sectors: intel.sectors,
      tags: intel.tags,
      mitreTechniques: intel.mitreTechniques,
      tlp: intel.tlp,
    }))

    // Add some sample IOC records
    const iocRecords: DatabaseRecord[] = [
      {
        id: "ioc-001",
        type: "ioc",
        title: "Malicious Domain - ransomhub-support.onion",
        description: "Domain associated with RansomHub ransomware operations",
        severity: "High",
        source: "Internal Analysis",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        indicators: [{ type: "domain", value: "ransomhub-support.onion", confidence: 95 }],
        sectors: ["All Sectors"],
        tags: ["RansomHub", "Ransomware", "Dark Web"],
      },
      {
        id: "ioc-002",
        type: "ioc",
        title: "Suspicious IP Address - 185.159.158.241",
        description: "IP address linked to APT29 command and control infrastructure",
        severity: "Critical",
        source: "Threat Intelligence",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        indicators: [{ type: "ip", value: "185.159.158.241", confidence: 88 }],
        sectors: ["Government", "Technology"],
        tags: ["APT29", "C2", "Russia"],
      },
      {
        id: "ioc-003",
        type: "ioc",
        title: "Malware Hash - e5f6a7b8c9d0123456789012345678901234abcd",
        description: "SHA-1 hash of RansomHub ransomware payload",
        severity: "Critical",
        source: "Malware Analysis",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        indicators: [{ type: "hash", value: "e5f6a7b8c9d0123456789012345678901234abcd", confidence: 95 }],
        sectors: ["All Sectors"],
        tags: ["RansomHub", "Malware", "Encryption"],
      },
    ]

    const allRecords = [...transformedRecords, ...iocRecords]
    setRecords(allRecords)
    setFilteredRecords(allRecords)
  }, [])

  // Filter records
  useEffect(() => {
    let filtered = records

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
          record.indicators?.some((indicator) => indicator.value.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((record) => record.type === typeFilter)
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((record) => record.severity === severityFilter)
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((record) => record.source === sourceFilter)
    }

    setFilteredRecords(filtered)
  }, [records, searchTerm, typeFilter, severityFilter, sourceFilter])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "vulnerability":
        return <Shield className="h-4 w-4" />
      case "ioc":
        return <Hash className="h-4 w-4" />
      case "threat_intel":
        return <Activity className="h-4 w-4" />
      case "alert":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "vulnerability":
        return "bg-red-100 text-red-800"
      case "ioc":
        return "bg-orange-100 text-orange-800"
      case "threat_intel":
        return "bg-blue-100 text-blue-800"
      case "alert":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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

  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case "ip":
        return <Globe className="h-3 w-3" />
      case "domain":
        return <Globe className="h-3 w-3" />
      case "hash":
        return <Hash className="h-3 w-3" />
      case "email":
        return <Mail className="h-3 w-3" />
      case "cve":
        return <Shield className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const exportRecord = (record: DatabaseRecord) => {
    const dataStr = JSON.stringify(record, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `${record.type}_${record.id}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const getStatistics = () => {
    const total = records.length
    const vulnerabilities = records.filter((r) => r.type === "vulnerability").length
    const iocs = records.filter((r) => r.type === "ioc").length
    const threatIntel = records.filter((r) => r.type === "threat_intel").length
    const critical = records.filter((r) => r.severity === "Critical").length

    return { total, vulnerabilities, iocs, threatIntel, critical }
  }

  const stats = getStatistics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Database View</h2>
          <p className="text-muted-foreground">
            Comprehensive database of vulnerabilities, IOCs, and threat intelligence
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Database entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vulnerabilities}</div>
            <p className="text-xs text-muted-foreground">CVEs and security flaws</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IOCs</CardTitle>
            <Hash className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.iocs}</div>
            <p className="text-xs text-muted-foreground">Indicators of compromise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Intel</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.threatIntel}</div>
            <p className="text-xs text-muted-foreground">Intelligence reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">High priority items</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Database Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search & Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Record Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vulnerability">Vulnerabilities</SelectItem>
                    <SelectItem value="ioc">IOCs</SelectItem>
                    <SelectItem value="threat_intel">Threat Intel</SelectItem>
                    <SelectItem value="alert">Alerts</SelectItem>
                  </SelectContent>
                </Select>

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

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {Array.from(new Set(records.map((r) => r.source))).map((source) => (
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
                    setTypeFilter("all")
                    setSeverityFilter("all")
                    setSourceFilter("all")
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Database Records ({filteredRecords.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(record.type)}
                            <Badge className={getTypeColor(record.type)}>
                              {record.type.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium truncate">{record.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{record.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getSeverityColor(record.severity)} text-white`}>{record.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.source}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Dialog
                              open={isDialogOpen && selectedRecord?.id === record.id}
                              onOpenChange={(open) => {
                                setIsDialogOpen(open)
                                if (!open) setSelectedRecord(null)
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRecord(record)
                                    setIsDialogOpen(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center space-x-2">
                                    {getTypeIcon(record.type)}
                                    <span>{record.title}</span>
                                    <Badge className={`${getSeverityColor(record.severity)} text-white`}>
                                      {record.severity}
                                    </Badge>
                                  </DialogTitle>
                                  <DialogDescription>Detailed view of database record {record.id}</DialogDescription>
                                </DialogHeader>

                                {selectedRecord && (
                                  <div className="space-y-6">
                                    {/* Basic Information */}
                                    <div>
                                      <h4 className="font-medium mb-2">Description</h4>
                                      <p className="text-sm text-muted-foreground">{selectedRecord.description}</p>
                                    </div>

                                    {/* Metadata */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium mb-2">Source</h4>
                                        <p className="text-sm">{selectedRecord.source}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-2">Timestamp</h4>
                                        <p className="text-sm">{new Date(selectedRecord.timestamp).toLocaleString()}</p>
                                      </div>
                                    </div>

                                    {/* Indicators */}
                                    {selectedRecord.indicators && selectedRecord.indicators.length > 0 && (
                                      <div>
                                        <h4 className="font-medium mb-2">Indicators of Compromise</h4>
                                        <div className="space-y-2">
                                          {selectedRecord.indicators.map((indicator, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                              <div className="flex items-center space-x-3">
                                                {getIndicatorIcon(indicator.type)}
                                                <div>
                                                  <Badge variant="outline" className="text-xs mb-1">
                                                    {indicator.type.toUpperCase()}
                                                  </Badge>
                                                  <p className="text-sm font-mono">{indicator.value}</p>
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-muted-foreground">
                                                  {indicator.confidence}% confidence
                                                </span>
                                                <Progress value={indicator.confidence} className="w-20 h-2" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* MITRE Techniques */}
                                    {selectedRecord.mitreTechniques && selectedRecord.mitreTechniques.length > 0 && (
                                      <div>
                                        <h4 className="font-medium mb-2">MITRE ATT&CK Techniques</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {selectedRecord.mitreTechniques.map((technique) => (
                                            <Badge key={technique} variant="outline">
                                              {technique}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Sectors */}
                                    <div>
                                      <h4 className="font-medium mb-2">Affected Sectors</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedRecord.sectors.map((sector) => (
                                          <Badge key={sector} variant="secondary">
                                            {sector}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                      <h4 className="font-medium mb-2">Tags</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedRecord.tags.map((tag) => (
                                          <Badge key={tag} variant="outline">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    {/* TLP Classification */}
                                    {selectedRecord.tlp && (
                                      <div>
                                        <h4 className="font-medium mb-2">Traffic Light Protocol</h4>
                                        <Badge variant="outline">TLP:{selectedRecord.tlp}</Badge>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button variant="ghost" size="sm" onClick={() => exportRecord(record)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Record Types Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: "vulnerability", count: stats.vulnerabilities, color: "bg-red-500" },
                    { type: "ioc", count: stats.iocs, color: "bg-orange-500" },
                    { type: "threat_intel", count: stats.threatIntel, color: "bg-blue-500" },
                  ].map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded ${item.color}`} />
                        <span className="capitalize">{item.type.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item.count}</span>
                        <Progress value={(item.count / stats.total) * 100} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Severity Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Critical", "High", "Medium", "Low"].map((severity) => {
                    const count = records.filter((r) => r.severity === severity).length
                    const color = getSeverityColor(severity)
                    return (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${color}`} />
                          <span>{severity}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{count}</span>
                          <Progress value={(count / stats.total) * 100} className="w-20 h-2" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
