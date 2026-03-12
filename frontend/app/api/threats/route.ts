// CAPRI Threat Intelligence API Endpoint
import { NextRequest, NextResponse } from 'next/server'
import { fetchAllFeeds, ThreatItem } from '@/lib/feeds'
import { fetchAllEnrichment, fetchEPSSScores, getConfiguredEnrichmentCount, EnrichmentKeys } from '@/lib/enrichment'
import { calculateEnergyScore } from '@/lib/scoring'
import { analyzeThreatsWithAI, AIAnalysisResult } from '@/lib/ai-analysis'
import { detectCampaigns } from '@/lib/campaign-correlation'
import { threatActors } from '@/components/globe/worldData'
import { NATION_STATE_INDICATORS, matchesIndicator, matchesICSContext, isEnergyRelevantKEV } from '@/lib/indicators'
import { fetchGridStress } from '@/lib/eia930'
import { buildVendorAlerts } from '@/lib/supply-chain'

export const revalidate = 0 // No caching - always fetch fresh data

// In-memory cache with 1-minute TTL
let cachedResponse: { data: any; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 1000 // 1 minute

// Extract first URL from KEV notes field
function parseAdvisoryUrl(notes: string): string {
  const urlMatch = notes.match(/https?:\/\/[^\s;]+/)
  return urlMatch ? urlMatch[0] : ''
}

export async function GET(request: NextRequest) {
  // Read user-provided enrichment API keys from custom headers
  const userKeys: EnrichmentKeys = {}
  const abuseKey = request.headers.get('X-AbuseIPDB-Key')
  const shodanKey = request.headers.get('X-Shodan-Key')
  const vtKey = request.headers.get('X-VirusTotal-Key')
  const gnKey = request.headers.get('X-GreyNoise-Key')
  if (abuseKey) userKeys.abuseIPDBKey = abuseKey
  if (shodanKey) userKeys.shodanKey = shodanKey
  if (vtKey) userKeys.virusTotalKey = vtKey
  if (gnKey) userKeys.greyNoiseKey = gnKey

  const hasUserKeys = !!(abuseKey || shodanKey || vtKey || gnKey)

  // Check cache first — skip when user-provided keys are present
  if (!hasUserKeys && cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL_MS) {
    const cacheAge = Math.round((Date.now() - cachedResponse.timestamp) / 1000)
    const response = NextResponse.json({ ...cachedResponse.data, meta: { ...cachedResponse.data.meta, cacheAge } })
    response.headers.set('X-Cache', 'HIT')
    return response
  }

  try {
    // Fetch feeds, enrichment, and grid stress in parallel
    const [feedResult, enrichmentResult, gridStressResult] = await Promise.all([
      fetchAllFeeds(),
      fetchAllEnrichment(hasUserKeys ? userKeys : undefined),
      fetchGridStress(),
    ])

    // Merge enrichment items into feed items before deduplication
    const icsExposureCount = enrichmentResult.items.filter(i => i.source === 'Shodan').length
    if (enrichmentResult.items.length > 0) {
      feedResult.items.push(...enrichmentResult.items)
    }

    // Track enrichment errors alongside feed errors
    if (enrichmentResult.errors.length > 0) {
      feedResult.errors.push(...enrichmentResult.errors)
    }

    // Enrich KEV items with EPSS scores (free, no key required)
    const kevCveIds = feedResult.items
      .filter(item => item.source === 'CISA KEV' && item.id.startsWith('KEV-'))
      .map(item => item.id.replace('KEV-', ''))
    const epssScores = await fetchEPSSScores(kevCveIds)
    feedResult.items = feedResult.items.map(item => {
      if (item.source === 'CISA KEV' && item.id.startsWith('KEV-')) {
        const cveId = item.id.replace('KEV-', '')
        const epss = epssScores.get(cveId)
        if (epss) {
          return { ...item, epssScore: epss.epss, epssPercentile: epss.percentile }
        }
      }
      return item
    })

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

    // Detect active campaigns by correlating feed items against actor TTP signatures
    const campaigns = detectCampaigns(feedResult.items, threatActors)
    const activeCampaignCount = campaigns.filter(c => c.confidence === 'high' || c.confidence === 'medium').length

    // Calculate energy sector score (now uses AI severity scores)
    const scoreResult = calculateEnergyScore(feedResult.items)

    // Count alerts from the past 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const alertsThisWeek = feedResult.items.filter(item => {
      const itemDate = new Date(item.pubDate).getTime()
      return itemDate >= oneWeekAgo
    }).length

    // Count last 24h alerts by category
    // Nation-state and ICS count from all items (those indicators ARE energy-relevant)
    // KEV and total count only energy-flagged items
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const last24hAll = feedResult.items.filter(item => {
      return new Date(item.pubDate).getTime() >= oneDayAgo
    })
    const last24hEnergy = last24hAll.filter(item => item.isEnergyRelevant)

    const last24h = {
      kev: last24hEnergy.filter(item => item.source === 'CISA KEV').length,
      nationState: last24hAll.filter(item => {
        const text = item.title + ' ' + item.description
        return NATION_STATE_INDICATORS.some(indicator => matchesIndicator(text, indicator))
      }).length,
      ics: last24hAll.filter(item => {
        const text = item.title + ' ' + item.description
        return matchesICSContext(text)
      }).length,
      total: last24hEnergy.length
    }

    // Process KEV items — filtered to energy-relevant vendors/descriptions only
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const kevActions = feedResult.kevItems
      .filter(kev => isEnergyRelevantKEV(kev.vendorProject, kev.shortDescription || '', kev.product || ''))
      .map(kev => ({
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

    // Build per-vendor alert aggregation from KEVs + AI-extracted vendor mentions
    const vendorAlerts = buildVendorAlerts(kevActions, feedResult.items)

    // Build response data
    const responseData = {
      success: true,
      score: scoreResult,
      threats: {
        all: feedResult.items.slice(0, 50),
        energyRelevant: feedResult.items.filter(item => item.isEnergyRelevant).slice(0, 20),
        critical: feedResult.items.filter(item => item.severity === 'critical').slice(0, 20),
      },
      campaigns,
      gridStress: gridStressResult.entries,
      kev: kevActions,
      vendorAlerts,
      meta: {
        lastUpdated: feedResult.lastUpdated,
        sourcesOnline: feedResult.sourcesOnline + enrichmentResult.sourcesOnline,
        sourcesTotal: feedResult.sourcesTotal + enrichmentResult.sourcesTotal,
        totalItems: feedResult.items.length,
        deduplicatedCount: feedResult.deduplicatedCount || 0,
        alertsThisWeek,
        activeCampaigns: activeCampaignCount,
        last24h,
        errors: feedResult.errors,
        vendorAlertCount: vendorAlerts.filter(v => v.kevCount > 0).length,
        cacheAge: 0,
        enrichmentSources: {
          configured: getConfiguredEnrichmentCount(hasUserKeys ? userKeys : undefined).configured,
          total: getConfiguredEnrichmentCount(hasUserKeys ? userKeys : undefined).total,
          online: enrichmentResult.sourcesOnline,
        },
        icsExposure: {
          count: icsExposureCount,
          hasShodanKey: !!(shodanKey || process.env.SHODAN_API_KEY),
        },
      }
    }

    // Store in cache only when not using user-provided keys
    if (!hasUserKeys) {
      cachedResponse = { data: responseData, timestamp: Date.now() }
    }

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
