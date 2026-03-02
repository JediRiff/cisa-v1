// CAPRI Threat Enrichment Module
// Fetches from API-key-gated sources: AbuseIPDB, Shodan, VirusTotal
// All sources are optional — gracefully skipped when API keys are absent

import { ThreatItem } from './feeds'

export interface EnrichmentKeys {
  abuseIPDBKey?: string
  shodanKey?: string
  virusTotalKey?: string
}

export interface EnrichmentResult {
  items: ThreatItem[]
  sourcesOnline: number
  sourcesTotal: number
  errors: string[]
}

// Separate cache for enrichment data (5 min TTL)
let enrichmentCache: { data: EnrichmentResult; timestamp: number } | null = null
const ENRICHMENT_CACHE_TTL = 5 * 60 * 1000

// Shodan has slower-changing data — 10 min cache
let shodanCache: { items: ThreatItem[]; timestamp: number } | null = null
const SHODAN_CACHE_TTL = 10 * 60 * 1000

// Energy sector keyword check (simplified version — main one lives in feeds.ts)
const ENERGY_KEYWORDS_RE = /\b(energy|power|grid|electric|scada|ics|modbus|dnp3|pipeline|oil|gas|nuclear|substation|critical infrastructure)\b/i

function checkEnergyRelevance(text: string): boolean {
  return ENERGY_KEYWORDS_RE.test(text)
}

function extractSeverity(text: string): ThreatItem['severity'] {
  const lower = text.toLowerCase()
  if (lower.includes('critical') || lower.includes('zero-day') || lower.includes('0-day') || lower.includes('actively exploited')) return 'critical'
  if (/\b(ransomware|remote code execution|rce|wiper|destructive)\b/.test(lower)) return 'critical'
  if (lower.includes('high') || lower.includes('urgent') || lower.includes('severe')) return 'high'
  if (/\b(apt\d+|nation.state|scada|plc|modbus|ics)\b/.test(lower)) return 'high'
  if (lower.includes('medium') || lower.includes('moderate')) return 'medium'
  if (/\b(vulnerability|exploit|attack|malware|threat|breach|backdoor|trojan|phishing)\b/.test(lower)) return 'medium'
  if (lower.includes('low') || lower.includes('informational')) return 'low'
  if (lower.length > 50) return 'medium'
  return 'unknown'
}

// ─── AbuseIPDB ──────────────────────────────────────────────────────────────────
// Top malicious IPs by confidence score
// Free tier: 1000 checks/day
async function fetchAbuseIPDBData(apiKey?: string): Promise<ThreatItem[]> {
  const key = apiKey || process.env.ABUSEIPDB_API_KEY
  if (!key) return []

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(
      'https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=90&limit=10',
      {
        headers: {
          'Key': key,
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const json = await response.json()
    const data = json.data || []

    return data.map((entry: any) => {
      const ip = entry.ipAddress
      const score = entry.abuseConfidenceScore || 0
      let severity: ThreatItem['severity'] = 'medium'
      if (score >= 95) severity = 'critical'
      else if (score >= 90) severity = 'high'

      const title = `Malicious IP: ${ip} (Confidence: ${score}%)`
      const description = `Reported ${entry.totalReports || 0} times by ${entry.numDistinctUsers || 0} users. Country: ${entry.countryCode || 'Unknown'}.`

      return {
        id: `AIPDB-${ip}`,
        title,
        description,
        link: `https://www.abuseipdb.com/check/${ip}`,
        pubDate: new Date(entry.lastReportedAt || Date.now()).toISOString(),
        source: 'AbuseIPDB',
        sourceType: 'vendor' as const,
        severity,
        isEnergyRelevant: checkEnergyRelevance(title + ' ' + description),
      }
    })
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ─── Shodan ─────────────────────────────────────────────────────────────────────
// ICS/SCADA exploit disclosures
// Free tier: 1 req/sec
async function fetchShodanIntelligence(apiKey?: string): Promise<ThreatItem[]> {
  const key = apiKey || process.env.SHODAN_API_KEY
  if (!key) return []

  // Check Shodan-specific cache (10 min) — only when using env key
  if (!apiKey && shodanCache && (Date.now() - shodanCache.timestamp) < SHODAN_CACHE_TTL) {
    return shodanCache.items
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const query = encodeURIComponent('scada OR ics OR modbus OR dnp3')
    const response = await fetch(
      `https://exploits.shodan.io/api/search?query=${query}&key=${key}`,
      {
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const json = await response.json()
    const matches = json.matches || []

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const items: ThreatItem[] = matches
      .filter((m: any) => {
        if (!m.date) return true
        return new Date(m.date) >= thirtyDaysAgo
      })
      .slice(0, 10)
      .map((m: any) => {
        const title = m.description || m.title || 'ICS/SCADA Exploit'
        const desc = [
          m.source || '',
          m.platform ? `Platform: ${m.platform}` : '',
          m.type ? `Type: ${m.type}` : '',
          m.cve ? m.cve.join(', ') : '',
        ].filter(Boolean).join(' | ')

        const hashInput = (m._id || m.description || Math.random().toString(36)).toString()
        const hashId = hashInput.substring(0, 12).replace(/[^a-zA-Z0-9]/g, '')

        let severity: ThreatItem['severity'] = 'high'
        const lowerTitle = title.toLowerCase()
        if (lowerTitle.includes('remote code') || lowerTitle.includes('rce') || lowerTitle.includes('critical')) {
          severity = 'critical'
        }

        return {
          id: `SHODAN-${hashId}`,
          title: title.substring(0, 200),
          description: desc.substring(0, 500) || 'ICS/SCADA related exploit disclosure',
          link: m.source ? `https://www.exploit-db.com/exploits/${m._id}` : `https://exploits.shodan.io/?q=${query}`,
          pubDate: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
          source: 'Shodan',
          sourceType: 'vendor' as const,
          severity,
          isEnergyRelevant: true, // ICS/SCADA query guarantees relevance
        }
      })

    if (!apiKey) {
      shodanCache = { items, timestamp: Date.now() }
    }
    return items
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ─── VirusTotal ─────────────────────────────────────────────────────────────────
// Popular threat categories — 1 request per cycle
// Free tier: 4 req/min, 500/day — very restrictive
async function fetchVirusTotalCategories(apiKey?: string): Promise<ThreatItem[]> {
  const key = apiKey || process.env.VIRUSTOTAL_API_KEY
  if (!key) return []

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(
      'https://www.virustotal.com/api/v3/popular_threat_categories',
      {
        headers: {
          'x-apikey': key,
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const json = await response.json()
    const categories = json.data || []

    // Map trending categories to informational ThreatItem entries (top 5)
    return categories.slice(0, 5).map((category: any, index: number) => {
      const name = typeof category === 'string' ? category : (category.id || category.type || `category-${index}`)
      const count = typeof category === 'object' ? (category.attributes?.count || '') : ''
      const title = `Trending Threat Category: ${name}`
      const description = count ? `${name} — ${count} recent detections on VirusTotal` : `${name} is a trending threat category on VirusTotal`

      return {
        id: `VT-${name.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`,
        title,
        description,
        link: 'https://www.virustotal.com',
        pubDate: new Date().toISOString(),
        source: 'VirusTotal',
        sourceType: 'vendor' as const,
        severity: 'low' as const,
        isEnergyRelevant: checkEnergyRelevance(name),
      }
    })
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────────

// Count how many enrichment sources have API keys configured
export function getConfiguredEnrichmentCount(keys?: EnrichmentKeys): { configured: number; total: number } {
  let configured = 0
  const total = 3
  if (keys?.abuseIPDBKey || process.env.ABUSEIPDB_API_KEY) configured++
  if (keys?.shodanKey || process.env.SHODAN_API_KEY) configured++
  if (keys?.virusTotalKey || process.env.VIRUSTOTAL_API_KEY) configured++
  return { configured, total }
}

export async function fetchAllEnrichment(keys?: EnrichmentKeys): Promise<EnrichmentResult> {
  const hasUserKeys = !!(keys?.abuseIPDBKey || keys?.shodanKey || keys?.virusTotalKey)

  // Check cache first — skip when user-provided keys are present (different users have different keys)
  if (!hasUserKeys && enrichmentCache && (Date.now() - enrichmentCache.timestamp) < ENRICHMENT_CACHE_TTL) {
    return enrichmentCache.data
  }

  const items: ThreatItem[] = []
  const errors: string[] = []
  let sourcesOnline = 0
  const { configured: sourcesTotal } = getConfiguredEnrichmentCount(keys)

  // If no enrichment sources are configured, return empty
  if (sourcesTotal === 0) {
    return { items: [], sourcesOnline: 0, sourcesTotal: 0, errors: [] }
  }

  // Fetch all configured sources in parallel
  const fetchers: { name: string; fn: () => Promise<ThreatItem[]> }[] = []

  const abuseKey = keys?.abuseIPDBKey || process.env.ABUSEIPDB_API_KEY
  if (abuseKey) {
    fetchers.push({ name: 'AbuseIPDB', fn: () => fetchAbuseIPDBData(keys?.abuseIPDBKey) })
  }
  const shodanKey = keys?.shodanKey || process.env.SHODAN_API_KEY
  if (shodanKey) {
    fetchers.push({ name: 'Shodan', fn: () => fetchShodanIntelligence(keys?.shodanKey) })
  }
  const vtKey = keys?.virusTotalKey || process.env.VIRUSTOTAL_API_KEY
  if (vtKey) {
    fetchers.push({ name: 'VirusTotal', fn: () => fetchVirusTotalCategories(keys?.virusTotalKey) })
  }

  const results = await Promise.all(
    fetchers.map(async ({ name, fn }) => {
      try {
        const result = await fn()
        sourcesOnline++
        return result
      } catch (error) {
        errors.push(`${name}: ${error instanceof Error ? error.message : 'Failed'}`)
        return []
      }
    })
  )

  results.forEach(result => items.push(...result))

  const data: EnrichmentResult = {
    items,
    sourcesOnline,
    sourcesTotal,
    errors,
  }

  // Store in cache only when using env keys
  if (!hasUserKeys) {
    enrichmentCache = { data, timestamp: Date.now() }
  }
  return data
}
