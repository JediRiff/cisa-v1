'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Shield,
  Activity,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Crosshair,
  Bell,
} from 'lucide-react'
import {
  Sector,
  matchesSectorKeywords,
  threatActors as allThreatActors,
  energyFacilities,
  calculateFacilityRisk,
} from '@/components/globe/worldData'
import {
  LayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  SelectedFeature,
} from '@/components/map/types'
import type { CampaignCandidate } from '@/lib/campaign-correlation'
import type { VendorAlert } from '@/lib/supply-chain'
import LayerPanel from '@/components/map/LayerPanel'
import DetailPanel from '@/components/map/DetailPanel'
import FacilityPopup from '@/components/map/FacilityPopup'
import AlertSettingsPanel from '@/components/AlertSettingsPanel'
import { AlertConfig, loadAlertConfig } from '@/lib/alertRules'
import { evaluateAlertRules, dispatchAlerts, AlertContext } from '@/lib/alertEvaluator'

// Dynamic import for the new MapLibre-based ThreatMap (no SSR)
const ThreatMap = dynamic(() => import('@/components/map/ThreatMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#030810]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70 text-sm font-mono">Initializing Map...</p>
      </div>
    </div>
  ),
})

// ── Types ──

interface ThreatData {
  score: { score: number; label: string; color: string; factors: any[] }
  threats: { all: any[]; energyRelevant: any[]; critical: any[] }
  campaigns?: CampaignCandidate[]
  gridStress?: { facilityId: string; respondent: string; demandMW: number; peakCapacityMW: number; utilization: number; stressLevel: string; period: string }[]
  kev: any[]
  vendorAlerts?: VendorAlert[]
  meta: {
    sourcesOnline: number
    sourcesTotal: number
    totalItems: number
    errors: string[]
    activeCampaigns?: number
    vendorAlertCount?: number
    last24h: { kev: number; nationState: number; ics: number; total: number }
    icsExposure?: { count: number; hasShodanKey: boolean }
  }
}

// ── Helpers ──

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
    case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
    case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
  }
}

function getScoreColor(score: number): string {
  if (score <= 2) return 'text-red-400'
  if (score <= 3) return 'text-amber-400'
  return 'text-emerald-400'
}

// ASCII art digit glyphs (5 rows each)
const ASCII_DIGITS: Record<string, string[]> = {
  '0': [' ██████╗ ','██╔═══██╗','██║   ██║','╚██████╔╝',' ╚═════╝ '],
  '1': [' ██╗','███║','╚██║',' ██║',' ╚═╝'],
  '2': ['██████╗ ','╚════██╗',' █████╔╝','██╔═══╝ ','███████╗'],
  '3': ['██████╗ ','╚════██╗',' █████╔╝','██╔══██║','╚█████╔╝'],
  '4': ['██╗██╗','██║██║','╚████║',' ╚═██║','   ╚═╝'],
  '5': ['███████╗','██╔════╝','███████╗','╚════██║','██████╔╝'],
  '6': [' ██████╗ ','██╔════╝ ','██████╗  ','██╔══██║ ','╚█████╔╝ '],
  '7': ['███████╗','╚════██║','    ██╔╝','   ██╔╝ ','   ██║  '],
  '8': [' █████╗ ','██╔══██╗','╚█████╔╝','██╔══██║','╚█████╔╝'],
  '9': [' █████╗ ','██╔══██╗','╚██████║',' ╚═══██║',' █████╔╝'],
  '.': ['   ','   ','   ','██╗','╚═╝'],
}

function scoreToAscii(score: number): string {
  const chars = score.toFixed(1).split('')
  const rows: string[] = []
  for (let row = 0; row < 5; row++) {
    rows.push(chars.map(ch => ASCII_DIGITS[ch]?.[row] ?? '').join(' '))
  }
  return rows.join('\n')
}

// Map new EnergySector to legacy Sector for facility risk lookups
function mapToLegacySector(sector: string): Sector | null {
  const mapping: Record<string, Sector> = {
    nuclear: 'nuclear',
    hydro: 'hydro',
    pump_storage: 'hydro',
    gas: 'natural_gas',
    coal: 'grid',
    oil: 'oil',
    solar: 'grid',
    wind: 'grid',
    offshore_wind: 'grid',
    storage: 'grid',
    geothermal: 'grid',
    biomass: 'grid',
    other: 'grid',
  }
  return mapping[sector] || null
}

// Filter threats by sector keywords (word-boundary matching)
function filterBySector(items: any[], sector: Sector): any[] {
  return items.filter((item) => {
    const text = `${item.title || ''} ${item.shortDescription || ''} ${item.description || ''}`
    return matchesSectorKeywords(text, sector)
  })
}

// ── Main Page Component ──

export default function GlobePage() {
  const [data, setData] = useState<ThreatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [attackCount, setAttackCount] = useState(0)

  // Selected feature from the map
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null)
  // Hover feature for popup
  const [hoveredFeature, setHoveredFeature] = useState<{ feature: SelectedFeature; position: { x: number; y: number } } | null>(null)

  // Layer visibility state — persisted to localStorage
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(() => {
    if (typeof window === 'undefined') return DEFAULT_LAYER_VISIBILITY
    try {
      const saved = localStorage.getItem('capri-map-layer-visibility')
      return saved ? { ...DEFAULT_LAYER_VISIBILITY, ...JSON.parse(saved) } : DEFAULT_LAYER_VISIBILITY
    } catch {
      return DEFAULT_LAYER_VISIBILITY
    }
  })

  // Alert configuration state
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(() => loadAlertConfig())

  function handleLayerToggle(key: keyof LayerVisibility) {
    setLayerVisibility(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('capri-map-layer-visibility', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // ── Data Fetching ──

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/threats')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
    } catch {
      console.error('Failed to fetch threat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Simulated live attack counter
  useEffect(() => {
    const base = data?.meta?.totalItems || 1247
    setAttackCount(base)
    const interval = setInterval(() => {
      setAttackCount((prev) => prev + Math.floor(Math.random() * 3))
    }, 3000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [data?.meta?.totalItems])

  // ── Computed Values ──

  // Top 10 critical threats for sidebar
  const topThreats = useMemo(() => {
    if (!data) return []
    const all = [...(data.threats.critical || []), ...(data.threats.all || [])]
    const seen = new Set<string>()
    return all.filter((t) => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    }).slice(0, 10)
  }, [data])

  // Medium/high campaigns for sidebar display
  const activeCampaigns = useMemo(() => {
    if (!data?.campaigns) return []
    return data.campaigns.filter(c => c.confidence === 'high' || c.confidence === 'medium')
  }, [data?.campaigns])

  // Facility risk scores for map visualization
  const facilityRiskScores = useMemo(() => {
    if (!data) return {}
    const scores: Record<string, number> = {}
    for (const facility of energyFacilities) {
      const risk = calculateFacilityRisk(facility, data.threats.all || [], data.kev || [], data.gridStress, data.vendorAlerts)
      scores[facility.id] = risk.score
    }
    return scores
  }, [data])

  // ── Detail panel computed data ──

  // Risk for selected feature
  const selectedRisk = useMemo(() => {
    if (!selectedFeature || !data) return null
    if (selectedFeature.type === 'threat_actor') return null
    // Find matching legacy facility for risk calc
    const facilityId = selectedFeature.properties.id as string | undefined
    if (!facilityId) return null
    const facility = energyFacilities.find(f => f.id === facilityId)
    if (!facility) return null
    return calculateFacilityRisk(
      facility,
      data.threats.all || [],
      data.kev || [],
      data.gridStress,
      data.vendorAlerts,
    )
  }, [selectedFeature, data])

  // Sector threats for selected feature
  const selectedSectorThreats = useMemo(() => {
    if (!selectedFeature || !data) return []
    let sector: Sector | null = null
    if (selectedFeature.type === 'plant') {
      sector = mapToLegacySector(selectedFeature.properties.sector as string) || 'grid'
    } else if (selectedFeature.type === 'threat_actor') {
      // For threat actors, show threats matching their target sectors
      const actorName = (selectedFeature.properties.name as string || '').toLowerCase()
      const allItems = [...(data.threats.all || []), ...(data.kev || [])]
      return allItems.filter((item) => {
        const text = `${item.title || ''} ${item.shortDescription || ''} ${item.description || ''}`.toLowerCase()
        return text.includes(actorName)
      }).slice(0, 8)
    } else {
      sector = 'grid' // Default for infrastructure
    }
    if (!sector) return []
    const allItems = [...(data.threats.all || []), ...(data.kev || [])]
    return filterBySector(allItems, sector).slice(0, 8)
  }, [selectedFeature, data])

  // Targeting actors for selected feature
  const selectedTargetingActors = useMemo(() => {
    if (!selectedFeature || selectedFeature.type === 'threat_actor') return []
    let sector: Sector | null = null
    if (selectedFeature.type === 'plant') {
      sector = mapToLegacySector(selectedFeature.properties.sector as string) || 'grid'
    } else {
      sector = 'grid'
    }
    if (!sector) return []
    return allThreatActors.filter((a) => a.targetSectors.includes(sector!))
  }, [selectedFeature])

  // Campaigns for selected feature
  const selectedCampaigns = useMemo(() => {
    if (!selectedFeature || !data?.campaigns) return []
    if (selectedFeature.type === 'threat_actor') {
      const name = selectedFeature.properties.name as string
      return data.campaigns.filter(c => c.actorName === name)
    }
    // For facilities: campaigns affecting the sector
    let sector: Sector | null = null
    if (selectedFeature.type === 'plant') {
      sector = mapToLegacySector(selectedFeature.properties.sector as string) || 'grid'
    } else {
      sector = 'grid'
    }
    if (!sector) return []
    return data.campaigns.filter(c => c.affectedSectors.includes(sector!))
  }, [selectedFeature, data?.campaigns])

  // Vendor alerts for selected feature
  const selectedVendorAlerts = useMemo(() => {
    if (!selectedFeature || !data?.vendorAlerts) return []
    if (selectedFeature.type === 'threat_actor') return []
    return data.vendorAlerts.filter(a => a.kevCount > 0 || a.cveCount > 0)
  }, [selectedFeature, data?.vendorAlerts])

  // ── Alert Rule Evaluation ──

  useEffect(() => {
    if (!data || !alertConfig.webhookUrl) return
    const context: AlertContext = {
      capriScore: data.score?.score ?? 5,
      kevItems: data.kev || [],
      threatItems: data.threats?.all || [],
      facilityRiskScores,
    }
    const alerts = evaluateAlertRules(alertConfig, context)
    if (alerts.length > 0) {
      dispatchAlerts(alertConfig, alerts).then(() => {
        setAlertConfig(loadAlertConfig())
      })
    }
  }, [data, facilityRiskScores]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Feature Selection ──

  function handleFeatureSelect(feature: SelectedFeature | null) {
    setSelectedFeature(feature)
  }

  return (
    <div className="h-[calc(100vh-84px)] flex flex-col bg-[#030810] text-white overflow-hidden">
      {/* Top Stats Bar */}
      <div className="flex-shrink-0 h-10 bg-[#0a1628]/90 border-b border-white/[0.04] flex items-center justify-between px-4 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:inline">Dashboard</Link>
            <span className="text-gray-600 hidden sm:inline">/</span>
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">CAPRI Threat Map</span>
          </div>
          <div className="hidden md:flex items-center gap-5 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-gray-400">LIVE</span>
            </div>
            <div>
              <span className="text-gray-500">IOCs: </span>
              <span className="text-white">{attackCount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Active Threats: </span>
              <span className="text-red-400">{data?.meta?.last24h?.total || '--'}</span>
            </div>
            <div>
              <span className="text-gray-500">Campaigns: </span>
              <span className={(data?.meta?.activeCampaigns || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {data?.meta?.activeCampaigns ?? '--'}
              </span>
            </div>
            {data?.meta?.icsExposure?.hasShodanKey && (
              <div>
                <span className="text-gray-500">ICS Exposed: </span>
                <span className={data.meta.icsExposure.count > 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {data.meta.icsExposure.count}
                </span>
              </div>
            )}
            {data?.gridStress && data.gridStress.length > 0 && (() => {
              const stressedCount = data.gridStress.filter(g => g.stressLevel !== 'normal').length
              return stressedCount > 0 ? (
                <div>
                  <span className="text-gray-500">Grid Stress: </span>
                  <span className="text-amber-400">{stressedCount} ISO{stressedCount !== 1 ? 's' : ''}</span>
                </div>
              ) : null
            })()}
            {(data?.meta?.vendorAlertCount ?? 0) > 0 && (
              <div>
                <span className="text-gray-500">Vendor Alerts: </span>
                <span className="text-orange-400">{data!.meta.vendorAlertCount}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Sources: </span>
              <span className="text-emerald-400">{data?.meta?.sourcesOnline || '--'}/{data?.meta?.sourcesTotal || '--'}</span>
            </div>
            <div>
              <span className="text-gray-500">CAPRI Score: </span>
              <span className={getScoreColor(data?.score?.score || 5)}>
                {data?.score?.score?.toFixed(1) || '--'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAlertSettingsOpen(true)}
            className="text-gray-400 hover:text-amber-400 transition-colors relative"
            title="Alert Settings"
          >
            <Bell className="w-4 h-4" />
            {alertConfig.webhookUrl && alertConfig.rules.some(r => r.enabled) && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
          <button onClick={fetchData} className="text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="md:hidden text-gray-400 hover:text-white transition-colors text-xs font-mono border border-gray-700 px-2 py-1 rounded"
          >
            Threats
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Viewport */}
        <div className="flex-1 relative">
          <ThreatMap
            visibleLayers={layerVisibility}
            threatData={data as unknown as Record<string, unknown> | undefined}
            onFeatureSelect={handleFeatureSelect}
            className="w-full h-full"
          />

          {/* Overlay: Score Badge — positioned below legend */}
          {data?.score && !selectedFeature && (
            <div className="absolute top-[calc(var(--legend-height,360px)+24px)] left-4 z-20 bg-[#0a1628]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl px-4 py-3 shadow-2xl" style={{ minWidth: 200 }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">CAPRI Score</p>
              <pre
                className={`text-[7px] leading-[1.15] font-mono select-none ${getScoreColor(data.score.score)}`}
                aria-hidden="true"
              >{scoreToAscii(data.score.score)}</pre>
              <span className="sr-only">{data.score.score.toFixed(1)}</span>
              <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${getScoreColor(data.score.score)}`}>
                [ {data.score.label} ]
              </p>
            </div>
          )}

          {/* Overlay: Bottom-left status widgets — glass morphism */}
          <div className="absolute bottom-4 left-4 z-20 flex items-end gap-2">
            <div className="bg-[#0a1628]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-red-400 animate-pulse" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Observed Attacks</p>
                  <p className="text-lg font-bold font-mono text-red-400">{attackCount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            {data?.kev && data.kev.length > 0 && (
              <div className="bg-[#0a1628]/85 backdrop-blur-xl border border-red-500/10 rounded-xl px-4 py-3 shadow-2xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Active KEVs</p>
                    <p className="text-lg font-bold font-mono text-red-300">{data.kev.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overlay: Hover Popup */}
          {hoveredFeature && (
            <FacilityPopup
              feature={hoveredFeature.feature}
              position={hoveredFeature.position}
            />
          )}

          {/* Overlay: Legend Panel (top-left, OpenGridWorks style) */}
          <LayerPanel layers={layerVisibility} onToggle={handleLayerToggle} />

          {/* Overlay: Detail Panel (right side slide-out) */}
          {selectedFeature && (
            <DetailPanel
              feature={selectedFeature}
              risk={selectedRisk}
              sectorThreats={selectedSectorThreats}
              targetingActors={selectedTargetingActors}
              campaigns={selectedCampaigns}
              vendorAlerts={selectedVendorAlerts}
              onClose={() => setSelectedFeature(null)}
            />
          )}
        </div>

        {/* Right Sidebar: Threat Feed */}
        <div className={`flex-shrink-0 bg-[#0a1628]/90 border-l border-white/[0.04] transition-all duration-300 overflow-hidden ${rightPanelOpen ? 'w-80' : 'w-0'} hidden md:block`}>
          <div className="h-full flex flex-col w-80">
            <div className="flex-shrink-0 p-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Critical Threats
                </h2>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                {data?.meta?.last24h?.total || 0} threats in last 24h
              </p>
            </div>

            {/* Campaign Alerts Section */}
            {activeCampaigns.length > 0 && (
              <div className="flex-shrink-0 p-3 border-b border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Active Campaigns</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{activeCampaigns.length}</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                  {activeCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-white">{campaign.actorName}</span>
                        <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                          campaign.confidence === 'high'
                            ? 'text-red-400 bg-red-500/20'
                            : 'text-amber-400 bg-amber-500/20'
                        }`}>
                          {campaign.confidence}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>{campaign.correlatedItems.length} items</span>
                        <span>Severity: {campaign.avgSeverity.toFixed(2)}</span>
                      </div>
                      <details className="mt-1">
                        <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                          Rationale
                        </summary>
                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{campaign.rationale}</p>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 animate-pulse">
                    <div className="h-3 bg-white/10 rounded w-16 mb-2" />
                    <div className="h-4 bg-white/10 rounded w-full mb-2" />
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                  </div>
                ))
              ) : topThreats.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No threats loaded</p>
              ) : (
                topThreats.map((threat) => (
                  <a
                    key={threat.id}
                    href={threat.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 rounded-lg p-3 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getSeverityColor(threat.severity)}`}>
                        {threat.severity}
                      </span>
                      {threat.aiThreatType && (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {threat.aiThreatType}
                        </span>
                      )}
                      {threat.aiSeverityScore && (
                        <span className="text-[10px] text-gray-500 font-mono ml-auto">
                          {threat.aiSeverityScore}/10
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-2 mb-1.5">
                      {threat.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500">{threat.source}</span>
                      <div className="flex items-center gap-1 text-gray-600">
                        <span>{formatTimeAgo(threat.pubDate)}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Right Panel Toggle (when closed) */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 bg-white/5 border border-white/10 rounded-l-lg px-1 py-4 text-white/60 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Alert Settings Modal */}
      {alertSettingsOpen && (
        <AlertSettingsPanel
          config={alertConfig}
          onConfigChange={setAlertConfig}
          onClose={() => setAlertSettingsOpen(false)}
        />
      )}
    </div>
  )
}
