import { NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/feeds'

export const revalidate = 0

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

export async function GET() {
  const feedResult = await fetchAllFeeds()
  const items = feedResult.items

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentItems = items.filter(item => new Date(item.pubDate) >= thirtyDaysAgo)
  const veryRecentItems = items.filter(item => new Date(item.pubDate) >= sevenDaysAgo)

  // Factor 1: KEVs
  const recentKEVs = veryRecentItems.filter(item =>
    item.source === 'CISA KEV' && item.severity === 'critical'
  )

  // Factor 2: Energy threats
  const energyThreats = recentItems.filter(item => item.isEnergyRelevant)

  // Word-boundary matching for accuracy
  const regexCache = new Map<string, RegExp>()
  const matchesIndicator = (text: string, indicator: string): boolean => {
    let regex = regexCache.get(indicator)
    if (!regex) {
      const escaped = indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      regex = new RegExp(`\\b${escaped}\\b`, 'i')
      regexCache.set(indicator, regex)
    }
    return regex.test(text)
  }

  // Factor 3: Nation-state
  const nationStateThreats = recentItems.filter(item => {
    const text = item.title + ' ' + item.description
    return NATION_STATE_INDICATORS.some(indicator => matchesIndicator(text, indicator))
  })

  // Factor 4: ICS/SCADA
  const icsThreats = recentItems.filter(item => {
    const text = item.title + ' ' + item.description
    return ICS_INDICATORS.some(indicator => matchesIndicator(text, indicator))
  })

  // Factor 5: Vendor critical
  const criticalVendorItems = veryRecentItems.filter(item =>
    item.sourceType === 'vendor' && item.severity === 'critical'
  )

  // Check for double-counting
  const doubleCountedItems: { id: string; title: string; factors: string[] }[] = []

  recentItems.forEach(item => {
    const factors: string[] = []
    const text = item.title + ' ' + item.description

    if (item.source === 'CISA KEV') factors.push('KEV')
    if (item.isEnergyRelevant) factors.push('Energy')
    if (NATION_STATE_INDICATORS.some(i => matchesIndicator(text, i))) factors.push('Nation-State')
    if (ICS_INDICATORS.some(i => matchesIndicator(text, i))) factors.push('ICS')
    if (item.sourceType === 'vendor' && item.severity === 'critical') factors.push('Vendor-Critical')

    if (factors.length > 1) {
      doubleCountedItems.push({ id: item.id, title: item.title.substring(0, 80), factors })
    }
  })

  // Calculate score impact
  const kevImpact = Math.min(recentKEVs.length * 0.3, 1.5)
  const energyImpact = Math.min(energyThreats.length * 0.2, 1.0)
  const nationStateImpact = Math.min(nationStateThreats.length * 0.4, 1.2)
  const icsImpact = Math.min(icsThreats.length * 0.3, 0.9)
  const vendorImpact = Math.min(criticalVendorItems.length * 0.15, 0.6)
  const totalImpact = kevImpact + energyImpact + nationStateImpact + icsImpact + vendorImpact
  const finalScore = Math.max(1.0, 5.0 - totalImpact)

  return NextResponse.json({
    score: {
      starting: 5.0,
      final: finalScore,
      totalDeduction: -totalImpact
    },
    factors: {
      kev: {
        count: recentKEVs.length,
        impact: -kevImpact,
        maxed: kevImpact >= 1.5,
        items: recentKEVs.map(i => i.title.substring(0, 60))
      },
      energy: {
        count: energyThreats.length,
        impact: -energyImpact,
        maxed: energyImpact >= 1.0,
        items: energyThreats.slice(0, 10).map(i => i.title.substring(0, 60))
      },
      nationState: {
        count: nationStateThreats.length,
        impact: -nationStateImpact,
        maxed: nationStateImpact >= 1.2,
        items: nationStateThreats.slice(0, 10).map(i => ({
          title: i.title.substring(0, 60),
          matchedOn: NATION_STATE_INDICATORS.find(ind =>
            (i.title + ' ' + i.description).toLowerCase().includes(ind)
          )
        }))
      },
      ics: {
        count: icsThreats.length,
        impact: -icsImpact,
        maxed: icsImpact >= 0.9,
        items: icsThreats.slice(0, 10).map(i => i.title.substring(0, 60))
      },
      vendorCritical: {
        count: criticalVendorItems.length,
        impact: -vendorImpact,
        maxed: vendorImpact >= 0.6,
        items: criticalVendorItems.map(i => i.title.substring(0, 60))
      }
    },
    doubleCountedItems: doubleCountedItems.slice(0, 20),
    meta: {
      totalItems: items.length,
      recentItems30d: recentItems.length,
      recentItems7d: veryRecentItems.length
    }
  })
}
