// CAPRI-E Threat Intelligence API Endpoint
import { NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/feeds'
import { calculateEnergyScore } from '@/lib/scoring'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  try {
    // Fetch all threat intelligence feeds
    const feedResult = await fetchAllFeeds()

    // Calculate energy sector score
    const scoreResult = calculateEnergyScore(feedResult.items)

    // Count alerts from the past 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const alertsThisWeek = feedResult.items.filter(item => {
      const itemDate = new Date(item.pubDate).getTime()
      return itemDate >= oneWeekAgo
    }).length

    // Return combined data
    return NextResponse.json({
      success: true,
      score: scoreResult,
      threats: {
        all: feedResult.items.slice(0, 50), // Limit to 50 most recent
        energyRelevant: feedResult.items.filter(item => item.isEnergyRelevant).slice(0, 20),
        critical: feedResult.items.filter(item => item.severity === 'critical').slice(0, 20),
      },
      meta: {
        lastUpdated: feedResult.lastUpdated,
        sourcesOnline: feedResult.sourcesOnline,
        sourcesTotal: feedResult.sourcesTotal,
        totalItems: feedResult.items.length,
        alertsThisWeek,
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