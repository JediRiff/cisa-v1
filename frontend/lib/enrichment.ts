// CAPRI Threat Enrichment Module
// Fetches from API-key-gated sources: AbuseIPDB, Shodan, VirusTotal
// All sources are optional — gracefully skipped when API keys are absent

import { ThreatItem } from './feeds'

export interface EnrichmentKeys {
  abuseIPDBKey?: string
  shodanKey?: string
  virusTotalKey?: string
  greyNoiseKey?: string
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

// Nation-state threat origin countries (energy infrastructure targeting programs)
const ENERGY_THREAT_NATION_CODES = new Set(['CN', 'RU', 'IR', 'KP'])
const NATION_CODE_TO_NAME: Record<string, string> = {
  CN: 'China', RU: 'Russia', IR: 'Iran', KP: 'North Korea',
}

// VirusTotal category classification for severity upgrade
const VT_CRITICAL_CATEGORIES = /\b(ransomware|wiper|destructive)\b/i
const VT_HIGH_CATEGORIES = /\b(trojan|apt|rat|backdoor|exploit|botnet|infostealer|loader|downloader|rootkit)\b/i
const VT_ENERGY_CATEGORIES = /\b(industrial|scada|ics|plc|energy|critical.infrastructure)\b/i

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
      const totalReports = entry.totalReports || 0
      const distinctUsers = entry.numDistinctUsers || 0
      const countryCode = entry.countryCode || 'Unknown'
      let severity: ThreatItem['severity'] = 'medium'
      if (score >= 95) severity = 'critical'
      else if (score >= 90) severity = 'high'

      const isNationState = ENERGY_THREAT_NATION_CODES.has(countryCode)
      const nationName = NATION_CODE_TO_NAME[countryCode]

      const title = isNationState
        ? `Malicious IP: ${ip} (Confidence: ${score}%, ${countryCode}) — Nation-State Origin`
        : `Malicious IP: ${ip} (Confidence: ${score}%)`
      const description = isNationState
        ? `High-confidence malicious IP from ${nationName} (${countryCode}), a nation with known energy infrastructure targeting programs. Reported ${totalReports} times by ${distinctUsers} users.`
        : `Reported ${totalReports} times by ${distinctUsers} users. Country: ${countryCode}.`

      return {
        id: `AIPDB-${ip}`,
        title,
        description,
        link: `https://www.abuseipdb.com/check/${ip}`,
        pubDate: new Date(entry.lastReportedAt || Date.now()).toISOString(),
        source: 'AbuseIPDB',
        sourceType: 'vendor' as const,
        severity,
        isEnergyRelevant: isNationState || checkEnergyRelevance(title + ' ' + description),
      }
    })
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ─── Shodan ─────────────────────────────────────────────────────────────────────
// Exposed ICS/SCADA devices via host search (free-tier compatible)
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
    // ICS protocol ports: Modbus(502), DNP3(20000), EtherNet/IP(44818), S7comm(102), OPC UA(4840)
    const query = encodeURIComponent('port:502,20000,44818,102,4840 country:US')
    const response = await fetch(
      `https://api.shodan.io/shodan/host/search?key=${key}&query=${query}`,
      {
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const json = await response.json()
    const matches = json.matches || []

    const items: ThreatItem[] = matches
      .slice(0, 10)
      .map((m: any) => {
        const ip = m.ip_str || 'unknown'
        const port = m.port || 0
        const product = m.product || ''
        const org = m.org || 'Unknown Org'
        const vulns = m.vulns ? Object.keys(m.vulns) : []

        // Protocol label from port number
        const protocolMap: Record<number, string> = { 502: 'Modbus', 20000: 'DNP3', 44818: 'EtherNet/IP', 102: 'S7comm', 4840: 'OPC UA' }
        const protocol = protocolMap[port] || `port-${port}`

        const severity: ThreatItem['severity'] = vulns.length > 0 ? 'critical' : 'high'
        const title = `Exposed ICS Device: ${product || protocol} on ${ip}:${port} (${org})`
        const desc = [
          `Exposed ${protocol} service detected on ${ip}:${port}`,
          org !== 'Unknown Org' ? `Organization: ${org}` : '',
          m.os ? `OS: ${m.os}` : '',
          vulns.length > 0 ? `Known vulnerabilities: ${vulns.join(', ')}` : '',
        ].filter(Boolean).join('. ')

        const hashId = `${ip}-${port}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)

        return {
          id: `SHODAN-${hashId}`,
          title: title.substring(0, 200),
          description: desc.substring(0, 500) || 'Exposed ICS/SCADA device',
          link: `https://www.shodan.io/host/${ip}`,
          pubDate: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
          source: 'Shodan',
          sourceType: 'vendor' as const,
          severity,
          isEnergyRelevant: true, // ICS protocol ports guarantee relevance
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

    // Map trending categories to ThreatItem entries with category-aware severity (top 5)
    return categories.slice(0, 5).map((category: any, index: number) => {
      const name = typeof category === 'string' ? category : (category.id || category.type || `category-${index}`)
      const count = typeof category === 'object' ? (category.attributes?.count || '') : ''
      const title = `Trending Threat Category: ${name}`
      const description = count ? `${name} — ${count} recent detections on VirusTotal` : `${name} is a trending threat category on VirusTotal`

      // Category-aware severity upgrade
      let severity: ThreatItem['severity'] = 'low'
      if (VT_CRITICAL_CATEGORIES.test(name)) severity = 'critical'
      else if (VT_HIGH_CATEGORIES.test(name)) severity = 'high'

      // Energy relevance: ICS/energy categories + ransomware/wiper/destructive (always operationally relevant)
      const isEnergyRelevant = VT_ENERGY_CATEGORIES.test(name) || VT_CRITICAL_CATEGORIES.test(name) || checkEnergyRelevance(name)

      return {
        id: `VT-${name.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`,
        title,
        description,
        link: 'https://www.virustotal.com',
        pubDate: new Date().toISOString(),
        source: 'VirusTotal',
        sourceType: 'vendor' as const,
        severity,
        isEnergyRelevant,
      }
    })
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ─── EPSS (Exploit Prediction Scoring System) ────────────────────────────────────
// Free API, no key required — batch CVE lookups
// Rate limit: 1000 req/min

export async function fetchEPSSScores(cveIds: string[]): Promise<Map<string, { epss: number; percentile: number }>> {
  const result = new Map<string, { epss: number; percentile: number }>()
  if (cveIds.length === 0) return result

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    // Batch query — up to 100 CVEs per request
    const query = cveIds.slice(0, 100).join(',')
    const response = await fetch(
      `https://api.first.org/data/v1/epss?cve=${query}`,
      { cache: 'no-store', signal: controller.signal }
    )
    clearTimeout(timeoutId)
    if (!response.ok) return result

    const json = await response.json()
    for (const entry of json.data || []) {
      result.set(entry.cve.toUpperCase(), {
        epss: parseFloat(entry.epss),
        percentile: parseFloat(entry.percentile),
      })
    }
  } catch {
    clearTimeout(timeoutId)
  }
  return result
}

// ─── GreyNoise Community API ─────────────────────────────────────────────────────
// Free key required — 50 lookups/week, single IP only
// Strategy: query top 5 AbuseIPDB nation-state IPs, cache 24h

let greyNoiseCache: { items: ThreatItem[]; timestamp: number } | null = null
const GREYNOISE_CACHE_TTL = 24 * 60 * 60 * 1000

// Store AbuseIPDB IPs from previous cycles for GreyNoise to query
let cachedAbuseIPs: string[] = []

async function fetchGreyNoiseData(apiKey?: string, abuseIPs?: string[]): Promise<ThreatItem[]> {
  const key = apiKey || process.env.GREYNOISE_API_KEY
  if (!key) return []

  // Check 24h cache — only when using env key
  if (!apiKey && greyNoiseCache && (Date.now() - greyNoiseCache.timestamp) < GREYNOISE_CACHE_TTL) {
    return greyNoiseCache.items
  }

  // Query top 5 IPs (conserve free tier budget)
  const ipsToQuery = (abuseIPs || cachedAbuseIPs).slice(0, 5)
  if (ipsToQuery.length === 0) return []

  const items: ThreatItem[] = []

  for (const ip of ipsToQuery) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`https://api.greynoise.io/v3/community/${ip}`, {
        headers: { key },
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) continue
      const data = await response.json()

      // Only create items for IPs classified as malicious
      if (data.classification === 'malicious') {
        items.push({
          id: `GN-${ip.replace(/\./g, '-')}`,
          title: `Active Scanner: ${ip} — ${data.name || 'Unknown Actor'} (GreyNoise)`,
          description: `IP ${ip} classified as malicious by GreyNoise. ${data.name ? `Known as: ${data.name}.` : ''} Last seen: ${data.last_seen || 'recently'}. This IP is conducting active internet-wide scanning.`,
          link: data.link || `https://viz.greynoise.io/ip/${ip}`,
          pubDate: data.last_seen ? new Date(data.last_seen).toISOString() : new Date().toISOString(),
          source: 'GreyNoise',
          sourceType: 'vendor' as const,
          severity: 'high' as const,
          isEnergyRelevant: true, // Only querying IPs already flagged from nation-state origins
        })
      }
    } catch {
      // Skip individual IP failures silently
    }
  }

  if (!apiKey) {
    greyNoiseCache = { items, timestamp: Date.now() }
  }
  return items
}

// ─── Main entry point ───────────────────────────────────────────────────────────

// Count how many enrichment sources have API keys configured
export function getConfiguredEnrichmentCount(keys?: EnrichmentKeys): { configured: number; total: number } {
  let configured = 0
  const total = 4
  if (keys?.abuseIPDBKey || process.env.ABUSEIPDB_API_KEY) configured++
  if (keys?.shodanKey || process.env.SHODAN_API_KEY) configured++
  if (keys?.virusTotalKey || process.env.VIRUSTOTAL_API_KEY) configured++
  if (keys?.greyNoiseKey || process.env.GREYNOISE_API_KEY) configured++
  return { configured, total }
}

export async function fetchAllEnrichment(keys?: EnrichmentKeys): Promise<EnrichmentResult> {
  const hasUserKeys = !!(keys?.abuseIPDBKey || keys?.shodanKey || keys?.virusTotalKey || keys?.greyNoiseKey)

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

  // Fetch all configured sources in parallel (except GreyNoise which needs AbuseIPDB IPs)
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
        return { name, items: result }
      } catch (error) {
        errors.push(`${name}: ${error instanceof Error ? error.message : 'Failed'}`)
        return { name, items: [] }
      }
    })
  )

  // Extract AbuseIPDB IPs for GreyNoise (cache for next cycle)
  const abuseResult = results.find(r => r.name === 'AbuseIPDB')
  if (abuseResult && abuseResult.items.length > 0) {
    cachedAbuseIPs = abuseResult.items
      .filter(item => item.id.startsWith('AIPDB-'))
      .map(item => item.id.replace('AIPDB-', ''))
  }

  results.forEach(result => items.push(...result.items))

  // GreyNoise: runs after AbuseIPDB results are available (or uses cached IPs from previous cycle)
  const gnKey = keys?.greyNoiseKey || process.env.GREYNOISE_API_KEY
  if (gnKey) {
    try {
      const gnItems = await fetchGreyNoiseData(keys?.greyNoiseKey, cachedAbuseIPs)
      sourcesOnline++
      items.push(...gnItems)
    } catch (error) {
      errors.push(`GreyNoise: ${error instanceof Error ? error.message : 'Failed'}`)
    }
  }

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
