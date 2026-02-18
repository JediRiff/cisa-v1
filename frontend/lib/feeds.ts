// CAPRI Threat Intelligence Feed Aggregator
// Fetches from 12 verified sources (Tiers 1-3)

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
  // AI Analysis fields (populated by Claude analysis)
  aiSeverityScore?: number           // 1-10
  aiThreatType?: 'apt' | 'ransomware' | 'vulnerability' | 'supply-chain' | 'other'
  aiUrgency?: 'active' | 'imminent' | 'emerging' | 'historical'
  aiAffectedVendors?: string[]
  aiAffectedSystems?: string[]
  aiAffectedProtocols?: string[]
  aiRationale?: string
}

// Raw KEV item from CISA catalog (for actionable recommendations)
export interface KEVItem {
  cveID: string
  vendorProject: string
  product: string
  dueDate: string
  dateAdded: string
  shortDescription: string
  notes: string
  knownRansomwareCampaignUse: string
}

export interface FeedResult {
  items: ThreatItem[]
  kevItems: KEVItem[]  // Raw KEV data for recommendations
  errors: string[]
  lastUpdated: string
  sourcesOnline: number
  sourcesTotal: number
  deduplicatedCount: number
}

// Feed source configuration
const FEED_SOURCES = [
  // Tier 1: Government
  { name: 'CISA KEV', url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', type: 'json', sourceType: 'government' as const },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', type: 'rss', sourceType: 'government' as const },
  { name: 'UK NCSC', url: 'https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml', type: 'rss', sourceType: 'government' as const },

  // Tier 2: Security Vendors
  { name: 'Microsoft Security', url: 'https://www.microsoft.com/en-us/security/blog/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'Unit42', url: 'https://unit42.paloaltonetworks.com/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'CrowdStrike', url: 'https://www.crowdstrike.com/blog/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'SentinelOne', url: 'https://www.sentinelone.com/labs/feed/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'Cisco Talos', url: 'https://blog.talosintelligence.com/rss/', type: 'rss', sourceType: 'vendor' as const },

  // Tier 3: Advanced Threat Intelligence
  { name: 'Mandiant', url: 'https://cloudblog.withgoogle.com/topics/threat-intelligence/rss/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'Google TAG', url: 'https://blog.google/threat-analysis-group/rss/', type: 'rss', sourceType: 'vendor' as const },
  { name: 'DFIR Report', url: 'https://thedfirreport.com/feed/', type: 'rss', sourceType: 'vendor' as const },
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
  let kevItems: KEVItem[] = []
  let sourcesOnline = 0

  const fetchPromises = FEED_SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'CAPRI/1.0' },
        cache: 'no-store'
      })

      if (!response.ok) throw new Error('HTTP ' + response.status)

      const text = await response.text()
      sourcesOnline++

      if (source.type === 'json') {
        const json = JSON.parse(text)
        // Store raw KEV items for recommendations (most recent 10 by due date)
        const vulns = json.vulnerabilities || []
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        kevItems = vulns
          .filter((v: any) => new Date(v.dateAdded) >= thirtyDaysAgo)
          .sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
          .slice(0, 10)
          .map((v: any) => ({
            cveID: v.cveID,
            vendorProject: v.vendorProject,
            product: v.product,
            dueDate: v.dueDate,
            dateAdded: v.dateAdded,
            shortDescription: v.shortDescription || '',
            notes: v.notes || '',
            knownRansomwareCampaignUse: v.knownRansomwareCampaignUse || 'Unknown'
          }))
        return parseKEV(json)
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

  // Deduplicate: same CVE across multiple sources → keep highest-tier source
  const beforeCount = items.length
  const deduped = deduplicateItems(items)

  deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return {
    items: deduped,
    kevItems,
    errors,
    lastUpdated: new Date().toISOString(),
    sourcesOnline,
    sourcesTotal: FEED_SOURCES.length,
    deduplicatedCount: beforeCount - deduped.length
  }
}

// Deduplicate items by CVE ID (prefer government sources) and fuzzy title match
function deduplicateItems(items: ThreatItem[]): ThreatItem[] {
  const SOURCE_PRIORITY: Record<string, number> = { government: 3, energy: 2, vendor: 1 }
  const cveMap = new Map<string, ThreatItem>()
  const titleMap = new Map<string, ThreatItem>()
  const result: ThreatItem[] = []

  for (const item of items) {
    // Extract CVE IDs from title and description
    const cveMatches = (item.title + ' ' + item.description).match(/CVE-\d{4}-\d+/gi)

    if (cveMatches && cveMatches.length > 0) {
      const cveId = cveMatches[0].toUpperCase()
      const existing = cveMap.get(cveId)
      if (existing) {
        // Keep higher-priority source
        const existingPriority = SOURCE_PRIORITY[existing.sourceType] || 0
        const newPriority = SOURCE_PRIORITY[item.sourceType] || 0
        if (newPriority > existingPriority) {
          cveMap.set(cveId, item)
        }
      } else {
        cveMap.set(cveId, item)
      }
    } else {
      // No CVE — fuzzy match on normalized title (first 50 chars, lowercase, no punctuation)
      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').substring(0, 50).trim()
      if (normalizedTitle.length < 10) {
        result.push(item)
        continue
      }
      const existing = titleMap.get(normalizedTitle)
      if (existing) {
        const existingPriority = SOURCE_PRIORITY[existing.sourceType] || 0
        const newPriority = SOURCE_PRIORITY[item.sourceType] || 0
        if (newPriority > existingPriority) {
          titleMap.set(normalizedTitle, item)
        }
      } else {
        titleMap.set(normalizedTitle, item)
      }
    }
  }

  // Combine all unique items
  cveMap.forEach(item => result.push(item))
  titleMap.forEach(item => result.push(item))
  return result
}