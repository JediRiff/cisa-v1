// CAPRI Threat Intelligence API Endpoint
import { NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/feeds'
import { calculateEnergyScore } from '@/lib/scoring'
import { analyzeThreatsWithAI, AIAnalysisResult } from '@/lib/ai-analysis'

export const revalidate = 0 // No caching - always fetch fresh data

// Extract first URL from KEV notes field
function parseAdvisoryUrl(notes: string): string {
  const urlMatch = notes.match(/https?:\/\/[^\s;]+/)
  return urlMatch ? urlMatch[0] : ''
}

export async function GET() {
  try {
    // Fetch all threat intelligence feeds
    const feedResult = await fetchAllFeeds()

    // AI Analysis: Analyze energy-relevant items for severity scoring
    const energyItems = feedResult.items.filter(item => item.isEnergyRelevant)
    let aiResults: AIAnalysisResult[] = []

    if (energyItems.length > 0) {
      console.log(`Analyzing ${energyItems.length} energy-relevant items with AI...`)
      aiResults = await analyzeThreatsWithAI(
        energyItems.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          source: item.source,
        }))
      )
      console.log(`AI analysis complete: ${aiResults.length} results`)
    }

    // Merge AI results into threat items
    const aiResultsMap = new Map(aiResults.map(r => [r.id, r]))
    feedResult.items = feedResult.items.map(item => {
      const aiResult = aiResultsMap.get(item.id)
      if (aiResult) {
        return {
          ...item,
          aiSeverityScore: aiResult.severityScore,
          aiThreatType: aiResult.threatType,
          aiUrgency: aiResult.urgency,
          aiAffectedVendors: aiResult.affectedVendors,
          aiAffectedSystems: aiResult.affectedSystems,
          aiAffectedProtocols: aiResult.affectedProtocols,
          aiRationale: aiResult.rationale,
        }
      }
      return item
    })

    // Calculate energy sector score (now uses AI severity scores)
    const scoreResult = calculateEnergyScore(feedResult.items)

    // Count alerts from the past 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const alertsThisWeek = feedResult.items.filter(item => {
      const itemDate = new Date(item.pubDate).getTime()
      return itemDate >= oneWeekAgo
    }).length

    // Count last 24h alerts by category
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const last24hItems = feedResult.items.filter(item => {
      const itemDate = new Date(item.pubDate).getTime()
      return itemDate >= oneDayAgo
    })

    const NATION_STATE_INDICATORS = [
      'volt typhoon', 'sandworm', 'xenotime', 'chernovite', 'kamacite',
      'apt28', 'apt29', 'lazarus', 'kimsuky', 'temp.veles',
      'china', 'russia', 'iran', 'north korea', 'dprk'
    ]
    const ICS_INDICATORS = [
      'scada', 'ics', 'plc', 'hmi', 'rtu', 'dcs',
      'modbus', 'dnp3', 'iec 61850', 'opc',
      'industrial control', 'operational technology'
    ]

    const last24h = {
      kev: last24hItems.filter(item => item.source === 'CISA KEV').length,
      nationState: last24hItems.filter(item => {
        const text = (item.title + ' ' + item.description).toLowerCase()
        return NATION_STATE_INDICATORS.some(indicator => text.includes(indicator))
      }).length,
      ics: last24hItems.filter(item => {
        const text = (item.title + ' ' + item.description).toLowerCase()
        return ICS_INDICATORS.some(indicator => text.includes(indicator))
      }).length,
      total: last24hItems.length
    }

    // Process KEV items for actionable recommendations
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const kevActions = feedResult.kevItems.map(kev => ({
      cveId: kev.cveID,
      vendor: kev.vendorProject,
      product: kev.product,
      dueDate: kev.dueDate,
      dateAdded: kev.dateAdded,
      description: kev.shortDescription,
      advisoryUrl: parseAdvisoryUrl(kev.notes),
      nvdUrl: `https://nvd.nist.gov/vuln/detail/${kev.cveID}`,
      isOverdue: new Date(kev.dueDate) < today,
      ransomwareUse: kev.knownRansomwareCampaignUse === 'Known'
    }))

    // Return combined data
    return NextResponse.json({
      success: true,
      score: scoreResult,
      threats: {
        all: feedResult.items.slice(0, 50),
        energyRelevant: feedResult.items.filter(item => item.isEnergyRelevant).slice(0, 20),
        critical: feedResult.items.filter(item => item.severity === 'critical').slice(0, 20),
      },
      kev: kevActions,
      meta: {
        lastUpdated: feedResult.lastUpdated,
        sourcesOnline: feedResult.sourcesOnline,
        sourcesTotal: feedResult.sourcesTotal,
        totalItems: feedResult.items.length,
        alertsThisWeek,
        last24h,
        errors: feedResult.errors,
      }
    })
  } catch (error) {
    console.error('CAPRI-E API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch threat intelligence',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
