// CAPRI-E Energy Sector Scoring Algorithm
// Scale: 1 = Severe (highest risk), 5 = Normal (lowest risk)
// OPEN SOURCE: All weights and methodology are transparent

import { ThreatItem } from './feeds'
import { NATION_STATE_INDICATORS, matchesIndicator, matchesICSContext } from './indicators'

// ============================================
// SCORING WEIGHTS - OPEN SOURCE & TRANSPARENT
// ============================================
// These weights determine how much each factor impacts the score.
// Base score starts at 5.0 (Normal), deductions lower it toward 1.0 (Severe)

export const SCORING_WEIGHTS = {
  nationState: {
    name: 'Nation-State Activity',
    perItem: -0.4,
    maxImpact: -0.8,
    timeWindow: '30 days',
    rationale: 'Reports involving Volt Typhoon, Sandworm, or other nation-state actors targeting infrastructure'
  },
  kevEntry: {
    name: 'CISA KEV Entries',
    perItem: -0.3,
    maxImpact: -1.2,
    timeWindow: '7 days',
    rationale: 'Known Exploited Vulnerabilities indicate active exploitation in the wild'
  },
  icsScada: {
    name: 'ICS/SCADA Vulnerabilities',
    perItem: -0.3,
    maxImpact: -0.6,
    timeWindow: '30 days',
    rationale: 'Industrial control system vulnerabilities directly impact energy operations'
  },
  vendorCritical: {
    name: 'Vendor Critical Alerts',
    perItem: -0.15,
    maxImpact: -0.4,
    timeWindow: '7 days',
    rationale: 'Critical severity reports from Microsoft, CrowdStrike, Unit42, etc.'
  }
}

export const SCORE_THRESHOLDS = {
  severe: { max: 2.0, color: '#d92525', label: 'Severe' },
  elevated: { max: 3.0, color: '#f59e0b', label: 'Elevated' },
  normal: { max: 5.0, color: '#16a34a', label: 'Normal' }
}

export interface ScoreResult {
  score: number
  label: 'Severe' | 'Elevated' | 'Normal'
  color: string
  factors: ScoreFactor[]
  summary: string
  methodology: typeof SCORING_WEIGHTS
  thresholds: typeof SCORE_THRESHOLDS
}

export interface FactorItem {
  id: string
  title: string
  link: string
  source: string
  pubDate: string
}

export interface ScoreFactor {
  name: string
  impact: number
  count: number
  description: string
  weight: number
  maxImpact: number
  items: FactorItem[]
}

// Temporal decay: newer threats weigh more than older ones
function getTemporalDecay(pubDate: string): number {
  const ageMs = Date.now() - new Date(pubDate).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays <= 3) return 1.0    // 0-3 days: full weight
  if (ageDays <= 7) return 0.75   // 4-7 days: 75%
  if (ageDays <= 14) return 0.5   // 8-14 days: 50%
  return 0.25                      // 15-30 days: 25%
}

export function calculateEnergyScore(items: ThreatItem[]): ScoreResult {
  let score = 5.0 // Start at Normal
  const factors: ScoreFactor[] = []
  const usedItemIds = new Set<string>() // Track items to prevent double-counting

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ENERGY RELEVANCE GATE: Only score items flagged as energy-relevant
  const energyItems = items.filter(item => item.isEnergyRelevant)

  // Filter to recent energy-relevant items
  const recentItems = energyItems.filter(item => new Date(item.pubDate) >= thirtyDaysAgo)
  const veryRecentItems = energyItems.filter(item => new Date(item.pubDate) >= sevenDaysAgo)

  // Helper to map items for factor output
  const mapItems = (items: ThreatItem[]) => items.slice(0, 10).map(item => ({
    id: item.id, title: item.title, link: item.link, source: item.source, pubDate: item.pubDate
  }))

  // Process factors in priority order (highest per-item impact first)
  // Items are assigned to their highest-impact category via usedItemIds

  // ── Factor 1: Nation-State Activity (-0.4 each, max -0.8) ──
  const nationStateThreats = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const text = item.title + ' ' + item.description
    const matches = NATION_STATE_INDICATORS.some(indicator => matchesIndicator(text, indicator))
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  {
    const decayedImpact = nationStateThreats.reduce((sum, item) => sum + (0.4 * getTemporalDecay(item.pubDate)), 0)
    const impact = Math.min(decayedImpact, 0.8)
    score -= impact
    factors.push({
      name: 'Nation-State Activity',
      impact: -impact,
      count: nationStateThreats.length,
      description: 'Reports of nation-state actors (Volt Typhoon, Sandworm, etc.) — time-weighted',
      weight: SCORING_WEIGHTS.nationState.perItem,
      maxImpact: SCORING_WEIGHTS.nationState.maxImpact,
      items: mapItems(nationStateThreats)
    })
  }

  // ── Factor 2: CISA KEV Entries (-0.3 each, max -1.2, weighted by EPSS) ──
  const recentKEVs = veryRecentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const matches = item.source === 'CISA KEV' && item.severity === 'critical'
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  {
    const decayedImpact = recentKEVs.reduce((sum, item) => {
      const baseWeight = 0.3
      // Weight by EPSS score: high EPSS = full deduction, low = reduced
      let epssMultiplier = 1.0 // Default full weight when no EPSS data
      if (item.epssScore !== undefined) {
        if (item.epssScore >= 0.5) epssMultiplier = 1.0      // High exploitation probability
        else if (item.epssScore >= 0.1) epssMultiplier = 0.7  // Moderate probability
        else epssMultiplier = 0.4                              // Low probability
      }
      return sum + (baseWeight * epssMultiplier * getTemporalDecay(item.pubDate))
    }, 0)
    const impact = Math.min(decayedImpact, 1.2)
    score -= impact
    factors.push({
      name: 'CISA KEV Entries',
      impact: -impact,
      count: recentKEVs.length,
      description: 'Actively exploited vulnerabilities weighted by EPSS exploitation probability — time-weighted',
      weight: SCORING_WEIGHTS.kevEntry.perItem,
      maxImpact: SCORING_WEIGHTS.kevEntry.maxImpact,
      items: mapItems(recentKEVs)
    })
  }

  // ── Factor 3: ICS/SCADA Vulnerabilities (-0.3 each, max -0.6) ──
  // Context-aware: vendor names only match when paired with ICS terms
  const icsThreats = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const text = item.title + ' ' + item.description
    const matches = matchesICSContext(text)
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  {
    const decayedImpact = icsThreats.reduce((sum, item) => sum + (0.3 * getTemporalDecay(item.pubDate)), 0)
    const impact = Math.min(decayedImpact, 0.6)
    score -= impact
    factors.push({
      name: 'ICS/SCADA Vulnerabilities',
      impact: -impact,
      count: icsThreats.length,
      description: 'Industrial control system specific threats — time-weighted',
      weight: SCORING_WEIGHTS.icsScada.perItem,
      maxImpact: SCORING_WEIGHTS.icsScada.maxImpact,
      items: mapItems(icsThreats)
    })
  }

  // ── Factor 4: Vendor Critical Alerts (-0.15 each, max -0.4) ──
  const criticalVendorItems = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const matches = item.sourceType === 'vendor' && (item.severity === 'critical' || item.severity === 'high')
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  {
    const decayedImpact = criticalVendorItems.reduce((sum, item) => sum + (0.15 * getTemporalDecay(item.pubDate)), 0)
    const impact = Math.min(decayedImpact, 0.4)
    score -= impact
    factors.push({
      name: 'Vendor Critical Alerts',
      impact: -impact,
      count: criticalVendorItems.length,
      description: 'Critical severity reports from security vendors — time-weighted',
      weight: SCORING_WEIGHTS.vendorCritical.perItem,
      maxImpact: SCORING_WEIGHTS.vendorCritical.maxImpact,
      items: mapItems(criticalVendorItems)
    })
  }

  // Ensure score stays in bounds
  score = Math.max(1.0, Math.min(5.0, score))
  score = Math.round(score * 10) / 10 // Round to 1 decimal

  // Determine label and color
  let label: ScoreResult['label']
  let color: string

  if (score <= 2.0) {
    label = 'Severe'
    color = '#d92525'
  } else if (score <= 3.0) {
    label = 'Elevated'
    color = '#f59e0b'
  } else {
    label = 'Normal'
    color = '#16a34a'
  }

  // Generate summary (all recentItems are already energy-relevant)
  const summary = generateSummary(score, recentItems.length, recentKEVs.length)

  return {
    score,
    label,
    color,
    factors,
    summary,
    methodology: SCORING_WEIGHTS,
    thresholds: SCORE_THRESHOLDS
  }
}

function generateSummary(
  score: number,
  energyThreats: number,
  kevCount: number
): string {
  if (score <= 2.0) {
    return `SEVERE: Active threats targeting energy sector detected. ${kevCount} new KEV entries and ${energyThreats} energy-specific threats in the past 30 days. Immediate attention recommended.`
  } else if (score <= 3.0) {
    return `ELEVATED: Heightened threat activity observed. ${energyThreats} energy-relevant threats detected. Enhanced monitoring recommended for energy infrastructure.`
  } else if (score <= 4.0) {
    return `NORMAL: Baseline threat level for energy sector. Continue standard monitoring and patch management procedures.`
  } else {
    return `NORMAL: Low threat activity for energy sector. Maintain routine security posture and awareness.`
  }
}

export function getScoreColor(score: number): string {
  if (score <= 2.0) return '#d92525'
  if (score <= 3.0) return '#f59e0b'
  return '#16a34a'
}

export function getScoreLabel(score: number): string {
  if (score <= 2.0) return 'Severe'
  if (score <= 3.0) return 'Elevated'
  return 'Normal'
}