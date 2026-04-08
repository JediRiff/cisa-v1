// CAPRI Social/Community Threat Intelligence Feed Module
// Fetches from free social sources: Bluesky, Mastodon (infosec.exchange), Reddit RSS
// No API keys required for any source.

import { classifyThreatBySector } from './sector-keywords'
import { classifySeverity } from './severity'
import {
  ENERGY_KEYWORDS,
  NATION_STATE_INDICATORS,
  ICS_TERMS,
  matchesIndicator,
} from './indicators'
import type { EnergySector } from '@/components/map/types'

// ── In-memory cache (15-minute TTL, same pattern as EIA-930) ──

let cachedResults: any[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

// ── Noise-filtering constants ──

const TRUSTED_SECURITY_DOMAINS = [
  'cisa.gov',
  'nist.gov',
  'nvd.nist.gov',
  'dragos.com',
  'mandiant.com',
  'crowdstrike.com',
  'sentinelone.com',
  'talosintelligence.com',
  'us-cert.cisa.gov',
  'cert.org',
  'mitre.org',
  'exploit-db.com',
  'github.com/advisories',
  'packetstormsecurity.com',
  'bleepingcomputer.com',
  'therecord.media',
  'securityweek.com',
  'darkreading.com',
  'threatpost.com',
  'krebs',
]

// ── Deterministic ID generation (same djb2 hash as feeds.ts) ──

function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff
  }
  return hash.toString(36)
}

// ── Noise filter: returns true if the item is signal, not noise ──

function passesNoiseFilter(text: string): boolean {
  // 1. Nation-state indicator match
  if (NATION_STATE_INDICATORS.some(ind => matchesIndicator(text, ind))) {
    return true
  }

  // 2. ICS terms match
  if (ICS_TERMS.some(term => matchesIndicator(text, term))) {
    return true
  }

  // 3. Trusted security domain link
  const lower = text.toLowerCase()
  if (TRUSTED_SECURITY_DOMAINS.some(domain => lower.includes(domain))) {
    return true
  }

  // 4. At least 2 ENERGY_KEYWORDS matches
  let energyHits = 0
  for (const kw of ENERGY_KEYWORDS) {
    if (matchesIndicator(text, kw)) {
      energyHits++
      if (energyHits >= 2) return true
    }
  }

  return false
}

// ── Bluesky (AT Protocol public API) ──

const BLUESKY_QUERIES = [
  'energy SCADA vulnerability',
  'ICS exploit critical infrastructure',
  'power grid cyber attack',
]

async function fetchBluesky(): Promise<any[]> {
  const items: any[] = []

  for (const query of BLUESKY_QUERIES) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const params = new URLSearchParams({ q: query, limit: '25' })
      const response = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?${params}`,
        {
          headers: { 'User-Agent': 'CAPRI/1.0' },
          cache: 'no-store',
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Bluesky query "${query}" failed: HTTP ${response.status}`)
        continue
      }

      const data = await response.json()
      const posts = data.posts || []

      for (const post of posts) {
        const record = post.record || {}
        const text = record.text || ''
        const author = post.author?.handle || 'unknown'
        const createdAt = record.createdAt || new Date().toISOString()
        const uri = post.uri || ''

        // Build a web link from the AT URI: at://did/app.bsky.feed.post/rkey
        const atParts = uri.split('/')
        const rkey = atParts[atParts.length - 1]
        const link = `https://bsky.app/profile/${author}/post/${rkey}`

        // Extract embedded links for noise filter
        const embeddedLinks: string[] = []
        if (post.embed?.external?.uri) embeddedLinks.push(post.embed.external.uri)
        if (record.facets) {
          for (const facet of record.facets) {
            for (const feature of facet.features || []) {
              if (feature.uri) embeddedLinks.push(feature.uri)
            }
          }
        }

        const fullText = text + ' ' + embeddedLinks.join(' ')

        if (!passesNoiseFilter(fullText)) continue

        const title = text.length > 120 ? text.substring(0, 117) + '...' : text
        const description = text.substring(0, 500)

        items.push({
          id: 'Bluesky-' + hashString('Bluesky' + link),
          title,
          description,
          link,
          pubDate: new Date(createdAt).toISOString(),
          source: 'Bluesky',
          sourceType: 'social' as const,
          severity: classifySeverity({
            title,
            description,
            source: 'Bluesky',
            sourceType: 'social',
          }),
          isEnergyRelevant: ENERGY_KEYWORDS.some(kw => matchesIndicator(fullText, kw)),
          sectors: classifyThreatBySector(title, description),
        })
      }
    } catch (error) {
      console.error(`Bluesky query "${query}" error:`, error instanceof Error ? error.message : 'Failed')
    }
  }

  return items
}

// ── Mastodon (infosec.exchange public API) ──

const MASTODON_TAGS = ['infosec', 'ics', 'scada', 'cybersecurity']
const MASTODON_INSTANCE = 'https://infosec.exchange'

async function fetchMastodon(): Promise<any[]> {
  const items: any[] = []

  for (const tag of MASTODON_TAGS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(
        `${MASTODON_INSTANCE}/api/v1/timelines/tag/${tag}?limit=20`,
        {
          headers: { 'User-Agent': 'CAPRI/1.0' },
          cache: 'no-store',
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Mastodon tag #${tag} failed: HTTP ${response.status}`)
        continue
      }

      const toots: any[] = await response.json()

      for (const toot of toots) {
        // Strip HTML from toot content
        const rawContent = (toot.content || '').replace(/<[^>]*>/g, '')
        const account = toot.account?.acct || 'unknown'
        const link = toot.url || toot.uri || ''
        const createdAt = toot.created_at || new Date().toISOString()

        if (!passesNoiseFilter(rawContent)) continue

        const title = rawContent.length > 120
          ? rawContent.substring(0, 117) + '...'
          : rawContent
        const description = rawContent.substring(0, 500)

        items.push({
          id: 'Mastodon-' + hashString('Mastodon' + link),
          title,
          description: `[${account}] ${description}`,
          link,
          pubDate: new Date(createdAt).toISOString(),
          source: 'Mastodon (infosec.exchange)',
          sourceType: 'social' as const,
          severity: classifySeverity({
            title,
            description,
            source: 'Mastodon',
            sourceType: 'social',
          }),
          isEnergyRelevant: ENERGY_KEYWORDS.some(kw => matchesIndicator(rawContent, kw)),
          sectors: classifyThreatBySector(title, description),
        })
      }
    } catch (error) {
      console.error(`Mastodon tag #${tag} error:`, error instanceof Error ? error.message : 'Failed')
    }
  }

  return items
}

// ── Reddit RSS ──

const REDDIT_FEEDS = [
  { url: 'https://www.reddit.com/r/netsec/.rss', name: 'Reddit r/netsec' },
  { url: 'https://www.reddit.com/r/cybersecurity/.rss', name: 'Reddit r/cybersecurity' },
]

async function fetchReddit(): Promise<any[]> {
  const items: any[] = []

  for (const feed of REDDIT_FEEDS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'CAPRI/1.0' },
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`${feed.name} failed: HTTP ${response.status}`)
        continue
      }

      const xml = await response.text()

      // Reddit RSS uses Atom format (<entry> not <item>)
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
      let match

      while ((match = entryRegex.exec(xml)) !== null) {
        const entryXml = match[1]

        // Title
        const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/)
        const title = titleMatch
          ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim()
          : 'Untitled'

        // Link (Atom uses <link href="..."/>)
        const linkMatch = entryXml.match(/<link\s+href="([^"]*)"/)
        const link = linkMatch ? linkMatch[1] : ''

        // Content/summary
        const contentMatch =
          entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/) ||
          entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)
        const rawContent = contentMatch
          ? contentMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').substring(0, 500).trim()
          : ''

        // Date
        const dateMatch = entryXml.match(/<updated>([\s\S]*?)<\/updated>/) ||
          entryXml.match(/<published>([\s\S]*?)<\/published>/)
        const pubDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()

        const fullText = title + ' ' + rawContent

        // Post-fetch energy/ICS keyword filter
        if (!passesNoiseFilter(fullText)) continue

        items.push({
          id: feed.name.replace(/\s/g, '-') + '-' + hashString(feed.name + link),
          title,
          description: rawContent,
          link,
          pubDate,
          source: feed.name,
          sourceType: 'social' as const,
          severity: classifySeverity({
            title,
            description: rawContent,
            source: feed.name,
            sourceType: 'social',
          }),
          isEnergyRelevant: ENERGY_KEYWORDS.some(kw => matchesIndicator(fullText, kw)),
          sectors: classifyThreatBySector(title, rawContent),
        })
      }
    } catch (error) {
      console.error(`${feed.name} error:`, error instanceof Error ? error.message : 'Failed')
    }
  }

  return items
}

// ── Main export ──

/**
 * Fetch threat intelligence from free social/community sources.
 * Each source fails independently -- if one is down, the others still return results.
 * Results are cached in memory for 15 minutes.
 */
export async function fetchSocialThreats(): Promise<any[]> {
  // Return cached results if within TTL
  if (cachedResults && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedResults
  }

  // Fetch all three sources in parallel; each has its own error handling
  const [blueskyItems, mastodonItems, redditItems] = await Promise.all([
    fetchBluesky().catch(err => {
      console.error('Bluesky fetch failed entirely:', err instanceof Error ? err.message : 'Unknown error')
      return [] as any[]
    }),
    fetchMastodon().catch(err => {
      console.error('Mastodon fetch failed entirely:', err instanceof Error ? err.message : 'Unknown error')
      return [] as any[]
    }),
    fetchReddit().catch(err => {
      console.error('Reddit fetch failed entirely:', err instanceof Error ? err.message : 'Unknown error')
      return [] as any[]
    }),
  ])

  const allItems = [...blueskyItems, ...mastodonItems, ...redditItems]

  // Deduplicate by link (social posts can appear across multiple queries/tags)
  const seen = new Set<string>()
  const deduped: any[] = []
  for (const item of allItems) {
    if (item.link && seen.has(item.link)) continue
    if (item.link) seen.add(item.link)
    deduped.push(item)
  }

  // Sort newest first
  deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  // Update cache
  cachedResults = deduped
  cacheTimestamp = Date.now()

  return deduped
}
