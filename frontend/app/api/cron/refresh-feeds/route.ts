// CAPRI Cron: Refresh Feeds & Warm Cache
// Vercel cron job — runs every 15 minutes to pre-warm the threat feed cache.
// Protected by CRON_SECRET (Vercel injects this in the Authorization header).

import { NextRequest, NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/feeds'
import { classifyThreatBySector } from '@/lib/sector-keywords'
import { classifySeverity } from '@/lib/severity'

export const runtime = 'nodejs'
export const maxDuration = 60 // seconds — feeds can be slow

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends "Bearer <CRON_SECRET>" in Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    const feedResult = await fetchAllFeeds()

    // Re-classify severity with the unified classifier (mirrors the threats API route)
    const items = feedResult.items.map(item => ({
      ...item,
      severity: classifySeverity({
        title: item.title,
        description: item.description,
        source: item.source,
        sourceType: item.sourceType,
      }),
    }))

    // Severity distribution
    const severityDist: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    }
    for (const item of items) {
      severityDist[item.severity] = (severityDist[item.severity] || 0) + 1
    }

    // Sector coverage — count items per sector
    const sectorCoverage: Record<string, number> = {}
    for (const item of items) {
      const sectors = item.sectors || classifyThreatBySector(item.title, item.description)
      for (const sector of sectors) {
        sectorCoverage[sector] = (sectorCoverage[sector] || 0) + 1
      }
    }

    // Freshness — count items from last 6, 24, and 72 hours
    const now = Date.now()
    const freshness = {
      last6h: items.filter(i => now - new Date(i.pubDate).getTime() < 6 * 60 * 60 * 1000).length,
      last24h: items.filter(i => now - new Date(i.pubDate).getTime() < 24 * 60 * 60 * 1000).length,
      last72h: items.filter(i => now - new Date(i.pubDate).getTime() < 72 * 60 * 60 * 1000).length,
    }

    const durationMs = Date.now() - startTime

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      totalItems: items.length,
      energyRelevant: items.filter(i => i.isEnergyRelevant).length,
      deduplicatedCount: feedResult.deduplicatedCount,
      sourcesOnline: feedResult.sourcesOnline,
      sourcesTotal: feedResult.sourcesTotal,
      severityDistribution: severityDist,
      sectorCoverage,
      freshness,
      errors: feedResult.errors,
    }

    console.log('[CAPRI Cron] Feed refresh complete:', JSON.stringify(summary, null, 2))

    return NextResponse.json(summary)
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('[CAPRI Cron] Feed refresh failed:', error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        durationMs,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
