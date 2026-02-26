'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Shield,
  Activity,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  X,
  Atom,
  Droplets,
  Fuel,
  Flame,
  Factory,
  Waves,
} from 'lucide-react'
import {
  EnergyFacility,
  ThreatActor,
  Sector,
  FacilityRisk,
  MitreTTP,
  sectorColors,
  sectorLabels,
  sectorKeywords,
  threatActors as allThreatActors,
  energyFacilities,
  calculateFacilityRisk,
} from '@/components/globe/worldData'

// Dynamic import for Three.js (no SSR)
const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#030810]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70 text-sm font-mono">Initializing Globe...</p>
      </div>
    </div>
  ),
})

interface ThreatData {
  score: { score: number; label: string; color: string; factors: any[] }
  threats: { all: any[]; energyRelevant: any[]; critical: any[] }
  kev: any[]
  meta: {
    sourcesOnline: number
    sourcesTotal: number
    totalItems: number
    errors: string[]
    last24h: { kev: number; nationState: number; ics: number; total: number }
  }
}

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

function getSectorIcon(sector: Sector) {
  switch (sector) {
    case 'nuclear': return Atom
    case 'hydro': return Droplets
    case 'grid': return Zap
    case 'natural_gas': return Flame
    case 'oil': return Fuel
    case 'water': return Waves
  }
}

// Filter threats by sector keywords
function filterBySector(items: any[], sector: Sector): any[] {
  const keywords = sectorKeywords[sector]
  return items.filter((item) => {
    const text = `${item.title || ''} ${item.shortDescription || ''} ${item.description || ''}`.toLowerCase()
    return keywords.some((kw) => text.includes(kw.toLowerCase()))
  })
}

export default function GlobePage() {
  const [data, setData] = useState<ThreatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [attackCount, setAttackCount] = useState(0)
  const [selectedFacility, setSelectedFacility] = useState<EnergyFacility | null>(null)
  const [selectedActor, setSelectedActor] = useState<ThreatActor | null>(null)

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

  // Filtered threats for selected facility's sector
  const sectorThreats = useMemo(() => {
    if (!selectedFacility || !data) return []
    const allItems = [...(data.threats.all || []), ...(data.kev || [])]
    return filterBySector(allItems, selectedFacility.sector).slice(0, 8)
  }, [selectedFacility, data])

  // Threat actors targeting the selected facility's sector
  const targetingActors = useMemo(() => {
    if (!selectedFacility) return []
    return allThreatActors.filter((a) =>
      a.targetSectors.includes(selectedFacility.sector)
    )
  }, [selectedFacility])

  // Risk score for selected facility
  const facilityRisk = useMemo(() => {
    if (!selectedFacility || !data) return null
    return calculateFacilityRisk(
      selectedFacility,
      data.threats.all || [],
      data.kev || [],
    )
  }, [selectedFacility, data])

  // Facilities targeted by selected actor
  const actorTargetFacilities = useMemo(() => {
    if (!selectedActor) return []
    return energyFacilities.filter((f) =>
      selectedActor.targetSectors.includes(f.sector)
    )
  }, [selectedActor])

  // Actor-relevant threats
  const actorThreats = useMemo(() => {
    if (!selectedActor || !data) return []
    const allItems = [...(data.threats.all || []), ...(data.kev || [])]
    const keywords = [
      selectedActor.name.toLowerCase(),
      selectedActor.country.toLowerCase(),
      ...selectedActor.targetSectors.flatMap((s) => sectorKeywords[s].slice(0, 3)),
    ]
    return allItems.filter((item) => {
      const text = `${item.title || ''} ${item.shortDescription || ''} ${item.description || ''}`.toLowerCase()
      return keywords.some((kw) => text.includes(kw))
    }).slice(0, 8)
  }, [selectedActor, data])

  function handleFacilityClick(facility: EnergyFacility) {
    setSelectedActor(null)
    setSelectedFacility(facility)
  }

  function handleActorClick(actor: ThreatActor) {
    setSelectedFacility(null)
    setSelectedActor(actor)
  }

  function handleEmptyClick() {
    setSelectedFacility(null)
    setSelectedActor(null)
  }

  return (
    <div className="h-[calc(100vh-84px)] flex flex-col bg-[#030810] text-white overflow-hidden">
      {/* Top Stats Bar */}
      <div className="flex-shrink-0 h-12 bg-[#0a1225]/90 border-b border-white/10 flex items-center justify-between px-4 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">CAPRI Threat Map</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-mono">
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
        {/* Globe Viewport */}
        <div className="flex-1 relative">
          <GlobeCanvas
            onFacilityClick={handleFacilityClick}
            onThreatActorClick={handleActorClick}
            onEmptyClick={handleEmptyClick}
            selectedFacilityId={selectedFacility?.id || null}
            selectedActorName={selectedActor?.name || null}
          />

          {/* Overlay: Score Badge */}
          {data?.score && !selectedFacility && !selectedActor && (
            <div className="absolute top-4 left-4 bg-[#0a1225]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">CAPRI Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold font-mono ${getScoreColor(data.score.score)}`}>
                  {data.score.score.toFixed(1)}
                </span>
                <span className={`text-sm font-semibold ${getScoreColor(data.score.score)}`}>
                  {data.score.label}
                </span>
              </div>
            </div>
          )}

          {/* Overlay: Facility Detail Panel */}
          {selectedFacility && (
            <FacilityDetailPanel
              facility={selectedFacility}
              threats={sectorThreats}
              actors={targetingActors}
              risk={facilityRisk}
              onClose={() => setSelectedFacility(null)}
            />
          )}

          {/* Overlay: Threat Actor Detail Panel */}
          {selectedActor && (
            <ActorDetailPanel
              actor={selectedActor}
              threats={actorThreats}
              facilities={actorTargetFacilities}
              onClose={() => setSelectedActor(null)}
            />
          )}

          {/* Overlay: Attack Counter */}
          <div className="absolute bottom-4 left-4 bg-[#0a1225]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-red-400 animate-pulse" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Observed Attacks</p>
                <p className="text-lg font-bold font-mono text-red-400">{attackCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Overlay: Sector Legend */}
          <div className="absolute bottom-4 right-4 bg-[#0a1225]/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 hidden lg:block">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Infrastructure Sectors</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              {(Object.entries(sectorColors) as [Sector, string][]).map(([sector, color]) => (
                <div key={sector} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-gray-300">{sectorLabels[sector]}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-gray-300 text-[10px]">Threat Actor Origin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Threat Feed */}
        <div className={`flex-shrink-0 bg-[#0a1225]/90 border-l border-white/10 transition-all duration-300 overflow-hidden ${rightPanelOpen ? 'w-80' : 'w-0'} hidden md:block`}>
          <div className="h-full flex flex-col w-80">
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Top Critical Threats
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

            {/* KEV Quick Count */}
            {data?.kev && data.kev.length > 0 && (
              <div className="flex-shrink-0 p-3 border-t border-white/10">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[10px] font-bold text-red-400 uppercase">Active KEVs</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-red-300">{data.kev.length}</p>
                  <p className="text-[10px] text-gray-500">Known Exploited Vulnerabilities</p>
                </div>
              </div>
            )}
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
    </div>
  )
}

// ============================================================
// Facility Detail Panel Component
// ============================================================
function FacilityDetailPanel({
  facility,
  threats,
  actors,
  risk,
  onClose,
}: {
  facility: EnergyFacility
  threats: any[]
  actors: ThreatActor[]
  risk: FacilityRisk | null
  onClose: () => void
}) {
  const SectorIcon = getSectorIcon(facility.sector)
  const color = sectorColors[facility.sector]

  return (
    <div className="absolute top-4 left-4 w-[380px] max-h-[calc(100%-2rem)] bg-[#0a1225]/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-left-4 duration-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10" style={{ borderTopColor: color, borderTopWidth: 3 }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
              <SectorIcon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                {sectorLabels[facility.sector]}
              </p>
              <h3 className="text-sm font-bold text-white truncate">{facility.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <div>
            <span className="text-gray-500">Operator: </span>
            <span className="text-gray-300">{facility.operator}</span>
          </div>
          {facility.capacity && (
            <div>
              <span className="text-gray-500">Capacity: </span>
              <span className="text-gray-300">{facility.capacity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Risk Score */}
        {risk && (
          <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Facility Risk Assessment</h4>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono" style={{ color: risk.color }}>
                  {risk.score.toFixed(1)}/5
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: risk.color, background: `${risk.color}20` }}>
                  {risk.label}
                </span>
              </div>
            </div>
            {/* Risk bar — inverted: score 1 = full bar (severe), score 5 = minimal bar (low) */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${((5 - risk.score) / 4) * 100}%`, background: risk.color }}
              />
            </div>
            {/* Risk factors */}
            <div className="space-y-1">
              {risk.factors.map((factor, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[10px] mt-0.5" style={{ color: risk.color }}>&#x25cf;</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{factor}</span>
                </div>
              ))}
            </div>
            {/* Breakdown */}
            <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-500">Actors</p>
                <p className="text-xs font-bold text-white">{risk.actorCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">CVEs</p>
                <p className="text-xs font-bold text-white">{risk.relevantCveCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">KEVs</p>
                <p className="text-xs font-bold text-white">{risk.relevantKevCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Overdue</p>
                <p className="text-xs font-bold" style={{ color: risk.overdueKevCount > 0 ? '#ef4444' : '#22c55e' }}>
                  {risk.overdueKevCount}
                </p>
              </div>
            </div>
            {/* Transparent Score Computation */}
            <details className="mt-2 pt-2 border-t border-white/5">
              <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                How was this score calculated?
              </summary>
              <div className="mt-2 space-y-2 text-[10px] leading-relaxed">
                <p className="text-gray-500">
                  CAPRI scale: <strong className="text-white">1 = Severe</strong>, <strong className="text-white">5 = Normal</strong>. Score is computed from three weighted factors for the <strong className="text-white">{sectorLabels[facility.sector]}</strong> sector:
                </p>
                {/* Factor 1: Actors */}
                <div className="bg-white/[0.03] rounded px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Threat Actors (0-4 pts)</span>
                    <span className="text-white font-mono font-bold">{risk.actorScore.toFixed(1)}</span>
                  </div>
                  <p className="text-gray-600 mt-0.5">
                    {risk.actorCount} nation-state APT group{risk.actorCount !== 1 ? 's' : ''} targeting {sectorLabels[facility.sector].toLowerCase()} &times; 0.5 = {(risk.actorCount * 0.5).toFixed(1)}{risk.actorCount * 0.5 > 4 ? ' (capped at 4.0)' : ''}
                  </p>
                  {risk.actorCount > 0 && (
                    <p className="text-gray-600 mt-0.5 italic">
                      {risk.actorNames.join(', ')}
                    </p>
                  )}
                </div>
                {/* Factor 2: CVEs */}
                <div className="bg-white/[0.03] rounded px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">CVE Exposure (0-3 pts)</span>
                    <span className="text-white font-mono font-bold">{risk.cveScore.toFixed(1)}</span>
                  </div>
                  <p className="text-gray-600 mt-0.5">
                    {risk.relevantCveCount} sector-relevant CVE{risk.relevantCveCount !== 1 ? 's' : ''} from 10 intel sources &times; 0.15 = {(risk.relevantCveCount * 0.15).toFixed(1)}{risk.relevantCveCount * 0.15 > 3 ? ' (capped at 3.0)' : ''}
                  </p>
                </div>
                {/* Factor 3: KEVs */}
                <div className="bg-white/[0.03] rounded px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">KEV Urgency (0-3 pts)</span>
                    <span className="text-white font-mono font-bold">{risk.kevScore.toFixed(1)}</span>
                  </div>
                  <p className="text-gray-600 mt-0.5">
                    {risk.relevantKevCount} active KEV{risk.relevantKevCount !== 1 ? 's' : ''} (0.4 ea) + {risk.overdueKevCount} overdue (+0.5 ea) + {risk.ransomwareKevCount} ransomware (+0.3 ea)
                  </p>
                </div>
                {/* Inversion formula */}
                <div className="bg-white/[0.05] rounded px-2 py-1.5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Raw Threat Intensity</span>
                    <span className="text-white font-mono font-bold">{risk.rawTotal.toFixed(1)} / 10</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-400">Inverted to CAPRI scale</span>
                    <span className="font-mono font-bold" style={{ color: risk.color }}>
                      5 &minus; ({risk.rawTotal.toFixed(1)} &divide; 10 &times; 4) = {risk.score.toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600">
                  Data: CVEs from latest advisories across 10 sources (CISA, Microsoft, Unit42, CrowdStrike, etc.). KEVs from CISA catalog (past 30 days). Refreshes every 60s.
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Threat Actors Targeting This Sector */}
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
            Threat Actors Targeting {sectorLabels[facility.sector]}
          </h4>
          <div className="space-y-1.5">
            {actors.map((actor) => (
              <div key={actor.name} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: actor.color }} />
                <span className="text-xs text-gray-200">{actor.name}</span>
                <span className="text-[10px] text-gray-500 ml-auto">{actor.country}</span>
              </div>
            ))}
            {actors.length === 0 && (
              <p className="text-[11px] text-gray-500 italic">No known threat actors targeting this sector</p>
            )}
          </div>
        </div>

        {/* Relevant Threats / CVEs */}
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
            Relevant Alerts & CVEs
          </h4>
          {threats.length > 0 ? (
            <div className="space-y-1.5">
              {threats.map((threat, i) => (
                <a
                  key={threat.id || threat.cveID || i}
                  href={threat.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-2.5 py-2 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {threat.severity && (
                      <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded border ${getSeverityColor(threat.severity)}`}>
                        {threat.severity}
                      </span>
                    )}
                    {threat.cveID && (
                      <span className="text-[10px] font-mono text-red-400">{threat.cveID}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 group-hover:text-white line-clamp-2 transition-colors">
                    {threat.title || threat.shortDescription}
                  </p>
                  {threat.source && (
                    <p className="text-[10px] text-gray-600 mt-1">{threat.source}</p>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.02] rounded-lg p-3">
              <p className="text-[11px] text-gray-500">
                No sector-specific alerts currently detected. Monitor the general threat feed for broader indicators.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Threat Actor Detail Panel Component
// ============================================================
function ActorDetailPanel({
  actor,
  threats,
  facilities,
  onClose,
}: {
  actor: ThreatActor
  threats: any[]
  facilities: EnergyFacility[]
  onClose: () => void
}) {
  return (
    <div className="absolute top-4 left-4 w-[380px] max-h-[calc(100%-2rem)] bg-[#0a1225]/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-left-4 duration-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10" style={{ borderTopColor: actor.color, borderTopWidth: 3 }}>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: actor.color }} />
              <h3 className="text-sm font-bold text-white">{actor.name}</h3>
            </div>
            {actor.aliases && actor.aliases.length > 0 && (
              <p className="text-[10px] text-gray-500 mb-1">
                aka {actor.aliases.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              <div>
                <span className="text-gray-500">Origin: </span>
                <span className="text-gray-300">{actor.country}</span>
              </div>
              <div>
                <span className="text-gray-500">Type: </span>
                <span className="text-gray-300">{actor.type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{actor.description}</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Target Sectors */}
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">Target Sectors</h4>
          <div className="flex flex-wrap gap-1.5">
            {actor.targetSectors.map((sector) => (
              <span
                key={sector}
                className="text-[10px] font-medium px-2 py-1 rounded-md border"
                style={{
                  color: sectorColors[sector],
                  background: `${sectorColors[sector]}15`,
                  borderColor: `${sectorColors[sector]}30`,
                }}
              >
                {sectorLabels[sector]}
              </span>
            ))}
          </div>
        </div>

        {/* MITRE ATT&CK TTPs */}
        {actor.ttps && actor.ttps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">MITRE ATT&CK TTPs</h4>
              {actor.mitrePage && (
                <a
                  href={actor.mitrePage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {actor.mitreId} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <div className="space-y-1">
              {actor.ttps.map((ttp) => (
                <a
                  key={ttp.id}
                  href={`https://attack.mitre.org/techniques/${ttp.id.replace('.', '/')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] rounded px-2 py-1.5 transition-colors group"
                >
                  <span className="text-[10px] font-mono text-red-400 flex-shrink-0 w-16">{ttp.id}</span>
                  <span className="text-[10px] text-gray-300 group-hover:text-white flex-1 truncate">{ttp.name}</span>
                  <span className="text-[9px] text-gray-600 flex-shrink-0">{ttp.tactic}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Targeted Facilities */}
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
            At-Risk Facilities ({facilities.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {facilities.slice(0, 15).map((f) => {
              const SIcon = getSectorIcon(f.sector)
              return (
                <div key={f.id} className="flex items-center gap-2 bg-white/[0.03] rounded px-2 py-1.5">
                  <SIcon className="w-3 h-3 flex-shrink-0" style={{ color: sectorColors[f.sector] }} />
                  <span className="text-[11px] text-gray-300 truncate">{f.name}</span>
                </div>
              )
            })}
            {facilities.length > 15 && (
              <p className="text-[10px] text-gray-500 pl-2">+{facilities.length - 15} more facilities</p>
            )}
          </div>
        </div>

        {/* Related Threats */}
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
            Related Alerts & CVEs
          </h4>
          {threats.length > 0 ? (
            <div className="space-y-1.5">
              {threats.map((threat, i) => (
                <a
                  key={threat.id || threat.cveID || i}
                  href={threat.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-2.5 py-2 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {threat.severity && (
                      <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded border ${getSeverityColor(threat.severity)}`}>
                        {threat.severity}
                      </span>
                    )}
                    {threat.cveID && (
                      <span className="text-[10px] font-mono text-red-400">{threat.cveID}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 group-hover:text-white line-clamp-2 transition-colors">
                    {threat.title || threat.shortDescription}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.02] rounded-lg p-3">
              <p className="text-[11px] text-gray-500">
                No specific alerts currently linked to this actor. Check general threat feed for updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
