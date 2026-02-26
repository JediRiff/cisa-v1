// Campaign Correlation Engine
// Detects active campaigns by correlating threat feed items against actor TTP signatures

import { ThreatItem } from '@/lib/feeds'
import { ThreatActor, Sector, matchesKeyword } from '@/components/globe/worldData'
import { ttpSignatures, ttpSignatureMap } from '@/lib/ttp-signatures'

// ===== Interfaces =====

interface TTPMatch {
  techniqueId: string
  matchedSignal: string
  weight: number
}

interface ItemCorrelation {
  itemId: string
  matchedTTPs: TTPMatch[]
  matchedActorNames: string[]   // Direct name/alias mentions
  matchedSectors: Sector[]
}

export interface CampaignCandidate {
  id: string
  actorName: string
  confidence: 'high' | 'medium' | 'low'
  confidenceScore: number           // 0.0-1.0
  correlatedItems: {
    itemId: string
    title: string
    pairScore: number
    matchedTTPs: string[]
  }[]
  uniqueTechniquesMatched: string[]
  techniquesCoverage: number        // |uniqueMatched| / |actor.ttps|
  firstSeen: string
  lastSeen: string
  affectedSectors: Sector[]
  rationale: string                 // Auditable explanation
}

// ===== Phase A: Per-item TTP extraction =====

function extractItemCorrelation(item: ThreatItem): ItemCorrelation {
  const text = `${item.title} ${item.description}`
  const matchedTTPs: TTPMatch[] = []
  const matchedActorNames: string[] = []
  const matchedSectors: Sector[] = []

  // Scan text against TTP signatures
  for (let i = 0; i < ttpSignatures.length; i++) {
    const sig = ttpSignatures[i]
    let matched = false

    // Check signal phrases
    for (let j = 0; j < sig.signals.length; j++) {
      if (matchesKeyword(text, sig.signals[j])) {
        matchedTTPs.push({
          techniqueId: sig.id,
          matchedSignal: sig.signals[j],
          weight: sig.weight,
        })
        matched = true
        break // Only match first signal per technique
      }
    }

    // Check tool names if not already matched
    if (!matched && sig.tools) {
      for (let j = 0; j < sig.tools.length; j++) {
        if (matchesKeyword(text, sig.tools[j])) {
          matchedTTPs.push({
            techniqueId: sig.id,
            matchedSignal: sig.tools[j],
            weight: Math.min(sig.weight + 0.2, 1.0), // Tools are more specific
          })
          break
        }
      }
    }
  }

  return {
    itemId: item.id,
    matchedTTPs,
    matchedActorNames,
    matchedSectors,
  }
}

// ===== Phase B: Actor-to-item scoring =====

function scoreActorItem(
  actor: ThreatActor,
  item: ThreatItem,
  itemCorrelation: ItemCorrelation,
): { pairScore: number; matchedTTPs: string[]; directNameMatch: boolean } {
  const text = `${item.title} ${item.description}`
  const actorTTPs = actor.ttps || []

  // Direct name match check
  let directNameMatch = false
  const namesToCheck = [actor.name, ...(actor.aliases || [])]
  for (const name of namesToCheck) {
    if (matchesKeyword(text, name)) {
      directNameMatch = true
      break
    }
  }

  // TTP overlap: which of the actor's TTPs match this item?
  const actorTTPIds = new Set(actorTTPs.map(t => t.id))
  const matchedTTPs = itemCorrelation.matchedTTPs
    .filter(m => actorTTPIds.has(m.techniqueId))
  const matchedTTPIds = matchedTTPs.map(m => m.techniqueId)

  // Compute TTP overlap score
  let ttpScore = 0
  if (actorTTPs.length > 0 && matchedTTPs.length > 0) {
    const weightSum = matchedTTPs.reduce((sum, m) => sum + m.weight, 0)
    ttpScore = Math.min(weightSum / actorTTPs.length, 1.0)
  }

  // Base score from direct name match or TTP overlap
  let baseScore = directNameMatch ? 0.9 : ttpScore

  // Sector relevance bonus
  const sectorBonus = actor.targetSectors.some(s => {
    const sectorText = item.title + ' ' + item.description
    return matchesKeyword(sectorText, s) ||
           (s === 'grid' && matchesKeyword(sectorText, 'power grid')) ||
           (s === 'oil' && matchesKeyword(sectorText, 'petroleum')) ||
           (s === 'natural_gas' && matchesKeyword(sectorText, 'natural gas'))
  }) ? 0.1 : 0

  const pairScore = Math.min(baseScore + sectorBonus, 1.0)

  return { pairScore, matchedTTPs: matchedTTPIds, directNameMatch }
}

// ===== Phase C: Campaign detection =====

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function detectCampaigns(
  items: ThreatItem[],
  actors: ThreatActor[],
): CampaignCandidate[] {
  // Pre-compute item correlations
  const itemCorrelations = new Map<string, ItemCorrelation>()
  for (const item of items) {
    itemCorrelations.set(item.id, extractItemCorrelation(item))
  }

  const campaigns: CampaignCandidate[] = []

  for (const actor of actors) {
    if (!actor.ttps || actor.ttps.length === 0) continue

    // Score each item against this actor
    const correlatedItems: {
      itemId: string
      title: string
      pairScore: number
      matchedTTPs: string[]
      directNameMatch: boolean
      pubDate: string
    }[] = []

    for (const item of items) {
      const correlation = itemCorrelations.get(item.id)!
      const { pairScore, matchedTTPs, directNameMatch } = scoreActorItem(
        actor, item, correlation,
      )

      // Only include items with some relevance
      if (pairScore > 0) {
        correlatedItems.push({
          itemId: item.id,
          title: item.title,
          pairScore,
          matchedTTPs,
          directNameMatch,
          pubDate: item.pubDate,
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
    const uniqueTechniques = new Set<string>()
    windowItems.forEach(ci => ci.matchedTTPs.forEach(t => uniqueTechniques.add(t)))
    const uniqueTechniquesArr = Array.from(uniqueTechniques)
    const techniquesCoverage = uniqueTechniquesArr.length / actor.ttps.length

    const avgPairScore = windowItems.reduce((s, ci) => s + ci.pairScore, 0) / windowItems.length
    const maxPairScore = windowItems[0].pairScore
    const hasDirectNameMatch = windowItems.some(ci => ci.directNameMatch)

    // Campaign score formula
    let campaignScore =
      (techniquesCoverage * 0.35) +
      (avgPairScore * 0.25) +
      (maxPairScore * 0.20) +
      (Math.min(windowItems.length / 5, 1) * 0.20)

    // If any item has direct name match, floor the score
    if (hasDirectNameMatch) {
      campaignScore = Math.max(campaignScore, 0.6)
    }

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low'
    if (campaignScore >= 0.7 && windowItems.length >= 3 && uniqueTechniquesArr.length >= 3) {
      confidence = 'high'
    } else if (campaignScore >= 0.4 && windowItems.length >= 2 && uniqueTechniquesArr.length >= 2) {
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
    const rationale = buildRationale(actor, windowItems, uniqueTechniquesArr, techniquesCoverage, hasDirectNameMatch, campaignScore)

    campaigns.push({
      id: `campaign-${actor.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      actorName: actor.name,
      confidence,
      confidenceScore: Math.round(campaignScore * 100) / 100,
      correlatedItems: windowItems.map(ci => ({
        itemId: ci.itemId,
        title: ci.title,
        pairScore: Math.round(ci.pairScore * 100) / 100,
        matchedTTPs: ci.matchedTTPs,
      })),
      uniqueTechniquesMatched: uniqueTechniquesArr,
      techniquesCoverage: Math.round(techniquesCoverage * 100) / 100,
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
  items: { matchedTTPs: string[]; directNameMatch: boolean; title: string }[],
  uniqueTechniques: string[],
  coverage: number,
  hasDirectNameMatch: boolean,
  score: number,
): string {
  const parts: string[] = []

  if (hasDirectNameMatch) {
    const nameItems = items.filter(i => i.directNameMatch)
    parts.push(`Direct mention of ${actor.name} in ${nameItems.length} feed item${nameItems.length > 1 ? 's' : ''}.`)
  }

  parts.push(`${items.length} correlated item${items.length > 1 ? 's' : ''} in 7-day window.`)

  if (uniqueTechniques.length > 0) {
    parts.push(`${uniqueTechniques.length}/${actor.ttps?.length || 0} known TTPs matched (${Math.round(coverage * 100)}% coverage).`)
  }

  parts.push(`Campaign score: ${score.toFixed(2)}.`)

  return parts.join(' ')
}
