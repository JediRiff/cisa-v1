"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"
import { TrendingUp, TrendingDown, Calendar, Download, Filter } from "lucide-react"
import { generateHistoricalData } from "@/lib/sample-data"
import type { Alert } from "@/types/alert"

interface HistoricalTrendsProps {
  alerts: Alert[]
  sectorScores: any[]
}

interface TrendPoint {
  date: string
  timestamp: number
  overallScore: number
  sectors: {
    [key: string]: {
      score: number
      alerts: number
      incidents: number
    }
  }
  totalAlerts: number
  criticalAlerts: number
}

export function HistoricalTrends({ alerts, sectorScores }: HistoricalTrendsProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d")
  const [selectedSector, setSelectedSector] = useState<string>("all")

  // Generate comprehensive historical data
  const historicalData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const baseData = generateHistoricalData(days)

    return baseData.map((point, index) => ({
      date: point.date,
      timestamp: new Date(point.date).getTime(),
      overallScore: point.score,
      sectors: {
        Energy: {
          score: 3.2 + Math.sin(index * 0.3) * 0.8 + Math.random() * 0.4,
          alerts: Math.floor(Math.random() * 15) + 5,
          incidents: Math.floor(Math.random() * 3),
        },
        Healthcare: {
          score: 3.8 + Math.cos(index * 0.2) * 0.6 + Math.random() * 0.3,
          alerts: Math.floor(Math.random() * 12) + 3,
          incidents: Math.floor(Math.random() * 2),
        },
        Finance: {
          score: 3.5 + Math.sin(index * 0.4) * 0.7 + Math.random() * 0.3,
          alerts: Math.floor(Math.random() * 18) + 8,
          incidents: Math.floor(Math.random() * 4),
        },
        Transportation: {
          score: 2.7 + Math.cos(index * 0.5) * 0.5 + Math.random() * 0.4,
          alerts: Math.floor(Math.random() * 8) + 2,
          incidents: Math.floor(Math.random() * 2),
        },
        Defense: {
          score: 4.2 + Math.sin(index * 0.1) * 0.3 + Math.random() * 0.2,
          alerts: Math.floor(Math.random() * 6) + 1,
          incidents: Math.floor(Math.random() * 1),
        },
        Communications: {
          score: 2.9 + Math.cos(index * 0.6) * 0.6 + Math.random() * 0.4,
          alerts: Math.floor(Math.random() * 10) + 4,
          incidents: Math.floor(Math.random() * 2),
        },
      },
      totalAlerts: point.alerts,
      criticalAlerts: Math.floor(point.alerts * 0.3),
    }))
  }, [timeRange])

  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (historicalData.length < 2) return null

    const latest = historicalData[historicalData.length - 1]
    const previous = historicalData[historicalData.length - 2]
    const weekAgo = historicalData[Math.max(0, historicalData.length - 7)]

    // Get sector-specific values or overall values
    const getLatestScore = () =>
      selectedSector === "all" ? latest.overallScore : latest.sectors[selectedSector]?.score || 0
    const getPreviousScore = () =>
      selectedSector === "all" ? previous.overallScore : previous.sectors[selectedSector]?.score || 0
    const getWeekAgoScore = () =>
      selectedSector === "all" ? weekAgo.overallScore : weekAgo.sectors[selectedSector]?.score || 0

    const getLatestAlerts = () =>
      selectedSector === "all" ? latest.totalAlerts : latest.sectors[selectedSector]?.alerts || 0
    const getPreviousAlerts = () =>
      selectedSector === "all" ? previous.totalAlerts : previous.sectors[selectedSector]?.alerts || 0

    const scoreChange = getLatestScore() - getPreviousScore()
    const weeklyChange = getLatestScore() - getWeekAgoScore()
    const alertChange = getLatestAlerts() - getPreviousAlerts()

    return {
      scoreChange,
      weeklyChange,
      alertChange,
      trend: scoreChange > 0.1 ? "up" : scoreChange < -0.1 ? "down" : "stable",
    }
  }, [historicalData, selectedSector])

  // Prepare chart data based on selected sector
  const chartData = useMemo(() => {
    return historicalData.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      timestamp: point.timestamp,
      score: selectedSector === "all" ? point.overallScore : point.sectors[selectedSector]?.score || 0,
      alerts: selectedSector === "all" ? point.totalAlerts : point.sectors[selectedSector]?.alerts || 0,
      incidents:
        selectedSector === "all"
          ? Object.values(point.sectors).reduce((sum, s) => sum + s.incidents, 0)
          : point.sectors[selectedSector]?.incidents || 0,
    }))
  }, [historicalData, selectedSector])

  const sectors = ["all", "Energy", "Healthcare", "Finance", "Transportation", "Defense", "Communications"]

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#005288]">Historical CAPRI Trends</h2>
          <p className="text-gray-600">Time-series analysis of threat landscape evolution</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "outline"}
                onClick={() => setTimeRange(range)}
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

      {/* Trend Summary Cards */}
      {trendStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#005288]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Score Change (24h)</p>
                  <p className="text-xl font-bold text-[#005288]">
                    {trendStats.scoreChange > 0 ? "+" : ""}
                    {trendStats.scoreChange.toFixed(2)}
                  </p>
                </div>
                {trendStats.trend === "up" ? (
                  <TrendingUp className="h-6 w-6 text-red-500" />
                ) : trendStats.trend === "down" ? (
                  <TrendingDown className="h-6 w-6 text-green-500" />
                ) : (
                  <div className="h-6 w-6" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Weekly Trend</p>
                  <p className="text-xl font-bold text-amber-600">
                    {trendStats.weeklyChange > 0 ? "+" : ""}
                    {trendStats.weeklyChange.toFixed(2)}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#d92525]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Alert Change (24h)</p>
                  <p className="text-xl font-bold text-[#d92525]">
                    {trendStats.alertChange > 0 ? "+" : ""}
                    {trendStats.alertChange}
                  </p>
                </div>
                <Filter className="h-6 w-6 text-[#d92525]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sector Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Sector Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sectors.map((sector) => (
              <Button
                key={sector}
                size="sm"
                variant={selectedSector === sector ? "default" : "outline"}
                onClick={() => setSelectedSector(sector)}
                className={selectedSector === sector ? "bg-[#005288]" : ""}
              >
                {sector === "all" ? "All Sectors" : sector}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scores">CAPRI Scores</TabsTrigger>
          <TabsTrigger value="alerts">Alert Volume</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <Card>
            <CardHeader>
              <CardTitle>CAPRI Score Evolution - {selectedSector === "all" ? "All Sectors" : selectedSector}</CardTitle>
              <CardDescription>Historical trend showing threat level changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  score: {
                    label: "CAPRI Score",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 5]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-score)"
                      fill="var(--color-score)"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alert Volume Trends - {selectedSector === "all" ? "All Sectors" : selectedSector}</CardTitle>
              <CardDescription>Daily alert counts and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  alerts: {
                    label: "Alerts",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="alerts" fill="var(--color-alerts)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents - {selectedSector === "all" ? "All Sectors" : selectedSector}</CardTitle>
              <CardDescription>Confirmed security incidents requiring response</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  incidents: {
                    label: "Incidents",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="incidents"
                      stroke="var(--color-incidents)"
                      strokeWidth={3}
                      dot={{ fill: "var(--color-incidents)", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
