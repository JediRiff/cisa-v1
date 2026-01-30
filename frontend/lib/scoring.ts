// CAPRI-E Energy Sector Scoring Algorithm
// Scale: 1 = Severe (highest risk), 5 = Normal (lowest risk)
// OPEN SOURCE: All weights and methodology are transparent

import { ThreatItem } from './feeds'

// ============================================
// SCORING WEIGHTS - OPEN SOURCE & TRANSPARENT
// ============================================
// These weights determine how much each factor impacts the score.
// Base score starts at 5.0 (Normal), deductions lower it toward 1.0 (Severe)

export const SCORING_WEIGHTS = {
  kevEntry: {
    name: 'CISA KEV Entry',
    perItem: -0.3,
    maxImpact: -1.5,
    timeWindow: '7 days',
    rationale: 'Known Exploited Vulnerabilities indicate active exploitation in the wild'
  },
  energyThreat: {
    name: 'Energy Sector Threat',
    perItem: -0.2,
    maxImpact: -1.0,
    timeWindow: '30 days',
    rationale: 'Threats specifically mentioning energy, grid, SCADA, or critical infrastructure'
  },
  nationState: {
    name: 'Nation-State Activity',
    perItem: -0.4,
    maxImpact: -1.2,
    timeWindow: '30 days',
    rationale: 'Reports involving Volt Typhoon, Sandworm, or other nation-state actors targeting infrastructure'
  },
  icsScada: {
    name: 'ICS/SCADA Vulnerability',
    perItem: -0.3,
    maxImpact: -0.9,
    timeWindow: '30 days',
    rationale: 'Industrial control system vulnerabilities directly impact energy operations'
  },
  vendorCritical: {
    name: 'Vendor Critical Alert',
    perItem: -0.15,
    maxImpact: -0.6,
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

export interface ScoreFactor {
  name: string
  impact: number
  count: number
  description: string
  weight: number
  maxImpact: number
}

// Nation-state actors known to target energy sector
const NATION_STATE_INDICATORS = [
  'volt typhoon', 'sandworm', 'xenotime', 'chernovite', 'kamacite',
  'apt28', 'apt29', 'lazarus', 'kimsuky', 'temp.veles',
  'china', 'russia', 'iran', 'north korea', 'dprk'
]

// ICS/SCADA specific terms
const ICS_INDICATORS = [
  'scada', 'ics', 'plc', 'hmi', 'rtu', 'dcs',
  'modbus', 'dnp3', 'iec 61850', 'opc',
  'industrial control', 'operational technology'
]

export function calculateEnergyScore(items: ThreatItem[]): ScoreResult {
  let score = 5.0 // Start at Normal
  const factors: ScoreFactor[] = []

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Filter to recent items
  const recentItems = items.filter(item => new Date(item.pubDate) >= thirtyDaysAgo)
  const veryRecentItems = items.filter(item => new Date(item.pubDate) >= sevenDaysAgo)

  // Factor 1: Critical KEVs in last 7 days (-0.3 each, max -1.5)
  const recentKEVs = veryRecentItems.filter(item =>
    item.source === 'CISA KEV' && item.severity === 'critical'
  )
  if (recentKEVs.length > 0) {
    const impact = Math.min(recentKEVs.length * 0.3, 1.5)
    score -= impact
    factors.push({
      name: 'Recent KEV Entries',
      impact: -impact,
      count: recentKEVs.length,
      description: 'Actively exploited vulnerabilities added to CISA KEV in last 7 days',
      weight: SCORING_WEIGHTS.kevEntry.perItem,
      maxImpact: SCORING_WEIGHTS.kevEntry.maxImpact
    })
  }

  // Factor 2: Energy-relevant threats (-0.2 each, max -1.0)
  const energyThreats = recentItems.filter(item => item.isEnergyRelevant)
  if (energyThreats.length > 0) {
    const impact = Math.min(energyThreats.length * 0.2, 1.0)
    score -= impact
    factors.push({
      name: 'Energy Sector Threats',
      impact: -impact,
      count: energyThreats.length,
      description: 'Threats specifically targeting energy/critical infrastructure',
      weight: SCORING_WEIGHTS.energyThreat.perItem,
      maxImpact: SCORING_WEIGHTS.energyThreat.maxImpact
    })
  }

  // Factor 3: Nation-state activity (-0.4 each, max -1.2)
  const nationStateThreats = recentItems.filter(item => {
    const text = (item.title + ' ' + item.description).toLowerCase()
    return NATION_STATE_INDICATORS.some(indicator => text.includes(indicator))
  })
  if (nationStateThreats.length > 0) {
    const impact = Math.min(nationStateThreats.length * 0.4, 1.2)
    score -= impact
    factors.push({
      name: 'Nation-State Activity',
      impact: -impact,
      count: nationStateThreats.length,
      description: 'Reports of nation-state actors (Volt Typhoon, Sandworm, etc.)',
      weight: SCORING_WEIGHTS.nationState.perItem,
      maxImpact: SCORING_WEIGHTS.nationState.maxImpact
    })
  }

  // Factor 4: ICS/SCADA vulnerabilities (-0.3 each, max -0.9)
  const icsThreats = recentItems.filter(item => {
    const text = (item.title + ' ' + item.description).toLowerCase()
    return ICS_INDICATORS.some(indicator => text.includes(indicator))
  })
  if (icsThreats.length > 0) {
    const impact = Math.min(icsThreats.length * 0.3, 0.9)
    score -= impact
    factors.push({
      name: 'ICS/SCADA Vulnerabilities',
      impact: -impact,
      count: icsThreats.length,
      description: 'Industrial control system specific threats',
      weight: SCORING_WEIGHTS.icsScada.perItem,
      maxImpact: SCORING_WEIGHTS.icsScada.maxImpact
    })
  }

  // Factor 5: Critical severity items from vendors (-0.15 each, max -0.6)
  const criticalVendorItems = veryRecentItems.filter(item =>
    item.sourceType === 'vendor' && item.severity === 'critical'
  )
  if (criticalVendorItems.length > 0) {
    const impact = Math.min(criticalVendorItems.length * 0.15, 0.6)
    score -= impact
    factors.push({
      name: 'Vendor Critical Alerts',
      impact: -impact,
      count: criticalVendorItems.length,
      description: 'Critical severity reports from security vendors',
      weight: SCORING_WEIGHTS.vendorCritical.perItem,
      maxImpact: SCORING_WEIGHTS.vendorCritical.maxImpact
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

  // Generate summary
  const summary = generateSummary(score, energyThreats.length, recentKEVs.length)

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