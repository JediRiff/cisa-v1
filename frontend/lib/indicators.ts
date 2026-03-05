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

// ICS/SCADA/OT terms for industrial control system relevance detection
export const ICS_INDICATORS = [
  // Protocols
  'scada', 'ics', 'plc', 'hmi', 'rtu', 'dcs',
  'modbus', 'dnp3', 'iec 61850', 'iec 104', 'iec 60870',
  'opc', 'opc ua', 'bacnet', 'profinet', 'ethernet/ip',
  // Generic terms
  'industrial control', 'operational technology',
  // Major ICS vendors
  'siemens', 'schneider electric', 'rockwell', 'honeywell', 'unitronics',
  // ICS-targeted malware families
  'industroyer', 'crashoverride', 'havex', 'pipedream', 'incontroller',
  'frostygoop', 'cosmicenergy', 'triton', 'trisis',
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
