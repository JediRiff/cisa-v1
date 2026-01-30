"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertTriangle, CheckCircle, X } from "lucide-react"
import type { Alert as AlertType } from "@/types/alert"

interface ManualIngestionProps {
  onAlertSubmitted: (alert: AlertType) => void
}

export function ManualIngestion({ onAlertSubmitted }: ManualIngestionProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [sector, setSector] = useState("")
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High" | "Critical">("Medium")
  const [source, setSource] = useState("")
  const [kev, setKev] = useState(false)
  const [exploitation, setExploitation] = useState(false)
  const [criticalInfrastructure, setCriticalInfrastructure] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      // Validate required fields
      if (!title || !description || !sector || !source) {
        throw new Error("Please fill in all required fields")
      }

      // Create new alert
      const newAlert: AlertType = {
        id: `manual-${Date.now()}`,
        title,
        description,
        date: new Date().toISOString(),
        sector,
        urgency,
        posture: urgency === "Critical" || urgency === "High" ? "Elevated" : "Guarded",
        kev,
        exploitation,
        criticalInfrastructure,
        source,
      }

      // Simulate API submission
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onAlertSubmitted(newAlert)
      setSubmitResult("✅ Alert submitted successfully!")

      // Reset form
      setTitle("")
      setDescription("")
      setSector("")
      setUrgency("Medium")
      setSource("")
      setKev(false)
      setExploitation(false)
      setCriticalInfrastructure(false)
    } catch (error) {
      setSubmitResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

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
    "Government",
    "Emergency Services",
    "Nuclear",
    "Dams",
    "Chemical",
    "Commercial Facilities",
    "IT",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Manual Alert Ingestion
        </CardTitle>
        <CardDescription>
          Submit threat intelligence alerts manually for immediate CAPRI score calculation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Alert Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter alert title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Detailed description of the threat or vulnerability..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Sector and Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Sector <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full p-2 border rounded-md"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                required
              >
                <option value="">Select sector...</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Urgency Level</label>
              <select
                className="w-full p-2 border rounded-md"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Source <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Internal SOC, Vendor Alert, Open Source Intelligence"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
          </div>

          {/* Threat Indicators */}
          <div>
            <label className="block text-sm font-medium mb-2">Threat Indicators</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={kev} onChange={(e) => setKev(e.target.checked)} className="rounded" />
                <span className="text-sm">Known Exploited Vulnerability (KEV)</span>
                <Badge variant="outline" className="text-xs">
                  CISA KEV Catalog
                </Badge>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exploitation}
                  onChange={(e) => setExploitation(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Active Exploitation Observed</span>
                <Badge variant="outline" className="text-xs">
                  In-the-wild
                </Badge>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={criticalInfrastructure}
                  onChange={(e) => setCriticalInfrastructure(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Critical Infrastructure Impact</span>
                <Badge variant="outline" className="text-xs">
                  CI Sectors
                </Badge>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Alert
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTitle("")
                setDescription("")
                setSector("")
                setUrgency("Medium")
                setSource("")
                setKev(false)
                setExploitation(false)
                setCriticalInfrastructure(false)
                setSubmitResult(null)
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Result Message */}
          {submitResult && (
            <Alert>
              {submitResult.includes("✅") ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{submitResult}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
