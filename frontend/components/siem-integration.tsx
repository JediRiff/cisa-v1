"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Database,
  Settings,
  Zap,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Download,
  Play,
  RefreshCw,
  Code,
  Globe,
  Shield,
  Activity,
} from "lucide-react"
import type { Alert as AlertType } from "@/types/alert"

interface SiemIntegrationProps {
  alerts: AlertType[]
}

interface Integration {
  id: string
  name: string
  type: "SIEM" | "SOAR" | "EDR" | "Cloud" | "Threat Intel" | "Network"
  status: "Connected" | "Disconnected" | "Error" | "Configuring" | "Not Connected"
  description: string
  endpoint: string
  apiKey?: string
  lastSync?: string
  alertsIngested: number
  configuration: Record<string, any>
}

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  description: string
  parameters?: Record<string, string>
  example: string
}

export function SiemIntegration({ alerts }: SiemIntegrationProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<string>("splunk")
  const [apiKey, setApiKey] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [testResult, setTestResult] = useState<string | null>(null)

  // Mock integrations data
  const integrations = useMemo<Integration[]>(
    () => [
      {
        id: "splunk",
        name: "Splunk Enterprise Security",
        type: "SIEM",
        status: "Not Connected",
        description: "Real-time CAPRI score ingestion into Splunk ES for correlation and alerting",
        endpoint: "https://splunk.company.com:8089/services/collector/event",
        apiKey: "********-****-****-****-************",
        lastSync: "2024-01-15T10:30:00Z",
        alertsIngested: 1247,
        configuration: {
          index: "cisa_capri",
          sourcetype: "capri:alert",
          host: "cisa-capri-platform",
          ssl_verify: true,
          batch_size: 100,
        },
      },
      {
        id: "sentinel",
        name: "Microsoft Sentinel",
        type: "SIEM",
        status: "Not Connected",
        description: "Microsoft Sentinel integration for cloud-native security operations",
        endpoint: "https://company.ods.opinsights.azure.com/api/logs",
        apiKey: "********-****-****-****-************",
        lastSync: "2024-01-15T10:25:00Z",
        alertsIngested: 892,
        configuration: {
          workspace_id: "12345678-1234-1234-1234-123456789012",
          log_type: "CISACapri_CL",
          time_generated_field: "TimeGenerated",
        },
      },
      {
        id: "qradar",
        name: "IBM QRadar",
        type: "SIEM",
        status: "Not Connected",
        description: "QRadar SIEM integration for enterprise security monitoring",
        endpoint: "https://qradar.company.com/api/ariel/searches",
        apiKey: "********-****-****-****-************",
        lastSync: "2024-01-15T10:20:00Z",
        alertsIngested: 634,
        configuration: {
          reference_set: "CISA_CAPRI_Indicators",
          offense_type: "CAPRI Alert",
          magnitude: 5,
          credibility: 8,
        },
      },
      {
        id: "crowdstrike",
        name: "CrowdStrike Falcon",
        type: "EDR",
        status: "Not Connected",
        description: "Endpoint detection and response integration for threat hunting",
        endpoint: "https://api.crowdstrike.com/intel/entities/indicators/v1",
        apiKey: "********-****-****-****-************",
        lastSync: "2024-01-15T10:10:00Z",
        alertsIngested: 423,
        configuration: {
          indicator_type: "domain,ip,hash",
          action: "prevent",
          platforms: "windows,mac,linux",
          severity: "high",
        },
      },
    ],
    [],
  )

  // API endpoints for external integration
  const apiEndpoints = useMemo<ApiEndpoint[]>(
    () => [
      {
        method: "GET",
        path: "/api/v1/capri/scores",
        description: "Get current CAPRI scores by sector",
        parameters: {
          sector: "Optional sector filter (Energy, Healthcare, Finance, etc.)",
          format: "Response format (json, xml, csv)",
        },
        example: `{
  "timestamp": "2024-01-15T10:30:00Z",
  "overall_score": 3.2,
  "sectors": {
    "Energy": {"score": 3.8, "alerts": 45},
    "Healthcare": {"score": 2.9, "alerts": 23},
    "Finance": {"score": 3.5, "alerts": 67}
  }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/alerts",
        description: "Retrieve threat intelligence alerts",
        parameters: {
          limit: "Number of alerts to return (default: 100)",
          sector: "Filter by sector",
          severity: "Filter by severity (Low, Medium, High, Critical)",
          since: "ISO timestamp for alerts since date",
        },
        example: `{
  "alerts": [
    {
      "id": "alert-001",
      "title": "Critical Vulnerability in Energy Sector",
      "severity": "High",
      "sector": "Energy",
      "timestamp": "2024-01-15T09:45:00Z",
      "capri_impact": 0.8
    }
  ],
  "total": 1247,
  "page": 1
}`,
      },
      {
        method: "POST",
        path: "/api/v1/indicators",
        description: "Submit threat indicators to CAPRI",
        parameters: {
          type: "Indicator type (ip, domain, hash, url)",
          value: "Indicator value",
          confidence: "Confidence level (0-100)",
          source: "Source of the indicator",
        },
        example: `{
  "indicators": [
    {
      "type": "ip",
      "value": "192.168.1.100",
      "confidence": 85,
      "source": "Internal SOC",
      "tags": ["malware", "c2"]
    }
  ]
}`,
      },
      {
        method: "POST",
        path: "/api/v1/webhooks",
        description: "Register webhook for real-time notifications",
        parameters: {
          url: "Webhook endpoint URL",
          events: "Array of events to subscribe to",
          secret: "Optional webhook secret for verification",
        },
        example: `{
  "webhook": {
    "url": "https://your-siem.com/webhook/capri",
    "events": ["alert.created", "score.updated"],
    "secret": "your-webhook-secret"
  }
}`,
      },
    ],
    [],
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Connected":
        return "text-green-600 bg-green-50"
      case "Configuring":
        return "text-yellow-600 bg-yellow-50"
      case "Error":
        return "text-red-600 bg-red-50"
      case "Not Connected":
        return "text-gray-600 bg-gray-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "Configuring":
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
      case "Error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "Not Connected":
        return <Database className="h-4 w-4 text-gray-600" />
      default:
        return <Database className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SIEM":
        return <Database className="h-4 w-4" />
      case "SOAR":
        return <Zap className="h-4 w-4" />
      case "EDR":
        return <Shield className="h-4 w-4" />
      case "Cloud":
        return <Globe className="h-4 w-4" />
      case "Threat Intel":
        return <Activity className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const handleTestConnection = async () => {
    setTestResult("Testing connection...")
    // Simulate API test
    setTimeout(() => {
      setTestResult("✅ Connection successful! CAPRI data can be ingested.")
    }, 2000)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#005288]">APIs & Integrations</h2>
          <p className="text-gray-600">Connect CAPRI with your security infrastructure and external systems</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const config = { integrations, apiEndpoints, timestamp: new Date().toISOString() }
              const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = "capri-integrations-config.json"
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Export Config
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("https://docs.cisa-capri.gov/api", "_blank")}>
            <ExternalLink className="h-4 w-4 mr-1" />
            API Docs
          </Button>
        </div>
      </div>

      {/* Integration Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Integrations</p>
                <p className="text-2xl font-bold text-green-600">
                  {integrations.filter((i) => i.status === "Connected").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Alerts Sent</p>
                <p className="text-2xl font-bold text-blue-600">
                  {integrations.reduce((sum, i) => sum + i.alertsIngested, 0).toLocaleString()}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">API Calls (24h)</p>
                <p className="text-2xl font-bold text-purple-600">12,847</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-orange-600">245ms</p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Integration Interface */}
      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations">Current Integrations</TabsTrigger>
          <TabsTrigger value="api">API Endpoints</TabsTrigger>
          <TabsTrigger value="configure">Configure New</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTypeIcon(integration.type)}
                    <span>{integration.name}</span>
                    <Badge variant="outline">{integration.type}</Badge>
                  </CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(integration.status)}
                        <span className={`text-sm px-2 py-1 rounded ${getStatusColor(integration.status)}`}>
                          {integration.status}
                        </span>
                      </div>
                      {integration.lastSync && (
                        <span className="text-xs text-gray-500">
                          Last sync: {new Date(integration.lastSync).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Alerts Ingested:</span>
                        <span className="font-medium ml-2">{integration.alertsIngested.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Endpoint:</span>
                        <span className="font-mono text-xs ml-2 truncate block">
                          {integration.endpoint.replace(/https?:\/\//, "")}
                        </span>
                      </div>
                    </div>

                    {/* Configuration */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Configuration:</h4>
                      <div className="bg-gray-50 p-3 rounded text-xs">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(integration.configuration, null, 2)}</pre>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3 mr-1" />
                        Configure
                      </Button>
                      <Button size="sm" variant="outline">
                        <Play className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div className="space-y-6">
            <Alert>
              <Code className="h-4 w-4" />
              <AlertDescription>
                Use these REST API endpoints to integrate CAPRI data with your security tools and custom applications.
                All endpoints require API key authentication.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {apiEndpoints.map((endpoint, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge
                        className={
                          endpoint.method === "GET"
                            ? "bg-green-500"
                            : endpoint.method === "POST"
                              ? "bg-blue-500"
                              : endpoint.method === "PUT"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                        }
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </CardTitle>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Parameters */}
                      {endpoint.parameters && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Parameters:</h4>
                          <div className="space-y-2">
                            {Object.entries(endpoint.parameters).map(([param, desc]) => (
                              <div key={param} className="flex items-start gap-2 text-sm">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{param}</code>
                                <span className="text-gray-600">{desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Example Response */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">Example Response:</h4>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(endpoint.example)}>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                          <pre>{endpoint.example}</pre>
                        </div>
                      </div>

                      {/* cURL Example */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">cURL Example:</h4>
                        <div className="bg-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                          <code>
                            curl -X {endpoint.method} \<br />
                            &nbsp;&nbsp;"https://api.cisa-capri.gov{endpoint.path}" \<br />
                            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
                            &nbsp;&nbsp;-H "Content-Type: application/json"
                            {endpoint.method === "POST" && (
                              <>
                                \<br />
                                &nbsp;&nbsp;-d '{JSON.stringify({ example: "data" }, null, 2)}'
                              </>
                            )}
                          </code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="configure">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Integration</CardTitle>
                <CardDescription>Configure a new SIEM, SOAR, or security tool integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Integration Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="">Select integration type...</option>
                      <option value="splunk">Splunk Enterprise Security</option>
                      <option value="sentinel">Microsoft Sentinel</option>
                      <option value="qradar">IBM QRadar</option>
                      <option value="phantom">Splunk Phantom (SOAR)</option>
                      <option value="xsoar">Cortex XSOAR</option>
                      <option value="crowdstrike">CrowdStrike Falcon</option>
                      <option value="custom">Custom REST API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Endpoint URL</label>
                    <Input
                      placeholder="https://your-siem.company.com/api/endpoint"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">API Key / Token</label>
                    <Input
                      type="password"
                      placeholder="Enter your API key or authentication token"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Data Format</label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="csv">CSV</option>
                      <option value="syslog">Syslog</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Sync Frequency</label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="realtime">Real-time</option>
                      <option value="5min">Every 5 minutes</option>
                      <option value="15min">Every 15 minutes</option>
                      <option value="1hour">Every hour</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleTestConnection} className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      Test Connection
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Settings className="h-4 w-4 mr-1" />
                      Advanced Config
                    </Button>
                  </div>

                  {testResult && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>{testResult}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Templates</CardTitle>
                <CardDescription>Pre-configured templates for popular security tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      name: "Splunk HEC",
                      description: "HTTP Event Collector for Splunk Enterprise",
                      config: "JSON over HTTPS",
                    },
                    {
                      name: "Sentinel Data Connector",
                      description: "Microsoft Sentinel custom log ingestion",
                      config: "REST API with Azure AD auth",
                    },
                    {
                      name: "QRadar Reference Set",
                      description: "IBM QRadar threat intelligence feed",
                      config: "REST API with API key",
                    },
                    {
                      name: "MISP Integration",
                      description: "Malware Information Sharing Platform",
                      config: "MISP API with PyMISP",
                    },
                    {
                      name: "STIX/TAXII Feed",
                      description: "Structured threat intelligence feed",
                      config: "TAXII 2.1 compliant",
                    },
                  ].map((template, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-gray-600">{template.description}</p>
                          <p className="text-xs text-blue-600">{template.config}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
