"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  Target,
  BarChart3,
  BookOpen,
  ExternalLink,
} from "lucide-react"
import { generateLawfareMetrics, generateLawfareTrends, calculateLawfareCapriScore } from "@/lib/lawfare-metrics"

export function LawfareDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<"threat" | "vulnerability" | "consequence">("threat")

  const lawfareMetrics = useMemo(() => generateLawfareMetrics(), [])
  const lawfareTrends = useMemo(() => generateLawfareTrends(), [])
  const lawfareScore = useMemo(() => calculateLawfareCapriScore(lawfareMetrics), [lawfareMetrics])

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600"
    if (score >= 3) return "text-amber-600"
    return "text-[#d92525]"
  }

  const getScoreBg = (score: number) => {
    if (score >= 4) return "bg-green-600"
    if (score >= 3) return "bg-amber-500"
    return "bg-[#d92525]"
  }

  return (
    <div className="space-y-6">
      {/* Lawfare Framework Header */}
      <Card className="border-l-4 border-l-[#005288]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#005288]">
            <BookOpen className="h-5 w-5" />
            Lawfare Research Framework Integration
          </CardTitle>
          <CardDescription>
            Based on "Are Cyber Defenders Winning?" by Jason Healey & Tarang Jain (Columbia University)
            <Button variant="link" className="p-0 h-auto ml-2" asChild>
              <a
                href="https://www.lawfaremedia.org/article/are-cyber-defenders-winning"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 ml-1" />
                Read Full Research
              </a>
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(lawfareScore)}`}>{lawfareScore.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Lawfare Defense Score</div>
              <div className="text-xs text-gray-500 mt-1">
                {lawfareScore >= 4 ? "Defenders Winning" : lawfareScore >= 3 ? "Mixed Progress" : "Attackers Advantage"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{lawfareTrends.positive.length}</div>
              <div className="text-sm text-gray-600">Positive Trends</div>
              <div className="text-xs text-gray-500 mt-1">Defender advantages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#d92525]">{lawfareTrends.concerning.length}</div>
              <div className="text-sm text-gray-600">Concerning Trends</div>
              <div className="text-xs text-gray-500 mt-1">Persistent challenges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{lawfareTrends.mixed.length}</div>
              <div className="text-sm text-gray-600">Mixed Signals</div>
              <div className="text-xs text-gray-500 mt-1">Complex outcomes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three-Category Analysis */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="threat">Threat Analysis</TabsTrigger>
          <TabsTrigger value="vulnerability">Vulnerability Trends</TabsTrigger>
          <TabsTrigger value="consequence">Consequence Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="threat">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Threat Operations
                </CardTitle>
                <CardDescription>Measuring attacker capability and effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">TTP Complexity</div>
                      <div className="text-sm text-gray-600">Shift from easier to harder tactics</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {lawfareMetrics.threat.operations.ttpsComplexity}/5
                      </div>
                      <div className="text-xs text-green-600">↗️ Improving</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Detection Time</div>
                      <div className="text-sm text-gray-600">Mean time to detect threats</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {lawfareMetrics.threat.operations.detectionTime} days
                      </div>
                      <div className="text-xs text-green-600">↗️ Down from 400+</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Internal Detection Rate</div>
                      <div className="text-sm text-gray-600">% detected internally vs externally</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {(lawfareMetrics.threat.operations.internalDetectionRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-green-600">↗️ Increasing</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Vulnerability Exploitation Speed</div>
                      <div className="text-sm text-gray-600">Days from disclosure to exploitation</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-600">
                        {lawfareMetrics.threat.operations.vulnerabilityTurnover} days
                      </div>
                      <div className="text-xs text-amber-600">↕️ Down from 63</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Threat Ecosystem
                </CardTitle>
                <CardDescription>Disruption of threat actor organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Threat Actor Profits</div>
                      <div className="text-sm text-gray-600">Revenue decline indicator</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {(lawfareMetrics.threat.ecosystem.threatActorProfits * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-green-600">↗️ -35% revenue</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Consolidation Index</div>
                      <div className="text-sm text-gray-600">Fewer, larger threat groups</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-600">
                        {lawfareMetrics.threat.ecosystem.consolidationIndex}/5
                      </div>
                      <div className="text-xs text-amber-600">↕️ Survival of fittest</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Talent Recruitment</div>
                      <div className="text-sm text-gray-600">Difficulty recruiting skilled actors</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {lawfareMetrics.threat.ecosystem.talentRecruitment}/5
                      </div>
                      <div className="text-xs text-green-600">↗️ Increasing difficulty</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Inter-Group Trust</div>
                      <div className="text-sm text-gray-600">Cooperation between threat actors</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{lawfareMetrics.threat.ecosystem.trustIndex}/5</div>
                      <div className="text-xs text-green-600">↗️ Decreasing trust</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vulnerability">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Software Ecosystem Security
              </CardTitle>
              <CardDescription>
                Measuring improvements in software security and vulnerability management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">OWASP Top 10 Compliance</div>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {(lawfareMetrics.vulnerability.software.owaspTop10Compliance * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Apps without major flaws</div>
                  <div className="text-xs text-green-600 mt-1">↗️ Up from 32% in 2020</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Patch Speed</div>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {lawfareMetrics.vulnerability.software.patchingSpeed}
                  </div>
                  <div className="text-sm text-gray-600">Days to resolve serious vulns</div>
                  <div className="text-xs text-green-600 mt-1">↗️ Down from 112 days</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Memory Safety</div>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {((1 - lawfareMetrics.vulnerability.software.memoryUnsafeVulns) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Memory-safe code</div>
                  <div className="text-xs text-green-600 mt-1">↗️ 50% reduction in Android</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Vulnerability Severity</div>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {lawfareMetrics.vulnerability.software.severityScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Average CVSS score</div>
                  <div className="text-xs text-green-600 mt-1">↗️ Down from ~7.1</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Vulnerability Diversity</div>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {lawfareMetrics.vulnerability.software.diversityIndex.toFixed(1)}/5
                  </div>
                  <div className="text-sm text-gray-600">Type distribution</div>
                  <div className="text-xs text-green-600 mt-1">↗️ More diverse types</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Legacy Code</div>
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {(lawfareMetrics.vulnerability.software.abandonedCodeRatio * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Unsupported software</div>
                  <div className="text-xs text-amber-600 mt-1">↕️ Persistent challenge</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consequence">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Incident Metrics
                </CardTitle>
                <CardDescription>Measuring the impact and frequency of cyber incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Total Incidents</div>
                      <div className="text-sm text-gray-600">Annual reported incidents</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        {(lawfareMetrics.consequence.incidents.totalIncidents / 1000).toFixed(0)}K
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ +650% since 2008</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Cascading Incidents</div>
                      <div className="text-sm text-gray-600">Multi-victim attacks</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        {lawfareMetrics.consequence.incidents.cascadingIncidents}
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ Major supply chain hits</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">National Security Incidents</div>
                      <div className="text-sm text-gray-600">Critical infrastructure targeting</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        {lawfareMetrics.consequence.incidents.nationalSecurityIncidents}
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ Increasing frequency</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Emergency Declarations</div>
                      <div className="text-sm text-gray-600">State/federal cyber emergencies</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        {lawfareMetrics.consequence.incidents.emergencyDeclarations}
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ 0 pre-2015 → 8+ now</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Economic Impact
                </CardTitle>
                <CardDescription>Financial consequences and market effects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Ransomware Revenue</div>
                      <div className="text-sm text-gray-600">Total payments to threat actors</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${(lawfareMetrics.consequence.costs.ransomwareRevenue / 1e9).toFixed(1)}B
                      </div>
                      <div className="text-xs text-green-600">↗️ -35% per Chainalysis</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Average Loss per Incident</div>
                      <div className="text-sm text-gray-600">Mean financial impact</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        ${(lawfareMetrics.consequence.costs.averageLoss / 1e6).toFixed(1)}M
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ +1520% since 2008</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Catastrophic Incidents</div>
                      <div className="text-sm text-gray-600">High-impact events</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        {lawfareMetrics.consequence.costs.catastrophicIncidents}
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ Increasing severity</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">Credit Downgrades</div>
                      <div className="text-sm text-gray-600">Moody's cyber-related downgrades</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d92525]">
                        {lawfareMetrics.consequence.costs.creditDowngrades}
                      </div>
                      <div className="text-xs text-[#d92525]">↘️ +340% increase</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Research Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Positive Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lawfareTrends.positive.slice(0, 3).map((trend, index) => (
                <div key={index} className="p-2 bg-green-50 rounded">
                  <div className="font-medium text-sm">{trend.metric}</div>
                  <div className="text-xs text-green-700">{trend.trend}</div>
                  <div className="text-xs text-gray-600 mt-1">{trend.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Concerning Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lawfareTrends.concerning.slice(0, 3).map((trend, index) => (
                <div key={index} className="p-2 bg-red-50 rounded">
                  <div className="font-medium text-sm">{trend.metric}</div>
                  <div className="text-xs text-red-700">{trend.trend}</div>
                  <div className="text-xs text-gray-600 mt-1">{trend.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-2 bg-amber-50 rounded">
                <div className="font-medium text-sm">Red Queen Effect</div>
                <div className="text-xs text-gray-600">
                  Survival of the fittest creates fewer but fiercer adversaries
                </div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-medium text-sm">Security Inequality</div>
                <div className="text-xs text-gray-600">Large enterprises improving while SMBs deteriorate</div>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <div className="font-medium text-sm">Measurement Gap</div>
                <div className="text-xs text-gray-600">
                  "Drowning in metrics but lack of measurability" - Michael Daniel
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
