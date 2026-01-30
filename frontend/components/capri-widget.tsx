"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, BarChart3, Info, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { INTELLIGENCE_CATEGORIES, type CriticalSector } from "@/lib/capri-calculator"
import { useState } from "react"

interface SectorScore {
  sector: CriticalSector
  score: number
  breakdown: {
    P: number
    X: number
    S: number
    U: number
    K: number
    C: number
    A: number
    R: number
    T: number
    CSS: number
  }
  rationale: string
  categories: {
    alerts: number
    research: number
    threatIntel: number
    vulnerability: number
    geopolitical: number
  }
}

interface CapriWidgetProps {
  sectorScores: SectorScore[]
}

export function CapriWidget({ sectorScores }: CapriWidgetProps) {
  const [selectedSector, setSelectedSector] = useState<CriticalSector>("Energy")

  // Handle loading state and empty data
  if (!sectorScores || sectorScores.length === 0) {
    return (
      <Card className="border-[#005288] border-t-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#005288] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            CAPRI by Sector
          </CardTitle>
          <CardDescription>Critical Infrastructure Alert Prioritization Index</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#005288] mb-4" />
            <p className="text-sm text-gray-600">Loading sector scores...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get selected sector data with fallback
  const currentSector = sectorScores.find((s) => s.sector === selectedSector) || sectorScores[0]

  // Additional safety check
  if (!currentSector) {
    return (
      <Card className="border-[#005288] border-t-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#005288] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            CAPRI by Sector
          </CardTitle>
          <CardDescription>Critical Infrastructure Alert Prioritization Index</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-4" />
            <p className="text-sm text-gray-600">No sector data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayScore = Math.round(currentSector.score * 10) / 10

  // Determine severity level based on score
  const getSeverityColor = (score: number) => {
    if (score >= 4) return "text-[#d92525]" // High - Red
    if (score >= 3) return "text-amber-600" // Medium - Amber
    return "text-green-600" // Low - Green
  }

  const getSeverityBg = (score: number) => {
    if (score >= 4) return "bg-[#d92525]"
    if (score >= 3) return "bg-amber-500"
    return "bg-green-600"
  }

  const severityColor = getSeverityColor(displayScore)

  // Sort sectors by score for overview
  const sortedSectors = [...sectorScores].sort((a, b) => b.score - a.score)

  return (
    <Card className="border-[#005288] border-t-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#005288] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          CAPRI by Sector
        </CardTitle>
        <CardDescription>Critical Infrastructure Alert Prioritization Index</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Quick sector selector */}
        <div className="mb-4">
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value as CriticalSector)}
            className="w-full p-2 border rounded-md text-sm"
          >
            {sortedSectors.map((sector) => (
              <option key={sector.sector} value={sector.sector}>
                {sector.sector} - {sector.score.toFixed(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Current Sector Score Display */}
        <div className="flex flex-col items-center justify-center py-4 border-b">
          <div className="text-sm font-medium text-gray-600 mb-1">{currentSector.sector}</div>
          <div className={`text-5xl font-bold ${severityColor}`}>{displayScore}</div>
          <div className="text-xs text-center mt-2 max-w-xs text-gray-600">{currentSector.rationale}</div>
        </div>

        {/* Intelligence Categories with Descriptions */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-[#005288]" />
            <h3 className="text-sm font-medium text-[#005288]">Intelligence Categories</h3>
          </div>

          {Object.entries(INTELLIGENCE_CATEGORIES).map(([key, category]) => {
            const score = currentSector.categories[key as keyof typeof currentSector.categories] || 0
            return (
              <div key={key} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{category.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.weight}%
                    </Badge>
                  </div>
                  <Badge className={getSeverityBg(score * 5)} variant="default">
                    {(score * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{category.description}</p>
              </div>
            )
          })}
        </div>

        {/* Top Risk Sectors Overview */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-[#005288] mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Highest Risk Sectors
          </h3>
          <div className="space-y-2">
            {sortedSectors.slice(0, 5).map((sector, index) => (
              <div key={sector.sector} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">#{index + 1}</span>
                  <span>{sector.sector}</span>
                  {sector.score >= 4 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : sector.score >= 3 ? (
                    <TrendingUp className="h-3 w-3 text-amber-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                </div>
                <Badge className={getSeverityBg(sector.score)} variant="default">
                  {sector.score.toFixed(1)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Score Breakdown */}
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Score Calculation - {currentSector.sector}</h3>

          {/* Show the actual calculation method */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-2">Final Score = 1 + (Weighted Intelligence Score × 4)</div>
            <div className="flex justify-between items-center text-sm">
              <span>Weighted Intelligence Score:</span>
              <span className="font-mono">{(currentSector.breakdown.CSS || 0).toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Final Calculation:</span>
              <span className="font-mono">
                1 + ({(currentSector.breakdown.CSS || 0).toFixed(3)} × 4) = {displayScore}
              </span>
            </div>
          </div>

          {/* Intelligence Category Contributions */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Intelligence Category Contributions</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(INTELLIGENCE_CATEGORIES).map(([key, category]) => {
                  const score = currentSector.categories[key as keyof typeof currentSector.categories] || 0
                  const contribution = (score * category.weight) / 100
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right font-mono">{(score * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{category.weight}%</TableCell>
                      <TableCell className="text-right font-mono">{contribution.toFixed(3)}</TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">Total Weighted Score</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold">100%</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {(currentSector.breakdown.CSS || 0).toFixed(3)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Individual Factor Scores (for reference) */}
          <div>
            <h4 className="text-sm font-medium mb-2">Individual Factor Scores (Reference)</h4>
            <div className="text-xs text-gray-600 mb-2">
              These are individual component scores used in the intelligence category calculations above.
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">P</TableCell>
                  <TableCell>National Posture</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.P || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">X</TableCell>
                  <TableCell>Exploitation Observed</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.X || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">S</TableCell>
                  <TableCell>Sector Match</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.S || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">U</TableCell>
                  <TableCell>Urgency</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.U || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">K</TableCell>
                  <TableCell>KEV Presence</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.K || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">C</TableCell>
                  <TableCell>Critical Infrastructure</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.C || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">R</TableCell>
                  <TableCell>Research Intelligence</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.R || 0).toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">T</TableCell>
                  <TableCell>Threat Intelligence</TableCell>
                  <TableCell className="text-right">{(currentSector.breakdown.T || 0).toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
