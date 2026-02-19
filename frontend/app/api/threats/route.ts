// CAPRI Threat Intelligence API Endpoint
import { NextResponse } from 'next/server'
import { fetchAllFeeds, ThreatItem } from '@/lib/feeds'
import { calculateEnergyScore } from '@/lib/scoring'
import { analyzeThreatsWithAI, AIAnalysisResult } from '@/lib/ai-analysis'

export const revalidate = 0 // No caching - always fetch fresh data

// Calculate weekly threat activity for trend visualization
// Returns threat counts per week for the last 4 weeks
function calculateWeeklyTrend(items: ThreatItem[]): { week: string; threats: number; energyThreats: number; kevCount: number }[] {
  const now = Date.now()
  const weeks: { week: string; threats: number; energyThreats: number; kevCount: number }[] = []

  for (let i = 3; i >= 0; i--) {
    const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000
    const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000

    const weekItems = items.filter(item => {
      const itemDate = new Date(item.pubDate).getTime()
      return itemDate >= weekStart && itemDate < weekEnd
    })

    const weekLabel = new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    weeks.push({
      week: weekLabel,
      threats: weekItems.length,
      energyThreats: weekItems.filter(item => item.isEnergyRelevant).length,
      kevCount: weekItems.filter(item => item.source === 'CISA KEV').length,
    })
  }

  return weeks
}

// In-memory cache with 1-minute TTL
let cachedResponse: { data: any; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 1000 // 1 minute

// Extract first URL from KEV notes field
function parseAdvisoryUrl(notes: string): string {
  const urlMatch = notes.match(/https?:\/\/[^\s;]+/)
  return urlMatch ? urlMatch[0] : ''
}

export async function GET() {
  // Check cache first
  if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL_MS) {
    const cacheAge = Math.round((Date.now() - cachedResponse.timestamp) / 1000)
    const response = NextResponse.json({ ...cachedResponse.data, meta: { ...cachedResponse.data.meta, cacheAge } })
    response.headers.set('X-Cache', 'HIT')
    return response
  }

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
      'volt typhoon', 'salt typhoon', 'flax typhoon',
      'sandworm', 'dragonfly', 'energetic bear', 'turla', 'fancy bear', 'cozy bear',
      'xenotime', 'chernovite', 'kamacite',
      'apt28', 'apt29', 'apt33', 'apt34', 'apt35', 'apt41',
      'lazarus', 'kimsuky', 'andariel',
      'cyberav3ngers', 'muddywater', 'oilrig', 'charming kitten',
      'temp.veles', 'mango sandstorm', 'hazel sandstorm',
      'china', 'russia', 'iran', 'north korea', 'dprk'
    ]
    const ICS_INDICATORS = [
      'scada', 'ics', 'plc', 'hmi', 'rtu', 'dcs',
      'modbus', 'dnp3', 'iec 61850', 'iec 104', 'iec 60870', 'opc', 'opc ua',
      'bacnet', 'profinet', 'ethernet/ip',
      'industrial control', 'operational technology',
      'siemens', 'schneider electric', 'rockwell', 'honeywell', 'unitronics',
      'industroyer', 'crashoverride', 'havex', 'pipedream', 'incontroller',
      'frostygoop', 'cosmicenergy', 'triton', 'trisis'
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

    // Calculate weekly trend for visualization
    const weeklyTrend = calculateWeeklyTrend(feedResult.items)

    // Build response data
    const responseData = {
      success: true,
      score: scoreResult,
      threats: {
        all: feedResult.items.slice(0, 50),
        energyRelevant: feedResult.items.filter(item => item.isEnergyRelevant).slice(0, 20),
        critical: feedResult.items.filter(item => item.severity === 'critical').slice(0, 20),
      },
      kev: kevActions,
      trend: weeklyTrend,
      meta: {
        lastUpdated: feedResult.lastUpdated,
        sourcesOnline: feedResult.sourcesOnline,
        sourcesTotal: feedResult.sourcesTotal,
        totalItems: feedResult.items.length,
        deduplicatedCount: feedResult.deduplicatedCount || 0,
        alertsThisWeek,
        last24h,
        errors: feedResult.errors,
        cacheAge: 0,
      }
    }

    // Store in cache
    cachedResponse = { data: responseData, timestamp: Date.now() }

    const response = NextResponse.json(responseData)
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    console.error('CAPRI-E API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch threat intelligence',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
