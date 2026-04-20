// CAPRI Sector Keyword Taxonomy — Vendor-Aware Classification
// Maps threat intelligence to energy sectors using 4 tiers:
//   1. Direct sector keywords (nuclear, pipeline, etc.)
//   2. Vendor-to-sector inference (Honeywell → nuclear, gas, oil)
//   3a. Perimeter security (Fortinet, Cisco ASA → ALL sectors)
//   3b. Enterprise IT mgmt (Ivanti EPM, Cisco SD-WAN Manager → 'other' only)
//   4. Equipment-based assumptions (DCS → nuclear/gas/oil, inverter → solar/storage)

import type { EnergySector } from '@/components/map/types'
import { matchesIndicator } from './indicators'

// ── Tier 1: Direct sector keywords ──

export const SECTOR_KEYWORD_MAP: Record<EnergySector, string[]> = {
  nuclear: [
    'nuclear', 'NRC', 'reactor', 'radiation', 'fuel rod', 'containment', 'IAEA',
    'enrichment', 'centrifuge', 'Stuxnet', 'nuclear plant', 'nuclear power',
    'uranium', 'spent fuel', 'BWR', 'PWR', 'fission', 'small modular reactor', 'SMR',
    'nuclear facility', 'nuclear energy', 'nuclear site', 'coolant', 'control rod',
  ],
  hydro: [
    'hydroelectric', 'dam', 'reservoir', 'spillway', 'hydropower', 'water turbine',
    'FERC', 'flood control', 'penstock', 'hydro plant', 'run-of-river',
  ],
  pump_storage: [
    'pumped storage', 'pumped hydro', 'pump storage', 'pumped-storage',
    'reversible turbine',
  ],
  gas: [
    'natural gas', 'LNG', 'compressor station', 'gas turbine', 'methane',
    'PHMSA', 'gas distribution', 'gas pipeline', 'gas pipelines',
    'liquefied natural gas', 'regasification', 'Colonial Pipeline',
    'combined cycle', 'gas-fired', 'gas plant', 'gas facility',
  ],
  oil: [
    'petroleum', 'refinery', 'crude oil', 'oil and petroleum',
    'strategic petroleum', 'SPR', 'petrochemical', 'distillation',
    'oil pipeline', 'oil refinery', 'oil and gas', 'oil & gas',
    'oil sector', 'Shamoon', 'Triton', 'TRISIS', 'oil-fired', 'fuel oil',
    'upstream', 'downstream', 'midstream',
  ],
  solar: [
    'solar', 'photovoltaic', 'PV', 'solar panel', 'solar farm', 'solar inverter',
    'solar array', 'net metering', 'DERMS', 'distributed energy',
  ],
  wind: [
    'wind turbine', 'wind farm', 'wind energy', 'wind power', 'onshore wind',
    'wind generation',
  ],
  offshore_wind: [
    'offshore wind', 'offshore turbine', 'floating wind',
    'subsea cable', 'submarine cables', 'offshore platform',
  ],
  storage: [
    'battery storage', 'energy storage', 'BESS', 'lithium-ion', 'battery management',
    'grid storage', 'ESS', 'battery inverter',
  ],
  coal: [
    'coal', 'coal-fired', 'coal plant', 'fly ash', 'coal combustion',
    'scrubber', 'flue gas', 'pulverized coal', 'lignite',
  ],
  geothermal: [
    'geothermal', 'geothermal plant', 'geothermal energy',
    'geothermal well', 'binary cycle', 'flash steam',
  ],
  biomass: [
    'biomass', 'biogas', 'bioenergy', 'waste-to-energy',
    'landfill gas', 'anaerobic digestion',
  ],
  other: [
    'power plant', 'electricity', 'utility', 'data center',
  ],
}

// ── Tier 2: OT/ICS vendor → sector mapping ──
// When an article mentions a vendor, it's relevant to every sector that uses that vendor.

const VENDOR_TO_SECTORS: Record<string, EnergySector[]> = {
  // ICS/OT vendors mapped to sectors that depend on their equipment
  'honeywell':          ['nuclear', 'gas', 'oil', 'coal', 'geothermal', 'biomass'],
  'experion':           ['nuclear', 'gas', 'oil'],
  'emerson':            ['nuclear', 'gas', 'oil', 'coal', 'geothermal', 'biomass'],
  'deltav':             ['nuclear', 'gas', 'oil'],
  'yokogawa':           ['gas', 'oil'],
  'centum':             ['gas', 'oil'],
  'schneider electric': ['gas', 'oil', 'storage', 'solar', 'other'],
  'schneider':          ['gas', 'oil', 'storage', 'solar', 'other'],
  'triconex':           ['gas', 'oil'],
  'modicon':            ['gas', 'oil', 'other'],
  'siemens':            ['wind', 'offshore_wind', 'coal', 'other'],
  'siemens gamesa':     ['wind', 'offshore_wind'],
  'abb':                ['hydro', 'pump_storage', 'oil', 'storage', 'offshore_wind', 'other'],
  'ge vernova':         ['nuclear', 'hydro', 'pump_storage', 'wind', 'other'],
  'westinghouse':       ['nuclear'],
  'framatome':          ['nuclear'],
  'curtiss-wright':     ['nuclear'],
  'schweitzer':         ['nuclear', 'other'],
  'sel relay':          ['nuclear', 'other'],
  'rockwell':           ['other'],
  'controllogix':       ['other'],
  'compactlogix':       ['other'],
  'unitronics':         ['other'],
  'eaton':              ['hydro', 'pump_storage', 'storage'],
  'voith':              ['hydro', 'pump_storage'],
  'vestas':             ['wind', 'offshore_wind'],
  'sma':                ['solar', 'storage'],
  'sma solar':          ['solar'],
  'enphase':            ['solar'],
  'aveva':              ['other'],
  'pi historian':       ['other'],
  'osisoft':            ['other'],
  'hitachi energy':     ['other', 'hydro'],
  'inductive automation': ['other'],
  'ignition':           ['other'],
  'wonderware':         ['other'],
  'opto 22':            ['other'],
  'kepware':            ['other'],
  'moxa':               ['other'],
  'phoenix contact':    ['other'],
  'codesys':            ['other'],
  'wago':               ['other'],
  'beckhoff':           ['other'],
}

// ── Tier 3a: Perimeter/OT-adjacent security (ALL sectors) ──
// Products deployed at the IT/OT boundary of every energy facility:
// firewalls, VPN concentrators, remote-access gateways, site edge devices.

const PERIMETER_SECURITY_VENDORS: string[] = [
  'fortinet', 'fortigate', 'fortios', 'fortimanager',
  'cisco asa', 'cisco ios-xe', 'cisco firepower', 'cisco anyconnect',
  'palo alto', 'pan-os', 'globalprotect',
  'juniper srx', 'junos',
  'f5 big-ip', 'big-ip',
  'citrix netscaler', 'netscaler adc', 'netscaler gateway',
  'sonicwall',
  'pulse secure', 'ivanti connect secure', 'ivanti pulse secure', 'ivanti policy secure',
  'sophos xg', 'sophos utm',
  'watchguard',
  'barracuda firewall', 'barracuda networkshield',
  'zyxel', 'netgear',
  'vmware esxi',
  'sierra wireless', 'lantronix', 'digi international',
]

// ── Tier 3b: Enterprise IT management (corporate HQ only) ──
// Management-plane products for corporate networks, MDM, backup, file transfer.
// These do NOT live on wind/nuclear/oil generation OT networks — only 'other'
// (corporate offices and data centers).

const ENTERPRISE_IT_MGMT_VENDORS: string[] = [
  'ivanti endpoint manager', 'ivanti epm', 'ivanti neurons', 'ivanti avalanche',
  'cisco sd-wan manager', 'cisco vmanage', 'cisco dna center', 'cisco meraki',
  'vmware vcenter', 'vcenter server', 'vmware nsx', 'vmware horizon',
  'connectwise', 'kaseya',
  'veeam',
  'progress moveit', 'moveit transfer',
  'qnap',
  'sophos central',
  'citrix virtual apps', 'citrix xenapp',
]

// ── Tier 4: Equipment-based inference ──
// Common equipment types → sectors that use them

const EQUIPMENT_TO_SECTORS: Record<string, EnergySector[]> = {
  'DCS':                  ['nuclear', 'gas', 'oil', 'coal', 'geothermal'],
  'distributed control':  ['nuclear', 'gas', 'oil', 'coal', 'geothermal'],
  'safety instrumented':  ['nuclear', 'gas', 'oil'],
  'SIS':                  ['nuclear', 'gas', 'oil'],
  'protection relay':     ['nuclear', 'hydro', 'other'],
  'circuit breaker':      ['nuclear', 'hydro', 'other'],
  'turbine control':      ['nuclear', 'gas', 'hydro', 'wind'],
  'inverter':             ['solar', 'storage', 'wind'],
  'compressor':           ['gas'],
  'refinery':             ['oil'],
  'distillation':         ['oil'],
  'SOHO router':          ['solar', 'wind', 'storage', 'biomass'],
  'small office':         ['solar', 'wind', 'storage', 'biomass'],
  'home router':          ['solar', 'wind', 'storage', 'biomass'],
  'emissions':            ['coal', 'gas', 'biomass'],
  'boiler':               ['coal', 'biomass', 'geothermal'],
  'switchgear':           ['nuclear', 'hydro', 'other'],
  'excitation':           ['hydro', 'pump_storage'],
  'penstock':             ['hydro'],
  'fuel assembly':        ['nuclear'],
  'reactor':              ['nuclear'],
}

const ALL_SECTORS: EnergySector[] = [
  'nuclear', 'hydro', 'pump_storage', 'gas', 'oil', 'solar', 'wind',
  'offshore_wind', 'storage', 'coal', 'geothermal', 'biomass', 'other',
]

/**
 * Classify a threat item into matching energy sectors using tiered intelligence:
 * 1.  Direct sector keywords (nuclear, pipeline, etc.)
 * 2.  Vendor-to-sector inference (Honeywell → nuclear, gas, oil)
 * 3a. Perimeter security (Fortinet, Cisco ASA → ALL sectors)
 * 3b. Enterprise IT mgmt (Ivanti EPM, Cisco SD-WAN Manager → 'other' only)
 * 4.  Equipment-based assumptions (DCS → nuclear, gas, oil)
 */
export function classifyThreatBySector(title: string, description: string): EnergySector[] {
  const text = (title + ' ' + description).toLowerCase()
  const sectorSet = new Set<EnergySector>()

  // Tier 1: Direct sector keyword match
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORD_MAP)) {
    if (keywords.some(kw => matchesIndicator(text, kw))) {
      sectorSet.add(sector as EnergySector)
    }
  }

  // Tier 2: Vendor-to-sector inference
  for (const [vendor, sectors] of Object.entries(VENDOR_TO_SECTORS)) {
    if (matchesIndicator(text, vendor)) {
      for (const s of sectors) sectorSet.add(s)
    }
  }

  // Tier 3a: Perimeter security → ALL sectors (firewalls/VPNs exist at every facility edge)
  if (PERIMETER_SECURITY_VENDORS.some(v => matchesIndicator(text, v))) {
    for (const s of ALL_SECTORS) sectorSet.add(s)
  }

  // Tier 3b: Enterprise IT management → only 'other' (corporate HQ, not generation OT)
  if (ENTERPRISE_IT_MGMT_VENDORS.some(v => matchesIndicator(text, v))) {
    sectorSet.add('other')
  }

  // Tier 4: Equipment-based inference
  for (const [equipment, sectors] of Object.entries(EQUIPMENT_TO_SECTORS)) {
    if (matchesIndicator(text, equipment)) {
      for (const s of sectors) sectorSet.add(s)
    }
  }

  return Array.from(sectorSet)
}

/**
 * Check if a text is relevant to a specific energy sector.
 */
export function isSectorRelevant(text: string, sector: EnergySector): boolean {
  const classified = classifyThreatBySector(text, '')
  return classified.includes(sector)
}

// Re-export for backward compatibility
export const CROSS_CUTTING_KEYWORDS: string[] = [
  'SCADA', 'ICS', 'PLC', 'HMI', 'RTU', 'DCS',
  'substation', 'substations', 'transformer', 'transmission',
  'Modbus', 'DNP3', 'IEC 61850', 'industrial control', 'operational technology',
  'critical infrastructure', 'NERC', 'CIP',
]
