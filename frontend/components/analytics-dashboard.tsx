"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Download,
  AlertTriangle,
  Shield,
  Target,
  Clock,
} from "lucide-react"
import type { Alert } from "@/types/alert"

// Import sample data at the top
import { generateSampleAlerts, generateHistoricalData, generateThreatPredictions } from "@/lib/sample-data"

interface AnalyticsDashboardProps {
  alerts: Alert[]
  capriScore: {
    score: number
    breakdown: any
    rationale: string
  }
}

interface TrendData {
  date: string
  score: number
  alerts: number
  sectors?: {
    [sector: string]: {
      score: number
    }
  }
}

interface SectorAnalytics {
  sector: string
  alertCount: number
  avgScore: number
  trend: "up" | "down" | "stable"
  criticalAlerts: number
}

export function AnalyticsDashboard({ alerts, capriScore }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d")

  // Replace the trendData useMemo with:
  const trendData = useMemo(() => {
    const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30
    return generateHistoricalData(days)
  }, [timeRange])

  // Replace the sectorAnalytics useMemo with:
  const sectorAnalytics = useMemo<SectorAnalytics[]>(() => {
    const sampleAlerts = generateSampleAlerts()
    const allAlerts = [...alerts, ...sampleAlerts]
    const sectors = [
      "Energy",
      "Healthcare",
      "Finance",
      "Transportation",
      "Water",
      "Communications",
      "Defense",
      "Manufacturing",
      "Food & Agriculture",
    ]

    return sectors
      .map((sector) => {
        const sectorAlerts = allAlerts.filter((alert) => alert.sector === sector)
        const criticalAlerts = sectorAlerts.filter((alert) => alert.urgency === "High").length

        // Calculate average score from recent trend data
        const recentData = trendData.slice(-7) // Last 7 data points
        const avgScore =
          recentData.length > 0
            ? recentData.reduce((sum, data) => sum + (data.sectors?.[sector]?.score || 3.0), 0) / recentData.length
            : 3.0

        // Determine trend based on first vs last data points
        const firstScore = recentData[0]?.sectors?.[sector]?.score || 3.0
        const lastScore = recentData[recentData.length - 1]?.sectors?.[sector]?.score || 3.0
        const trend = lastScore > firstScore + 0.1 ? "up" : lastScore < firstScore - 0.1 ? "down" : "stable"

        return {
          sector,
          alertCount: sectorAlerts.length,
          avgScore,
          trend,
          criticalAlerts,
        }
      })
      .sort((a, b) => b.alertCount - a.alertCount)
  }, [alerts, trendData])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const sampleAlerts = generateSampleAlerts()
    const allAlerts = [...alerts, ...sampleAlerts]

    const currentScore = capriScore.score
    const previousScore = trendData.length > 1 ? trendData[trendData.length - 2]?.score || currentScore : currentScore
    const scoreChange = currentScore - previousScore

    const totalAlerts = allAlerts.length
    const criticalAlerts = allAlerts.filter((alert) => alert.urgency === "High").length
    const kevAlerts = allAlerts.filter((alert) => alert.kev).length
    const exploitationAlerts = allAlerts.filter((alert) => alert.exploitation).length

    return {
      currentScore,
      scoreChange,
      totalAlerts,
      criticalAlerts,
      kevAlerts,
      exploitationAlerts,
      criticalPercentage: totalAlerts > 0 ? (criticalAlerts / totalAlerts) * 100 : 0,
    }
  }, [alerts, capriScore.score, trendData])

  // Add threat predictions data
  const threatPredictions = useMemo(() => generateThreatPredictions(), [])

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#005288]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current CAPRI</p>
                <p className="text-2xl font-bold text-[#005288]">{metrics.currentScore.toFixed(1)}</p>
              </div>
              <div className="flex items-center gap-1">
                {metrics.scoreChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : metrics.scoreChange < 0 ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : null}
                <span
                  className={`text-sm ${metrics.scoreChange > 0 ? "text-red-500" : metrics.scoreChange < 0 ? "text-green-500" : "text-gray-500"}`}
                >
                  {metrics.scoreChange > 0 ? "+" : ""}
                  {metrics.scoreChange.toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#d92525]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-[#d92525]">{metrics.criticalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#d92525]" />
            </div>
            <p className="text-xs text-gray-500 mt-1">{metrics.criticalPercentage.toFixed(1)}% of total alerts</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">KEV Alerts</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.kevAlerts}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Known Exploited Vulnerabilities</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Exploitation</p>
                <p className="text-2xl font-bold text-amber-600">{metrics.exploitationAlerts}</p>
              </div>
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Confirmed in-the-wild activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {["24h", "7d", "30d"].map((range) => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? "default" : "outline"}
                  onClick={() => setTimeRange(range as any)}
                  className={timeRange === range ? "bg-[#005288]" : ""}
                >
                  {range}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CAPRI Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  CAPRI Score Trend
                </CardTitle>
                <CardDescription>Historical CAPRI scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gray-50 rounded">
                  {trendData.slice(-14).map((data, index) => {
                    const height = Math.max(10, (data.score / 5) * 100) // Ensure minimum height
                    return (
                      <div key={index} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-full bg-[#005288] rounded-t transition-all hover:bg-[#003e66]"
                          style={{ height: `${height}%` }}
                          title={`${data.date}: ${data.score.toFixed(1)}`}
                        />
                        <span className="text-xs text-gray-500 rotate-45 origin-left whitespace-nowrap">
                          {new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Alert Volume Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Alert Volume Trend
                </CardTitle>
                <CardDescription>Daily alert counts over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gray-50 rounded">
                  {trendData.slice(-14).map((data, index) => {
                    const height = Math.max(5, (data.alerts / 25) * 100) // Ensure minimum height and adjust scale
                    return (
                      <div key={index} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-full bg-[#d92525] rounded-t transition-all hover:bg-[#b91c1c]"
                          style={{ height: `${height}%` }}
                          title={`${data.date}: ${data.alerts} alerts`}
                        />
                        <span className="text-xs text-gray-500 rotate-45 origin-left whitespace-nowrap">
                          {new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sectors">
          <Card>
            <CardHeader>
              <CardTitle>Sector Analysis</CardTitle>
              <CardDescription>Alert distribution and risk levels by critical infrastructure sector</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorAnalytics.map((sector) => (
                  <div key={sector.sector} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="font-medium">{sector.sector}</div>
                      <div className="flex items-center gap-2">
                        {sector.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : sector.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <span className="text-sm text-gray-600">Avg Score: {sector.avgScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{sector.alertCount} alerts</div>
                        <div className="text-sm text-red-600">{sector.criticalAlerts} critical</div>
                      </div>
                      <div
                        className="w-16 h-8 bg-gray-200 rounded"
                        style={{
                          background: `linear-gradient(to right, ${
                            sector.avgScore >= 4 ? "#d92525" : sector.avgScore >= 3 ? "#f59e0b" : "#16a34a"
                          } ${(sector.avgScore / 5) * 100}%, #e5e7eb ${(sector.avgScore / 5) * 100}%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  AI Threat Predictions
                </CardTitle>
                <CardDescription>Machine learning-powered threat intelligence forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threatPredictions.slice(0, 3).map((prediction) => (
                    <div
                      key={prediction.id}
                      className={`p-3 border-l-4 ${
                        prediction.severity === "high"
                          ? "border-l-[#d92525] bg-red-50"
                          : prediction.severity === "medium"
                            ? "border-l-amber-500 bg-amber-50"
                            : "border-l-blue-500 bg-blue-50"
                      }`}
                    >
                      <div
                        className={`font-medium ${
                          prediction.severity === "high"
                            ? "text-[#d92525]"
                            : prediction.severity === "medium"
                              ? "text-amber-700"
                              : "text-blue-700"
                        }`}
                      >
                        {prediction.confidence}% Confidence Prediction
                      </div>
                      <p className="text-sm mt-1 font-medium">{prediction.title}</p>
                      <p className="text-sm mt-1 text-gray-600">{prediction.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={
                            prediction.severity === "high"
                              ? "bg-[#d92525]"
                              : prediction.severity === "medium"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          }
                        >
                          {prediction.sector}
                        </Badge>
                        <Badge variant="outline">{prediction.timeframe}</Badge>
                        <Badge variant="outline">{prediction.confidence}% confidence</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Response Recommendations</CardTitle>
                <CardDescription>Automated response suggestions based on current threat landscape</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {threatPredictions.map((prediction, index) => (
                    <div key={prediction.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {prediction.severity === "high" ? (
                        <AlertTriangle className="h-5 w-5 text-[#d92525] mt-0.5" />
                      ) : prediction.severity === "medium" ? (
                        <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
                      ) : (
                        <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{prediction.recommendations[0]}</div>
                        <p className="text-sm text-gray-600 mt-1">
                          {prediction.sector} sector - {prediction.timeframe}
                        </p>
                        <Badge
                          className={`mt-2 ${
                            prediction.severity === "high"
                              ? "bg-[#d92525]"
                              : prediction.severity === "medium"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          }`}
                        >
                          Priority {index + 1}
                        </Badge>
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
