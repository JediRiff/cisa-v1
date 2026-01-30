// CAPRI-E Threat Intelligence Feed Aggregator
// Fetches from 7 verified sources (Tiers 1-3)

export interface ThreatItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  source: string
  sourceType: 'government' | 'vendor' | 'energy'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown'
  isEnergyRelevant: boolean
}

export interface FeedResult {
  items: ThreatItem[]
  errors: string[]
  lastUpdated: string
  sourcesOnline: number
  sourcesTotal: number
}

// Feed source configuration
const FEED_SOURCES = [
  // Tier 1: Government
  { name: 'CISA KEV', url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', type: 'json', sourceType: 'government' as const },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', type: 'rss', sourceType: 'government' as const },

  // Tier 2: Security Vendors
  { name: 'Microsoft Security', url: 'https://www.microsoft.com/en-us/security/blog/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'Unit42', url: 'https://unit42.paloaltonetworks.com/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'CrowdStrike', url: 'https://www.crowdstrike.com/blog/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'SentinelOne', url: 'https://www.sentinelone.com/labs/feed/', type: 'rss', sourceType: 'vendor' as const },

  // Tier 3: Energy-Specific
  { name: 'Dragos', url: 'https://www.dragos.com/blog/feed/', type: 'rss', sourceType: 'energy' as const },
]

// Energy sector keywords for relevance detection
const ENERGY_KEYWORDS = [
  'energy', 'power', 'grid', 'electric', 'utility', 'utilities',
  'scada', 'ics', 'ot', 'operational technology', 'industrial control',
  'pipeline', 'oil', 'gas', 'lng', 'petroleum',
  'nuclear', 'reactor', 'renewable', 'solar', 'wind',
  'substation', 'transformer', 'transmission', 'distribution',
  'nerc', 'cip', 'ferc', 'smart grid', 'smart meter',
  'plc', 'rtu', 'hmi', 'dcs', 'modbus', 'dnp3', 'iec 61850',
  'critical infrastructure', 'volt typhoon', 'sandworm', 'xenotime',
  'chernovite', 'kamacite', 'havex', 'industroyer', 'crashoverride', 'triton'
]

function checkEnergyRelevance(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase()
  return ENERGY_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()))
}

function extractSeverity(title: string, description: string): ThreatItem['severity'] {
  const text = (title + ' ' + description).toLowerCase()
  if (text.includes('critical') || text.includes('emergency') || text.includes('actively exploited') || text.includes('zero-day')) return 'critical'
  if (text.includes('high') || text.includes('urgent') || text.includes('severe')) return 'high'
  if (text.includes('medium') || text.includes('moderate')) return 'medium'
  if (text.includes('low') || text.includes('informational')) return 'low'
  return 'unknown'
}

function parseRSS(xml: string, sourceName: string, sourceType: ThreatItem['sourceType']): ThreatItem[] {
  const items: ThreatItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]

    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Untitled'

    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/) || itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/)
    const link = linkMatch ? linkMatch[1].trim() : ''

    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemXml.match(/<description>([\s\S]*?)<\/description>/)
    const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 500).trim() : ''

    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)
    const pubDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()

    items.push({
      id: sourceName.replace(/\s/g, '-') + '-' + Math.random().toString(36).substring(2, 9),
      title,
      description,
      link,
      pubDate,
      source: sourceName,
      sourceType,
      severity: extractSeverity(title, description),
      isEnergyRelevant: checkEnergyRelevance(title, description)
    })
  }

  return items.slice(0, 15)
}

function parseKEV(json: any): ThreatItem[] {
  const vulnerabilities = json.vulnerabilities || []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return vulnerabilities
    .filter((vuln: any) => new Date(vuln.dateAdded) >= thirtyDaysAgo)
    .slice(0, 25)
    .map((vuln: any) => ({
      id: 'KEV-' + vuln.cveID,
      title: vuln.cveID + ': ' + vuln.vendorProject + ' ' + vuln.product,
      description: vuln.shortDescription || vuln.vulnerabilityName || 'No description',
      link: 'https://nvd.nist.gov/vuln/detail/' + vuln.cveID,
      pubDate: new Date(vuln.dateAdded).toISOString(),
      source: 'CISA KEV',
      sourceType: 'government' as const,
      severity: 'critical' as const,
      isEnergyRelevant: checkEnergyRelevance(vuln.vendorProject || '', vuln.shortDescription || '')
    }))
}

export async function fetchAllFeeds(): Promise<FeedResult> {
  const items: ThreatItem[] = []
  const errors: string[] = []
  let sourcesOnline = 0

  const fetchPromises = FEED_SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'CAPRI-E/1.0' },
        next: { revalidate: 300 }
      })

      if (!response.ok) throw new Error('HTTP ' + response.status)

      const text = await response.text()
      sourcesOnline++

      if (source.type === 'json') {
        return parseKEV(JSON.parse(text))
      } else {
        return parseRSS(text, source.name, source.sourceType)
      }
    } catch (error) {
      errors.push(source.name + ': ' + (error instanceof Error ? error.message : 'Failed'))
      return []
    }
  })

  const results = await Promise.all(fetchPromises)
  results.forEach(result => items.push(...result))

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return {
    items,
    errors,
    lastUpdated: new Date().toISOString(),
    sourcesOnline,
    sourcesTotal: FEED_SOURCES.length
  }
}