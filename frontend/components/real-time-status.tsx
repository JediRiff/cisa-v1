"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react"
import type { Alert } from "@/types/alert"

interface RealTimeStatusProps {
  onDataUpdate: (alert: Alert) => void
}

interface SystemStatus {
  component: string
  status: "operational" | "degraded" | "outage"
  lastUpdate: string
  responseTime?: number
}

export function RealTimeStatus({ onDataUpdate }: RealTimeStatusProps) {
  const [isConnected, setIsConnected] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [alertCount, setAlertCount] = useState(0)
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([
    {
      component: "CISA RSS Feeds",
      status: "operational",
      lastUpdate: "2024-01-15T10:30:00Z",
      responseTime: 245,
    },
    {
      component: "Threat Intelligence APIs",
      status: "operational",
      lastUpdate: "2024-01-15T10:29:45Z",
      responseTime: 189,
    },
    {
      component: "CAPRI Calculator",
      status: "operational",
      lastUpdate: "2024-01-15T10:30:15Z",
      responseTime: 67,
    },
    {
      component: "Database",
      status: "operational",
      lastUpdate: "2024-01-15T10:30:10Z",
      responseTime: 23,
    },
  ])

  // Simulate real-time updates
  useEffect(() => {
    if (isPaused || !isConnected) return

    const interval = setInterval(() => {
      // Simulate new alert
      if (Math.random() > 0.7) {
        const sectors = ["Energy", "Healthcare", "Finance", "Transportation", "Water"]
        const urgencies = ["Low", "Medium", "High", "Critical"]
        const sources = ["CISA RSS", "US-CERT", "ICS-CERT", "NIST NVD"]

        const newAlert: Alert = {
          id: `alert-${Date.now()}`,
          title: `Real-time Alert ${alertCount + 1}`,
          date: new Date().toISOString(),
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          urgency: urgencies[Math.floor(Math.random() * urgencies.length)] as any,
          posture: Math.random() > 0.5 ? "Elevated" : "Guarded",
          kev: Math.random() > 0.7,
          exploitation: Math.random() > 0.8,
          criticalInfrastructure: Math.random() > 0.6,
          source: sources[Math.floor(Math.random() * sources.length)],
          description: "Real-time threat intelligence alert from automated feeds",
        }

        onDataUpdate(newAlert)
        setAlertCount((prev) => prev + 1)
        setLastUpdate(new Date())
      }

      // Update system status
      setSystemStatus((prev) =>
        prev.map((status) => ({
          ...status,
          lastUpdate: new Date().toISOString(),
          responseTime: Math.floor(Math.random() * 300) + 50,
          status: Math.random() > 0.95 ? "degraded" : "operational",
        })),
      )
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isPaused, isConnected, onDataUpdate, alertCount])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-green-600 bg-green-50"
      case "degraded":
        return "text-yellow-600 bg-yellow-50"
      case "outage":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-3 w-3" />
      case "degraded":
        return <AlertTriangle className="h-3 w-3" />
      case "outage":
        return <RefreshCw className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
              <span className="text-sm font-medium">{isConnected ? "Connected" : "Disconnected"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm">{alertCount} alerts processed</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Last update: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">System Status</span>
            <div className="flex items-center gap-2">
              {systemStatus.map((status) => (
                <div key={status.component} className="flex items-center gap-1">
                  {getStatusIcon(status.status)}
                  <Badge variant="outline" className={`text-xs ${getStatusColor(status.status)}`}>
                    {status.component}: {status.responseTime}ms
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
