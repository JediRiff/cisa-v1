// Supply Chain Dependency Graph for CAPRI Facility Risk Scoring
// Maps vendor dependencies to facilities so that KEV/CVE alerts only raise risk
// for facilities that actually depend on the affected vendor's equipment.

import { ENERGY_SECTOR_VENDORS } from './indicators'
import type { EnergyFacility, Sector } from '@/components/globe/worldData'

// ── Types ──

export interface VendorDependency {
  vendor: string           // Normalized vendor name (lowercase)
  products: string[]       // Product families used at this facility
  system: string           // System role (e.g., "EMS", "DCS", "protection relays")
  criticality: 'critical' | 'high' | 'moderate'
}

export interface VendorAlert {
  vendor: string           // Normalized vendor name
  kevCount: number
  cveCount: number
  products: string[]       // Affected product names from KEVs/threat items
  cveIds: string[]         // CVE IDs for linking to NVD
}

// ── Vendor Name Normalization ──

const VENDOR_ALIASES: Record<string, string> = {
  'siemens ag': 'siemens',
  'siemens energy': 'siemens',
  'rockwell automation': 'rockwell',
  'allen-bradley': 'rockwell',
  'allen bradley': 'rockwell',
  'hitachi energy': 'abb',
  'hitachi abb': 'abb',
  'abb ltd': 'abb',
  'ge digital': 'ge vernova',
  'ge hitachi': 'ge vernova',
  'ge grid solutions': 'ge vernova',
  'general electric': 'ge vernova',
  'osisoft': 'aveva',
  'wonderware': 'aveva',
  'schneider electric se': 'schneider electric',
  'schneider': 'schneider electric',
  'triconex': 'schneider electric',
  'emerson electric': 'emerson',
  'fisher controls': 'emerson',
  'deltav': 'emerson',
  'honeywell international': 'honeywell',
  'honeywell process': 'honeywell',
  'experion': 'honeywell',
  'yokogawa electric': 'yokogawa',
  'mitsubishi electric corporation': 'mitsubishi electric',
  'eaton corporation': 'eaton',
  'unitronics plc': 'unitronics',
  'phoenix contact gmbh': 'phoenix contact',
  'moxa inc': 'moxa',
  'schweitzer engineering': 'schweitzer',
  'sel': 'schweitzer',
  'curtiss-wright': 'curtiss-wright',
  'framatome': 'framatome',
  'westinghouse electric': 'westinghouse',
  'westinghouse': 'westinghouse',
  'voith hydro': 'voith',
  'voith': 'voith',
  'inductive automation': 'inductive automation',
  'kepware': 'kepware',
  'opto 22': 'opto 22',
}

/** Normalize a vendor name for matching. Tries aliases first, then direct ENERGY_SECTOR_VENDORS match. */
export function normalizeVendor(raw: string): string | null {
  const lower = raw.toLowerCase().trim()
  // Check aliases first
  if (VENDOR_ALIASES[lower]) return VENDOR_ALIASES[lower]
  // Check if it directly matches or contains an energy sector vendor name
  for (const v of ENERGY_SECTOR_VENDORS) {
    if (lower === v || lower.includes(v)) return v
  }
  // Check if any alias key is contained in the raw string
  for (const [alias, normalized] of Object.entries(VENDOR_ALIASES)) {
    if (lower.includes(alias)) return normalized
  }
  return null
}

// ── Sector-Default Vendor Profiles ──

const SECTOR_VENDOR_DEFAULTS: Record<Sector, VendorDependency[]> = {
  nuclear: [
    { vendor: 'ge vernova', products: ['turbine controls', 'reactor instrumentation'], system: 'Reactor Systems', criticality: 'critical' },
    { vendor: 'westinghouse', products: ['reactor design', 'fuel assemblies'], system: 'Reactor Systems', criticality: 'critical' },
    { vendor: 'honeywell', products: ['Experion PKS'], system: 'DCS', criticality: 'critical' },
    { vendor: 'emerson', products: ['DeltaV', 'Ovation'], system: 'DCS', criticality: 'high' },
    { vendor: 'schweitzer', products: ['SEL relays'], system: 'Protection Relays', criticality: 'high' },
    { vendor: 'framatome', products: ['fuel assemblies', 'instrumentation'], system: 'Fuel Systems', criticality: 'high' },
    { vendor: 'curtiss-wright', products: ['nuclear instrumentation'], system: 'Instrumentation', criticality: 'moderate' },
  ],
  grid: [
    { vendor: 'siemens', products: ['Spectrum Power', 'SICAM', 'protection relays'], system: 'EMS / Relays', criticality: 'critical' },
    { vendor: 'abb', products: ['HVDC transformers', 'ABB Ability'], system: 'Transformers / HVDC', criticality: 'critical' },
    { vendor: 'ge vernova', products: ['EMS XA/21', 'grid analytics'], system: 'EMS', criticality: 'critical' },
    { vendor: 'schweitzer', products: ['SEL-400 series', 'SEL-700 series'], system: 'Protection Relays', criticality: 'high' },
    { vendor: 'schneider electric', products: ['ADMS', 'PowerLogic'], system: 'Distribution Management', criticality: 'high' },
    { vendor: 'aveva', products: ['PI Historian', 'PI System'], system: 'Historian', criticality: 'moderate' },
  ],
  hydro: [
    { vendor: 'ge vernova', products: ['hydro turbines', 'excitation systems'], system: 'Turbines', criticality: 'critical' },
    { vendor: 'abb', products: ['generators', 'excitation'], system: 'Generators', criticality: 'critical' },
    { vendor: 'eaton', products: ['switchgear', 'circuit breakers'], system: 'Switchgear', criticality: 'high' },
    { vendor: 'voith', products: ['Kaplan turbines', 'Francis turbines'], system: 'Turbines', criticality: 'high' },
  ],
  natural_gas: [
    { vendor: 'honeywell', products: ['Experion PKS', 'Safety Manager'], system: 'DCS / Experion', criticality: 'critical' },
    { vendor: 'yokogawa', products: ['CENTUM VP', 'ProSafe-RS'], system: 'DCS', criticality: 'critical' },
    { vendor: 'emerson', products: ['DeltaV', 'DeltaV SIS'], system: 'DeltaV', criticality: 'critical' },
    { vendor: 'schneider electric', products: ['Triconex SIS', 'Tricon CX'], system: 'Triconex SIS', criticality: 'high' },
  ],
  oil: [
    { vendor: 'honeywell', products: ['Experion PKS', 'Safety Manager'], system: 'DCS', criticality: 'critical' },
    { vendor: 'emerson', products: ['DeltaV', 'ROC800'], system: 'DeltaV', criticality: 'critical' },
    { vendor: 'yokogawa', products: ['CENTUM VP'], system: 'DCS', criticality: 'high' },
    { vendor: 'schneider electric', products: ['Triconex SIS'], system: 'Triconex', criticality: 'high' },
    { vendor: 'abb', products: ['ACS880 drives', 'motor drives'], system: 'Motor Drives', criticality: 'moderate' },
  ],
  water: [
    { vendor: 'rockwell', products: ['ControlLogix', 'CompactLogix'], system: 'PLCs', criticality: 'critical' },
    { vendor: 'unitronics', products: ['Vision series', 'UniStream'], system: 'PLCs', criticality: 'high' },
    { vendor: 'schneider electric', products: ['Modicon M340', 'Modicon M580'], system: 'PLCs', criticality: 'high' },
    { vendor: 'siemens', products: ['S7-1200', 'S7-1500'], system: 'PLCs', criticality: 'high' },
  ],
}

/** Get the set of vendor names relevant to a given sector (for filtering vendor alerts). */
export function getSectorVendorNames(sector: Sector): Set<string> {
  const deps = SECTOR_VENDOR_DEFAULTS[sector] || SECTOR_VENDOR_DEFAULTS.grid
  return new Set(deps.map(d => d.vendor))
}

// ── Per-Facility Overrides ──

const FACILITY_VENDOR_OVERRIDES: Record<string, VendorDependency[]> = {
  // TVA nuclear plants — also use Siemens grid-side EMS
  'nuc-browns-ferry': [
    ...SECTOR_VENDOR_DEFAULTS.nuclear,
    { vendor: 'siemens', products: ['Spectrum Power EMS'], system: 'Grid-Side EMS', criticality: 'high' },
  ],
  'nuc-watts-bar': [
    ...SECTOR_VENDOR_DEFAULTS.nuclear,
    { vendor: 'siemens', products: ['Spectrum Power EMS'], system: 'Grid-Side EMS', criticality: 'high' },
  ],
  'nuc-sequoyah': [
    ...SECTOR_VENDOR_DEFAULTS.nuclear,
    { vendor: 'siemens', products: ['Spectrum Power EMS'], system: 'Grid-Side EMS', criticality: 'high' },
  ],
  // PJM Interconnection — GE Vernova EMS XA/21 as critical
  'grd-pjm': [
    ...SECTOR_VENDOR_DEFAULTS.grid,
    { vendor: 'ge vernova', products: ['EMS XA/21'], system: 'EMS', criticality: 'critical' },
  ],
  // ERCOT — ABB/Hitachi Energy SCADA as critical
  'grd-ercot': [
    ...SECTOR_VENDOR_DEFAULTS.grid,
    { vendor: 'abb', products: ['Hitachi Energy SCADA', 'MicroSCADA'], system: 'SCADA', criticality: 'critical' },
  ],
}

// ── Exported Functions ──

/** Get vendor dependencies for a facility. Uses per-facility override if available, else sector default. */
export function getVendorDependencies(facility: EnergyFacility): VendorDependency[] {
  return FACILITY_VENDOR_OVERRIDES[facility.id] || SECTOR_VENDOR_DEFAULTS[facility.sector] || []
}

/** Get all facilities that depend on a given vendor name (fuzzy-matched via normalization). */
export function getAffectedFacilities(vendorName: string, facilities: EnergyFacility[]): EnergyFacility[] {
  const normalized = normalizeVendor(vendorName)
  if (!normalized) return []
  return facilities.filter(f => {
    const deps = getVendorDependencies(f)
    return deps.some(d => d.vendor === normalized)
  })
}

/** Check if a vendor (by raw name) matches a dependency for a specific facility. Returns the matching dependency or null. */
export function matchVendorToFacility(vendorName: string, facility: EnergyFacility): VendorDependency | null {
  const normalized = normalizeVendor(vendorName)
  if (!normalized) return null
  const deps = getVendorDependencies(facility)
  return deps.find(d => d.vendor === normalized) || null
}

/** Aggregate per-vendor KEV/CVE counts from KEV actions and threat items with AI-extracted vendor info. */
export function buildVendorAlerts(
  kevItems: { vendor?: string; product?: string; cveId?: string }[],
  threatItems: { aiAffectedVendors?: string[]; title?: string; description?: string }[],
): VendorAlert[] {
  const alertMap = new Map<string, { kevCount: number; cveCount: number; products: Set<string>; cveIds: Set<string> }>()

  // Count KEVs per vendor
  for (const kev of kevItems) {
    if (!kev.vendor) continue
    const normalized = normalizeVendor(kev.vendor)
    if (!normalized) continue
    const entry = alertMap.get(normalized) || { kevCount: 0, cveCount: 0, products: new Set<string>(), cveIds: new Set<string>() }
    entry.kevCount++
    if (kev.product) entry.products.add(kev.product)
    if (kev.cveId) entry.cveIds.add(kev.cveId)
    alertMap.set(normalized, entry)
  }

  // Count CVEs from AI-extracted vendor mentions in threat items
  for (const item of threatItems) {
    if (!item.aiAffectedVendors || item.aiAffectedVendors.length === 0) continue
    for (const vendorName of item.aiAffectedVendors) {
      const normalized = normalizeVendor(vendorName)
      if (!normalized) continue
      const entry = alertMap.get(normalized) || { kevCount: 0, cveCount: 0, products: new Set<string>(), cveIds: new Set<string>() }
      entry.cveCount++
      alertMap.set(normalized, entry)
    }
  }

  // Convert to array
  return Array.from(alertMap.entries()).map(([vendor, data]) => ({
    vendor,
    kevCount: data.kevCount,
    cveCount: data.cveCount,
    products: Array.from(data.products),
    cveIds: Array.from(data.cveIds),
  }))
}
