// Campaign Correlation Engine — Severity-Driven
// Detects active campaigns by correlating threat feed items against actor profiles
// using AI severity scores, KEV status, ICS/SCADA indicators, and nation-state activity

import { ThreatItem } from '@/lib/feeds'
import { ThreatActor, Sector, matchesKeyword } from '@/components/globe/worldData'

// ===== Interfaces =====

export interface CampaignCandidate {
  id: string
  actorName: string
  confidence: 'high' | 'medium' | 'low'
  confidenceScore: number           // 0.0-1.0
  correlatedItems: {
    itemId: string
    title: string
    pairScore: number
  }[]
  avgSeverity: number               // Average per-item severity score
  kevCount: number                  // Count of KEV-sourced items
  nationStateCount: number          // Count of items with nation-state indicators
  firstSeen: string
  lastSeen: string
  affectedSectors: Sector[]
  rationale: string                 // Auditable explanation
}

// ===== ICS/SCADA terms for relevance check =====

const ICS_TERMS = [
  'scada', 'ics', 'plc', 'hmi', 'rtu', 'dcs',
  'modbus', 'dnp3', 'iec 61850', 'iec 104', 'iec 60870', 'opc', 'opc ua',
  'bacnet', 'profinet', 'ethernet/ip',
  'industrial control', 'operational technology',
  'siemens', 'schneider electric', 'rockwell', 'honeywell', 'unitronics',
  'industroyer', 'crashoverride', 'havex', 'pipedream', 'incontroller',
  'frostygoop', 'cosmicenergy', 'triton', 'trisis',
]

const NATION_STATE_INDICATORS = [
  'volt typhoon', 'salt typhoon', 'flax typhoon', 'brass typhoon',
  'sandworm', 'dragonfly', 'energetic bear', 'turla', 'fancy bear', 'cozy bear',
  'xenotime', 'chernovite', 'kamacite', 'winnti',
  'apt28', 'apt29', 'apt33', 'apt34', 'apt35', 'apt41',
  'lazarus', 'kimsuky', 'andariel',
  'cyberav3ngers', 'muddywater', 'oilrig', 'charming kitten',
  'temp.veles', 'mango sandstorm', 'hazel sandstorm',
  'seashell blizzard', 'forest blizzard', 'midnight blizzard',
  'diamond sleet', 'peach sandstorm', 'mint sandstorm',
  'secret blizzard', 'emerald sleet', 'ghost blizzard',
  'onyx sleet', 'ethereal panda',
  'nation-state', 'state-sponsored',
]

// ===== Phase A: Per-item severity score (0.0–1.0) =====

function computeItemSeverity(item: ThreatItem): number {
  let score = 0

  // AI energy severity contribution
  if (item.aiSeverityScore != null) {
    const ai = item.aiSeverityScore
    if (ai >= 9) score += 0.40
    else if (ai >= 7) score += 0.30
    else if (ai >= 5) score += 0.20
    else if (ai >= 3) score += 0.10
  }

  // Item severity level contribution
  if (item.severity === 'critical') score += 0.25
  else if (item.severity === 'high') score += 0.15

  // KEV source bonus
  if (item.source === 'CISA KEV') score += 0.20

  // ICS/SCADA relevance bonus
  if (hasIcsRelevance(item)) score += 0.10

  // Temporal decay
  const decay = computeTemporalDecay(item.pubDate)
  score = score * decay

  return Math.min(score, 1.0)
}

function hasIcsRelevance(item: ThreatItem): boolean {
  // Check AI-populated fields first
  if (item.aiAffectedSystems && item.aiAffectedSystems.length > 0) {
    const systemsText = item.aiAffectedSystems.join(' ').toLowerCase()
    if (ICS_TERMS.some(term => systemsText.includes(term))) return true
  }
  if (item.aiAffectedProtocols && item.aiAffectedProtocols.length > 0) {
    const protocolsText = item.aiAffectedProtocols.join(' ').toLowerCase()
    if (ICS_TERMS.some(term => protocolsText.includes(term))) return true
  }
  // Fallback: check title + description
  const text = `${item.title} ${item.description}`
  return ICS_TERMS.some(term => matchesKeyword(text, term))
}

function isNationStateItem(item: ThreatItem): boolean {
  const text = `${item.title} ${item.description}`
  return NATION_STATE_INDICATORS.some(indicator => matchesKeyword(text, indicator))
}

function computeTemporalDecay(pubDate: string): number {
  const ageMs = Date.now() - new Date(pubDate).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays <= 2) return 1.0
  if (ageDays <= 7) return 0.75
  if (ageDays <= 14) return 0.50
  return 0.25
}

// ===== Phase B: Actor-to-item pair scoring =====

function scoreActorItem(
  actor: ThreatActor,
  item: ThreatItem,
  itemSeverity: number,
): { pairScore: number; directNameMatch: boolean } {
  const text = `${item.title} ${item.description}`

  // Direct name/alias match check
  let directNameMatch = false
  const namesToCheck = [actor.name, ...(actor.aliases || [])]
  for (const name of namesToCheck) {
    if (matchesKeyword(text, name)) {
      directNameMatch = true
      break
    }
  }

  // Base score: direct match = 0.9, otherwise item severity
  let baseScore = directNameMatch ? 0.9 : itemSeverity

  // Sector overlap bonus
  const sectorBonus = actor.targetSectors.some(s => {
    const sectorText = item.title + ' ' + item.description
    return matchesKeyword(sectorText, s) ||
           (s === 'grid' && matchesKeyword(sectorText, 'power grid')) ||
           (s === 'oil' && matchesKeyword(sectorText, 'petroleum')) ||
           (s === 'natural_gas' && matchesKeyword(sectorText, 'natural gas'))
  }) ? 0.1 : 0

  const pairScore = Math.min(baseScore + sectorBonus, 1.0)

  return { pairScore, directNameMatch }
}

// ===== Phase C: Campaign detection =====

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function detectCampaigns(
  items: ThreatItem[],
  actors: ThreatActor[],
): CampaignCandidate[] {
  // Pre-compute per-item severity scores
  const itemSeverities = new Map<string, number>()
  for (const item of items) {
    itemSeverities.set(item.id, computeItemSeverity(item))
  }

  const campaigns: CampaignCandidate[] = []

  for (const actor of actors) {
    // Score each item against this actor
    const correlatedItems: {
      itemId: string
      title: string
      pairScore: number
      directNameMatch: boolean
      pubDate: string
      isKev: boolean
      isNationState: boolean
      severity: number
    }[] = []

    for (const item of items) {
      const itemSeverity = itemSeverities.get(item.id) || 0
      const { pairScore, directNameMatch } = scoreActorItem(actor, item, itemSeverity)

      // Only include items with some relevance
      if (pairScore > 0) {
        correlatedItems.push({
          itemId: item.id,
          title: item.title,
          pairScore,
          directNameMatch,
          pubDate: item.pubDate,
          isKev: item.source === 'CISA KEV',
          isNationState: isNationStateItem(item),
          severity: itemSeverity,
        })
      }
    }

    if (correlatedItems.length === 0) continue

    // Filter to 7-day sliding window (most recent 7 days)
    const now = Date.now()
    const windowItems = correlatedItems.filter(ci => {
      const itemTime = new Date(ci.pubDate).getTime()
      return (now - itemTime) <= SEVEN_DAYS_MS
    })

    if (windowItems.length === 0) continue

    // Sort by score descending
    windowItems.sort((a, b) => b.pairScore - a.pairScore)

    // Compute campaign-level metrics
    const avgSeverity = windowItems.reduce((s, ci) => s + ci.severity, 0) / windowItems.length
    const maxPairScore = windowItems[0].pairScore
    const hasDirectNameMatch = windowItems.some(ci => ci.directNameMatch)
    const kevCount = windowItems.filter(ci => ci.isKev).length
    const nationStateCount = windowItems.filter(ci => ci.isNationState).length
    const kevRatio = windowItems.length > 0 ? kevCount / windowItems.length : 0
    const nationStateRatio = windowItems.length > 0 ? nationStateCount / windowItems.length : 0

    // Campaign score formula
    let campaignScore =
      (avgSeverity * 0.35) +
      (maxPairScore * 0.25) +
      (Math.min(windowItems.length / 5, 1) * 0.15) +
      (kevRatio * 0.15) +
      (nationStateRatio * 0.10)

    // If any item has direct name match, floor the score
    if (hasDirectNameMatch) {
      campaignScore = Math.max(campaignScore, 0.6)
    }

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low'
    if (campaignScore >= 0.7 && windowItems.length >= 3) {
      confidence = 'high'
    } else if (campaignScore >= 0.4 && windowItems.length >= 2) {
      confidence = 'medium'
    } else if (campaignScore >= 0.25) {
      confidence = 'low'
    } else {
      continue // Below minimum threshold
    }

    // Time range
    const dates = windowItems.map(ci => new Date(ci.pubDate).getTime())
    const firstSeen = new Date(Math.min(...dates)).toISOString()
    const lastSeen = new Date(Math.max(...dates)).toISOString()

    // Build auditable rationale
    const rationale = buildRationale(actor, windowItems, avgSeverity, kevCount, nationStateCount, hasDirectNameMatch, campaignScore)

    campaigns.push({
      id: `campaign-${actor.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      actorName: actor.name,
      confidence,
      confidenceScore: Math.round(campaignScore * 100) / 100,
      correlatedItems: windowItems.map(ci => ({
        itemId: ci.itemId,
        title: ci.title,
        pairScore: Math.round(ci.pairScore * 100) / 100,
      })),
      avgSeverity: Math.round(avgSeverity * 100) / 100,
      kevCount,
      nationStateCount,
      firstSeen,
      lastSeen,
      affectedSectors: actor.targetSectors,
      rationale,
    })
  }

  // Sort by confidence score descending
  campaigns.sort((a, b) => b.confidenceScore - a.confidenceScore)

  return campaigns
}

function buildRationale(
  actor: ThreatActor,
  items: { directNameMatch: boolean; title: string }[],
  avgSeverity: number,
  kevCount: number,
  nationStateCount: number,
  hasDirectNameMatch: boolean,
  score: number,
): string {
  const parts: string[] = []

  if (hasDirectNameMatch) {
    const nameItems = items.filter(i => i.directNameMatch)
    parts.push(`Direct mention of ${actor.name} in ${nameItems.length} feed item${nameItems.length > 1 ? 's' : ''}.`)
  }

  parts.push(`${items.length} correlated item${items.length > 1 ? 's' : ''} in 7-day window (avg energy severity: ${avgSeverity.toFixed(2)}).`)

  if (kevCount > 0 || nationStateCount > 0) {
    const fragments: string[] = []
    if (kevCount > 0) fragments.push(`${kevCount} actively exploited KEV${kevCount > 1 ? 's' : ''}`)
    if (nationStateCount > 0) fragments.push(`${nationStateCount} nation-state indicator${nationStateCount > 1 ? 's' : ''}`)
    parts.push(`Includes ${fragments.join(' and ')}.`)
  }

  parts.push(`Campaign score: ${score.toFixed(2)}.`)

  return parts.join(' ')
}
