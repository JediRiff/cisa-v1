import { NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/feeds'
import { calculateEnergyScore } from '@/lib/scoring'
import { NATION_STATE_INDICATORS, ICS_INDICATORS, matchesIndicator } from '@/lib/indicators'

export const revalidate = 0

export async function GET() {
  const feedResult = await fetchAllFeeds()
  const items = feedResult.items

  // Use the production scoring function
  const scoreResult = calculateEnergyScore(items)

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentItems = items.filter(item => new Date(item.pubDate) >= thirtyDaysAgo)
  const veryRecentItems = items.filter(item => new Date(item.pubDate) >= sevenDaysAgo)

  // Detect double-counted items (items that match multiple factor categories)
  const doubleCountedItems: { id: string; title: string; factors: string[] }[] = []
  recentItems.forEach(item => {
    const factors: string[] = []
    const text = item.title + ' ' + item.description

    if (item.source === 'CISA KEV') factors.push('KEV')
    if (NATION_STATE_INDICATORS.some(i => matchesIndicator(text, i))) factors.push('Nation-State')
    if (ICS_INDICATORS.some(i => matchesIndicator(text, i))) factors.push('ICS')
    if (item.sourceType === 'vendor' && (item.severity === 'critical' || item.severity === 'high')) factors.push('Vendor-Critical')

    if (factors.length > 1) {
      doubleCountedItems.push({ id: item.id, title: item.title.substring(0, 80), factors })
    }
  })

  // Derive factor breakdown from production scoring output
  const totalDeduction = scoreResult.factors.reduce((sum, f) => sum + f.impact, 0)

  return NextResponse.json({
    score: {
      starting: 5.0,
      final: scoreResult.score,
      label: scoreResult.label,
      totalDeduction,
    },
    factors: Object.fromEntries(
      scoreResult.factors.map(f => [
        f.name.toLowerCase().replace(/[^a-z]+/g, '_'),
        {
          count: f.count,
          impact: f.impact,
          maxImpact: f.maxImpact,
          weight: f.weight,
          maxed: Math.abs(f.impact) >= Math.abs(f.maxImpact) - 0.01,
          items: f.items.slice(0, 10).map(i => i.title.substring(0, 60)),
        },
      ])
    ),
    doubleCountedItems: doubleCountedItems.slice(0, 20),
    meta: {
      totalItems: items.length,
      recentItems30d: recentItems.length,
      recentItems7d: veryRecentItems.length,
      methodology: scoreResult.methodology,
    },
  })
}
