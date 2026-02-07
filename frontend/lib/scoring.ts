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
    maxImpact: -1.2,  // Reduced from -1.5 for better dynamic range
    timeWindow: '7 days',
    rationale: 'Known Exploited Vulnerabilities indicate active exploitation in the wild'
  },
  energyThreat: {
    name: 'AI-Assessed Energy Threats',
    perItem: -0.1,  // Base, actual impact varies by AI severity (0.1-0.4)
    maxImpact: -0.8,
    timeWindow: '30 days',
    rationale: 'AI-analyzed threats with graduated impact based on energy sector relevance (severity 9-10: -0.4, 7-8: -0.3, 5-6: -0.2, 3-4: -0.1)'
  },
  nationState: {
    name: 'Nation-State Activity',
    perItem: -0.4,
    maxImpact: -0.8,  // Reduced from -1.2 for better dynamic range
    timeWindow: '30 days',
    rationale: 'Reports involving Volt Typhoon, Sandworm, or other nation-state actors targeting infrastructure'
  },
  icsScada: {
    name: 'ICS/SCADA Vulnerability',
    perItem: -0.3,
    maxImpact: -0.6,  // Reduced from -0.9 for better dynamic range
    timeWindow: '30 days',
    rationale: 'Industrial control system vulnerabilities directly impact energy operations'
  },
  vendorCritical: {
    name: 'Vendor Critical Alert',
    perItem: -0.15,
    maxImpact: -0.4,  // Reduced from -0.6 for better dynamic range
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
  const usedItemIds = new Set<string>() // Track items to prevent double-counting

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Filter to recent items
  const recentItems = items.filter(item => new Date(item.pubDate) >= thirtyDaysAgo)
  const veryRecentItems = items.filter(item => new Date(item.pubDate) >= sevenDaysAgo)

  // Process factors in order of per-item impact (highest first)
  // This ensures items are assigned to their highest-impact category

  // Factor 1: Nation-state activity (-0.4 each, max -0.8) - HIGHEST IMPACT
  const nationStateThreats = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const text = (item.title + ' ' + item.description).toLowerCase()
    const matches = NATION_STATE_INDICATORS.some(indicator => text.includes(indicator))
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  if (nationStateThreats.length > 0) {
    const impact = Math.min(nationStateThreats.length * 0.4, 0.8)
    score -= impact
    factors.push({
      name: 'Nation-State Activity',
      impact: -impact,
      count: nationStateThreats.length,
      description: 'Reports of nation-state actors (Volt Typhoon, Sandworm, etc.)',
      weight: SCORING_WEIGHTS.nationState.perItem,
      maxImpact: SCORING_WEIGHTS.nationState.maxImpact,
      items: nationStateThreats.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate
      }))
    })
  }

  // Factor 2: Critical KEVs in last 7 days (-0.3 each, max -1.2)
  const recentKEVs = veryRecentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const matches = item.source === 'CISA KEV' && item.severity === 'critical'
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  if (recentKEVs.length > 0) {
    const impact = Math.min(recentKEVs.length * 0.3, 1.2)
    score -= impact
    factors.push({
      name: 'Recent KEV Entries',
      impact: -impact,
      count: recentKEVs.length,
      description: 'Actively exploited vulnerabilities added to CISA KEV in last 7 days',
      weight: SCORING_WEIGHTS.kevEntry.perItem,
      maxImpact: SCORING_WEIGHTS.kevEntry.maxImpact,
      items: recentKEVs.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate
      }))
    })
  }

  // Factor 3: ICS/SCADA vulnerabilities (-0.3 each, max -0.6)
  const icsThreats = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const text = (item.title + ' ' + item.description).toLowerCase()
    const matches = ICS_INDICATORS.some(indicator => text.includes(indicator))
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  if (icsThreats.length > 0) {
    const impact = Math.min(icsThreats.length * 0.3, 0.6)
    score -= impact
    factors.push({
      name: 'ICS/SCADA Vulnerabilities',
      impact: -impact,
      count: icsThreats.length,
      description: 'Industrial control system specific threats',
      weight: SCORING_WEIGHTS.icsScada.perItem,
      maxImpact: SCORING_WEIGHTS.icsScada.maxImpact,
      items: icsThreats.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate
      }))
    })
  }

  // Factor 4: AI-Assessed Energy Threats (graduated impact based on AI severity score)
  // Items with aiSeverityScore: 9-10 = -0.4, 7-8 = -0.3, 5-6 = -0.2, 3-4 = -0.1, 1-2 = 0
  const aiAnalyzedThreats = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    // Only count items that have AI analysis and score >= 3 (not false positives)
    const hasValidAIScore = item.aiSeverityScore !== undefined && item.aiSeverityScore >= 3
    if (hasValidAIScore) usedItemIds.add(item.id)
    return hasValidAIScore
  })
  if (aiAnalyzedThreats.length > 0) {
    // Calculate graduated impact based on AI severity scores
    let totalImpact = 0
    for (const item of aiAnalyzedThreats) {
      const aiScore = item.aiSeverityScore || 5
      if (aiScore >= 9) totalImpact += 0.4       // Critical
      else if (aiScore >= 7) totalImpact += 0.3 // Direct threat
      else if (aiScore >= 5) totalImpact += 0.2 // Relevant
      else if (aiScore >= 3) totalImpact += 0.1 // Tangential
      // Score 1-2 = 0 (false positive, already filtered out)
    }
    const impact = Math.min(totalImpact, 0.8)
    score -= impact
    factors.push({
      name: 'AI-Assessed Energy Threats',
      impact: -impact,
      count: aiAnalyzedThreats.length,
      description: 'AI-analyzed threats with graduated severity scoring',
      weight: SCORING_WEIGHTS.energyThreat.perItem,
      maxImpact: SCORING_WEIGHTS.energyThreat.maxImpact,
      items: aiAnalyzedThreats.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate
      }))
    })
  }

  // Fallback: Energy-relevant threats without AI analysis (keyword-based, lower impact)
  const keywordOnlyThreats = recentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    // Only items with keyword match but NO AI analysis
    const matches = item.isEnergyRelevant && item.aiSeverityScore === undefined
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  if (keywordOnlyThreats.length > 0) {
    const impact = Math.min(keywordOnlyThreats.length * 0.1, 0.3) // Lower impact for keyword-only
    score -= impact
    factors.push({
      name: 'Energy Sector Keywords (Pending AI)',
      impact: -impact,
      count: keywordOnlyThreats.length,
      description: 'Keyword-matched items awaiting AI analysis',
      weight: -0.1,
      maxImpact: -0.3,
      items: keywordOnlyThreats.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate
      }))
    })
  }

  // Factor 5: Critical severity items from vendors (-0.15 each, max -0.4) - LOWEST IMPACT
  const criticalVendorItems = veryRecentItems.filter(item => {
    if (usedItemIds.has(item.id)) return false
    const matches = item.sourceType === 'vendor' && item.severity === 'critical'
    if (matches) usedItemIds.add(item.id)
    return matches
  })
  if (criticalVendorItems.length > 0) {
    const impact = Math.min(criticalVendorItems.length * 0.15, 0.4)
    score -= impact
    factors.push({
      name: 'Vendor Critical Alerts',
      impact: -impact,
      count: criticalVendorItems.length,
      description: 'Critical severity reports from security vendors',
      weight: SCORING_WEIGHTS.vendorCritical.perItem,
      maxImpact: SCORING_WEIGHTS.vendorCritical.maxImpact,
      items: criticalVendorItems.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate
      }))
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
  const aiThreatCount = aiAnalyzedThreats.length + keywordOnlyThreats.length
  const summary = generateSummary(score, aiThreatCount, recentKEVs.length)

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