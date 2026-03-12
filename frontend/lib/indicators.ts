// CAPRI Canonical Indicator Lists
// Single source of truth for nation-state actors, ICS/SCADA terms, and energy keywords.
// All consumers import from here to prevent list divergence.

// Nation-state actors and groups known to target energy/critical infrastructure
export const NATION_STATE_INDICATORS = [
  // Chinese APTs
  'volt typhoon', 'salt typhoon', 'flax typhoon', 'brass typhoon',
  'ethereal panda', 'winnti', 'apt41',
  // Russian APTs
  'sandworm', 'dragonfly', 'energetic bear', 'turla',
  'fancy bear', 'cozy bear', 'apt28', 'apt29',
  'seashell blizzard', 'forest blizzard', 'midnight blizzard',
  'secret blizzard', 'ghost blizzard',
  // Iranian APTs
  'cyberav3ngers', 'muddywater', 'oilrig', 'charming kitten',
  'apt33', 'apt34', 'apt35',
  'mango sandstorm', 'hazel sandstorm',
  'peach sandstorm', 'mint sandstorm',
  // North Korean APTs
  'lazarus', 'kimsuky', 'andariel',
  'diamond sleet', 'emerald sleet', 'onyx sleet',
  // ICS-specific threat groups
  'xenotime', 'chernovite', 'kamacite', 'temp.veles',
  // Generic nation-state terms
  'china', 'russia', 'iran', 'north korea', 'dprk',
  'nation-state', 'state-sponsored',
] as const

// ── ICS/SCADA Indicators (split for context-aware matching) ──

// Terms that directly indicate ICS/SCADA/OT context (always match on their own)
export const ICS_TERMS = [
  // Protocols & technologies
  'scada', 'plc', 'hmi', 'rtu', 'dcs',
  'modbus', 'dnp3', 'iec 61850', 'iec 104', 'iec 60870',
  'opc ua', 'bacnet', 'profinet', 'ethernet/ip',
  // Generic terms
  'industrial control', 'operational technology',
  // ICS-targeted malware families
  'industroyer', 'crashoverride', 'havex', 'pipedream', 'incontroller',
  'frostygoop', 'cosmicenergy', 'triton', 'trisis',
] as const

// Vendor names that only indicate ICS context when paired with an ICS term
export const ICS_VENDORS = [
  'siemens', 'schneider electric', 'rockwell', 'honeywell',
  'unitronics', 'abb', 'emerson', 'yokogawa', 'ge vernova',
  'eaton', 'mitsubishi electric',
] as const

// Combined list for backward-compat (used where context matching isn't needed)
export const ICS_INDICATORS = [...ICS_TERMS, ...ICS_VENDORS] as const

// Energy sector vendors whose KEVs/CVEs are relevant to the energy score
export const ENERGY_SECTOR_VENDORS = [
  // ICS/OT vendors
  'siemens', 'schneider electric', 'rockwell', 'rockwell automation',
  'honeywell', 'unitronics', 'abb', 'emerson', 'yokogawa',
  'ge vernova', 'ge digital', 'eaton', 'mitsubishi electric',
  'hitachi energy', 'hitachi', 'delta electronics', 'omron',
  'advantech', 'wago', 'beckhoff', 'b&r', 'red lion',
  'sel', 'schweitzer', 'tridium', 'niagara',
  // SCADA/DCS/historian software vendors
  'inductive automation', 'ignition', 'wonderware', 'aveva',
  'opto 22', 'kepware', 'moxa', 'phoenix contact',
  'osisoft', 'pi server', 'codesys', 'prosoft',
  // Network/security infrastructure common in energy utility environments
  'cisco', 'fortinet', 'palo alto', 'juniper',
  'lantronix', 'digi international', 'sierra wireless',
  'ivanti', 'sonicwall', 'zyxel', 'barracuda',
  'f5', 'citrix', 'pulse secure', 'vmware',
  'sophos', 'watchguard', 'netgear', 'qnap',
  'progress', 'connectwise', 'veeam',
] as const

// Energy sector keywords for relevance detection
export const ENERGY_KEYWORDS = [
  'energy', 'power', 'grid', 'electric', 'utility', 'utilities',
  'scada', 'ics', 'operational technology', 'industrial control',
  'pipeline', 'oil and gas', 'oil & gas', 'petroleum', 'lng',
  'nuclear', 'reactor', 'renewable', 'solar', 'wind',
  'substation', 'transformer', 'transmission', 'distribution',
  'nerc', 'cip', 'ferc', 'smart grid', 'smart meter',
  'plc', 'rtu', 'hmi', 'dcs', 'modbus', 'dnp3', 'iec 61850',
  'critical infrastructure', 'volt typhoon', 'sandworm', 'xenotime',
  'chernovite', 'kamacite', 'havex', 'industroyer', 'crashoverride', 'triton',
  'refinery', 'crude oil', 'natural gas', 'oil pipeline', 'oil sector',
  // Additional infrastructure terms
  'hydroelectric', 'turbine', 'generator', 'fuel', 'dam',
  'water treatment', 'wastewater', 'building automation',
  'firmware', 'embedded device', 'vpn', 'remote access',
  'firewall', 'gateway',
] as const

// Vulnerability terms that only indicate energy relevance when paired with an energy/ICS context
const CONTEXTUAL_VULN_TERMS = [
  'authentication bypass', 'remote code execution',
] as const

// Word-boundary regex matcher with shared cache.
// Prevents false positives (e.g., 'ics' won't match 'logistics', 'oil' won't match 'soil').
const _regexCache = new Map<string, RegExp>()
export function matchesIndicator(text: string, indicator: string): boolean {
  let regex = _regexCache.get(indicator)
  if (!regex) {
    const escaped = indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    regex = new RegExp(`\\b${escaped}\\b`, 'i')
    _regexCache.set(indicator, regex)
  }
  return regex.test(text)
}

/**
 * Context-aware ICS matching: direct ICS terms always match,
 * but vendor names only match if an ICS context term also appears in the text.
 * Prevents "Siemens earnings report" from triggering ICS classification.
 */
export function matchesICSContext(text: string): boolean {
  const lower = text.toLowerCase()
  // Direct ICS terms — always match
  if (ICS_TERMS.some(term => matchesIndicator(lower, term))) return true
  // Vendor names — only match if an ICS context term is also present
  if (ICS_VENDORS.some(vendor => matchesIndicator(lower, vendor))) {
    return ICS_TERMS.some(term => matchesIndicator(lower, term))
  }
  return false
}

/**
 * Check if a KEV entry is relevant to the energy sector.
 * Matches if the vendor is an energy/ICS vendor, the product name matches,
 * OR the description contains energy keywords.
 * Contextual vuln terms (e.g. "remote code execution") only match when an
 * energy/ICS term is also present.
 */
export function isEnergyRelevantKEV(vendor: string, description: string, product?: string): boolean {
  const vendorLower = vendor.toLowerCase()
  // Check if vendor is an energy sector vendor
  if (ENERGY_SECTOR_VENDORS.some(v => vendorLower.includes(v))) return true
  // Check if product name matches a known energy vendor/keyword
  if (product) {
    const productLower = product.toLowerCase()
    if (ENERGY_SECTOR_VENDORS.some(v => productLower.includes(v))) return true
  }
  // Check if description or product mentions energy/ICS keywords
  const text = vendor + ' ' + (product || '') + ' ' + description
  if (ENERGY_KEYWORDS.some(kw => matchesIndicator(text, kw))) return true
  // Contextual vuln terms — only match when paired with an energy/ICS indicator
  if (CONTEXTUAL_VULN_TERMS.some(term => matchesIndicator(text, term))) {
    const hasEnergyContext = [...ICS_TERMS, ...ICS_VENDORS, ...ENERGY_SECTOR_VENDORS]
      .some(ctx => matchesIndicator(text, ctx))
    if (hasEnergyContext) return true
  }
  return false
}
