// EIA-930 Hourly Grid Demand — real-time ISO/RTO utilization data
// Source: api.eia.gov/v2/electricity/rto/region-data/data/

export type StressLevel = 'normal' | 'elevated' | 'high' | 'critical'

export interface GridStressEntry {
  facilityId: string
  respondent: string
  demandMW: number
  peakCapacityMW: number
  utilization: number // 0-1
  stressLevel: StressLevel
  period: string
}

export interface GridStressResult {
  entries: GridStressEntry[]
  lastUpdated: string
  error?: string
}

// EIA respondent code → CAPRI facility id
const RESPONDENT_TO_FACILITY: Record<string, string> = {
  PJM: 'grd-pjm',
  ERCO: 'grd-ercot',
  CISO: 'grd-caiso',
  MISO: 'grd-miso',
  SWPP: 'grd-spp',
  NYIS: 'grd-nyiso',
  ISNE: 'grd-isone',
  BPAT: 'grd-bpa',
  TVA: 'grd-tva',
}

// Peak capacities in MW (parsed from energyFacilities capacity strings)
const PEAK_CAPACITY_MW: Record<string, number> = {
  PJM: 180000,
  ERCO: 85000,
  CISO: 50000,
  MISO: 127000,
  SWPP: 54000,
  NYIS: 33000,
  ISNE: 25000,
  BPAT: 31000,
  TVA: 30000,
}

const ALL_RESPONDENTS = Object.keys(RESPONDENT_TO_FACILITY)

function classifyStress(utilization: number): StressLevel {
  if (utilization > 0.95) return 'critical'
  if (utilization > 0.85) return 'high'
  if (utilization >= 0.70) return 'elevated'
  return 'normal'
}

// In-memory cache
let cachedResult: { data: GridStressResult; timestamp: number } | null = null
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export async function fetchGridStress(): Promise<GridStressResult> {
  const apiKey = process.env.EIA_API_KEY
  if (!apiKey) {
    return { entries: [], lastUpdated: new Date().toISOString(), error: 'No EIA_API_KEY configured' }
  }

  // Check cache
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL_MS) {
    return cachedResult.data
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      'frequency': 'hourly',
      'data[0]': 'value',
      'facets[type][]': 'D', // Demand
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      'length': '9',
    })

    // Add all respondent facets
    ALL_RESPONDENTS.forEach(r => {
      params.append('facets[respondent][]', r)
    })

    const url = `https://api.eia.gov/v2/electricity/rto/region-data/data/?${params.toString()}`
    const res = await fetch(url, { next: { revalidate: 0 } })

    if (!res.ok) {
      throw new Error(`EIA API returned ${res.status}`)
    }

    const json = await res.json()
    const rows = json?.response?.data || []

    const entries: GridStressEntry[] = []
    const seenRespondents = new Set<string>()

    for (const row of rows) {
      const respondent = row.respondent as string
      if (seenRespondents.has(respondent)) continue // Take only the latest per respondent
      seenRespondents.add(respondent)

      const facilityId = RESPONDENT_TO_FACILITY[respondent]
      const peakCapacityMW = PEAK_CAPACITY_MW[respondent]
      if (!facilityId || !peakCapacityMW) continue

      const demandMW = Number(row.value) || 0
      const utilization = Math.max(0, Math.min(demandMW / peakCapacityMW, 1.5)) // Allow slight over-capacity
      const stressLevel = classifyStress(utilization)

      entries.push({
        facilityId,
        respondent,
        demandMW,
        peakCapacityMW,
        utilization,
        stressLevel,
        period: row.period || '',
      })
    }

    const result: GridStressResult = {
      entries,
      lastUpdated: new Date().toISOString(),
    }

    cachedResult = { data: result, timestamp: Date.now() }
    return result
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown EIA error'
    console.error('EIA-930 fetch failed:', errorMsg)
    return {
      entries: [],
      lastUpdated: new Date().toISOString(),
      error: errorMsg,
    }
  }
}
