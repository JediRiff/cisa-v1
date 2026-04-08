// CAPRI Sector Keyword Taxonomy
// Single source of truth for mapping threat intelligence to energy sectors.
// Consolidates worldData.ts sectorKeywords + expandedSectorKeywords.

import type { EnergySector } from '@/components/map/types'
import { matchesIndicator } from './indicators'

// Comprehensive keyword lists per energy sector
export const SECTOR_KEYWORD_MAP: Record<EnergySector, string[]> = {
  nuclear: [
    'nuclear', 'NRC', 'reactor', 'radiation', 'fuel rod', 'containment', 'IAEA',
    'enrichment', 'centrifuge', 'Stuxnet', 'nuclear plant', 'nuclear power',
    'uranium', 'spent fuel', 'BWR', 'PWR', 'fission', 'small modular reactor', 'SMR',
    'nuclear facility', 'nuclear energy', 'nuclear site', 'nuclear generation',
    'coolant', 'control rod', 'meltdown', 'criticality',
  ],
  hydro: [
    'hydroelectric', 'dam', 'reservoir', 'spillway', 'hydropower', 'water turbine',
    'FERC', 'flood control', 'penstock', 'hydro plant', 'run-of-river',
    'hydro generation', 'hydro facility', 'hydroelectric plant',
  ],
  pump_storage: [
    'pumped storage', 'pumped hydro', 'pump storage', 'pumped-storage',
    'reversible turbine', 'upper reservoir', 'lower reservoir',
  ],
  gas: [
    'natural gas', 'LNG', 'compressor station', 'gas turbine', 'methane',
    'PHMSA', 'gas distribution', 'gas pipeline', 'gas pipelines',
    'liquefied natural gas', 'regasification', 'liquefaction',
    'Colonial Pipeline', 'combined cycle', 'gas-fired', 'gas plant',
    'gas facility', 'gas infrastructure', 'gas sector',
  ],
  oil: [
    'petroleum', 'refinery', 'crude oil', 'oil and petroleum',
    'strategic petroleum', 'SPR', 'petrochemical', 'distillation',
    'oil pipeline', 'oil refinery', 'oil and gas', 'oil & gas',
    'oil sector', 'oil industry', 'crude', 'Shamoon', 'Triton', 'TRISIS',
    'oil-fired', 'fuel oil', 'oil facility', 'oil infrastructure',
    'barrel', 'upstream', 'downstream', 'midstream',
  ],
  solar: [
    'solar', 'photovoltaic', 'PV', 'solar panel', 'solar farm', 'solar inverter',
    'solar array', 'solar generation', 'net metering', 'DERMS', 'distributed energy',
    'solar facility', 'solar plant', 'solar energy', 'solar power',
  ],
  wind: [
    'wind turbine', 'wind farm', 'wind energy', 'wind power', 'onshore wind',
    'wind generation', 'wind facility', 'wind plant',
  ],
  offshore_wind: [
    'offshore wind', 'offshore turbine', 'offshore energy', 'floating wind',
    'subsea cable', 'submarine cables', 'offshore platform', 'marine energy',
    'offshore facility',
  ],
  storage: [
    'battery storage', 'energy storage', 'BESS', 'lithium-ion', 'battery management',
    'grid storage', 'ESS', 'battery inverter', 'power storage',
    'storage facility', 'battery facility',
  ],
  coal: [
    'coal', 'coal-fired', 'coal plant', 'coal generation', 'fly ash',
    'coal combustion', 'scrubber', 'flue gas', 'pulverized coal', 'lignite',
    'coal facility', 'coal power',
  ],
  geothermal: [
    'geothermal', 'geothermal plant', 'geothermal energy', 'geothermal power',
    'hot springs', 'geothermal well', 'binary cycle', 'flash steam',
    'geothermal facility',
  ],
  biomass: [
    'biomass', 'biomass plant', 'biogas', 'bioenergy', 'waste-to-energy',
    'wood pellet', 'landfill gas', 'anaerobic digestion', 'biofuel',
    'biomass facility',
  ],
  other: [
    'power plant', 'generation', 'electricity', 'megawatt', 'utility',
    'data centers', 'data center',
  ],
}

// Cross-cutting keywords that apply to ALL energy sectors (ICS/SCADA/grid infrastructure)
export const CROSS_CUTTING_KEYWORDS: string[] = [
  'SCADA', 'ICS', 'PLC', 'HMI', 'RTU', 'DCS',
  'substation', 'substations', 'transformer', 'transmission',
  'Modbus', 'DNP3', 'IEC 61850', 'IEC 104', 'IEC 60870',
  'OPC UA', 'BACnet', 'Profinet', 'EtherNet/IP',
  'industrial control', 'operational technology',
  'Industroyer', 'CrashOverride', 'BlackEnergy', 'Havex',
  'Pipedream', 'Incontroller', 'FrostyGoop', 'CosmicEnergy',
  'NERC', 'CIP', 'smart grid', 'energy grid', 'electric grid', 'power grid',
  'power system', 'critical infrastructure',
  'fiber routes', 'fiber route',
]

// ICS vendor keywords — match to all sectors when in ICS context
const ICS_VENDOR_KEYWORDS: string[] = [
  'Siemens', 'Schneider Electric', 'ABB', 'Honeywell', 'Emerson',
  'Rockwell', 'GE Vernova', 'Yokogawa', 'Hitachi Energy',
]

/**
 * Classify a threat item into matching energy sectors.
 * Returns an array of EnergySector values that the threat matches.
 * An empty array means no sector match (not energy-relevant by sector).
 */
export function classifyThreatBySector(title: string, description: string): EnergySector[] {
  const text = (title + ' ' + description).toLowerCase()
  const sectors: EnergySector[] = []

  // Check each sector's keyword list
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORD_MAP)) {
    if (keywords.some(kw => matchesIndicator(text, kw))) {
      sectors.push(sector as EnergySector)
    }
  }

  // If cross-cutting ICS keywords match but no specific sector did,
  // classify as 'other' only — do NOT push into every sector.
  // This prevents generic "Siemens SCADA vuln" from showing under nuclear, gas, oil, etc.
  if (sectors.length === 0) {
    const crossCutMatch = CROSS_CUTTING_KEYWORDS.some(kw => matchesIndicator(text, kw))
    const vendorMatch = ICS_VENDOR_KEYWORDS.some(kw => matchesIndicator(text, kw))
    if (crossCutMatch || vendorMatch) {
      sectors.push('other')
    }
  }

  // If cross-cutting keywords appear alongside a specific sector,
  // they reinforce the match — no extra sectors needed

  return sectors
}

/**
 * Check if a text is relevant to a specific energy sector.
 */
export function isSectorRelevant(text: string, sector: EnergySector): boolean {
  const keywords = SECTOR_KEYWORD_MAP[sector]
  if (keywords.some(kw => matchesIndicator(text, kw))) return true
  // Cross-cutting keywords match all ICS-heavy sectors
  if (['nuclear', 'gas', 'oil', 'hydro', 'coal', 'other'].includes(sector)) {
    if (CROSS_CUTTING_KEYWORDS.some(kw => matchesIndicator(text, kw))) return true
  }
  return false
}
