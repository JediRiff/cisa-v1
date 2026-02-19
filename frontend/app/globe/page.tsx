'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Home,
  Rss,
  Settings,
  Database,
  FileText,
  Brain,
  Shield,
  Activity,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Zap,
  Globe as GlobeIcon,
  RefreshCw,
} from 'lucide-react'

// Dynamic import for Three.js (no SSR)
const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#030810]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cyan-400 text-sm font-mono">Initializing Globe...</p>
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

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/', active: false },
  { icon: GlobeIcon, label: 'Threat Map', href: '/globe', active: true },
  { icon: Rss, label: 'Feed View', href: '#', active: false },
  { icon: Database, label: 'IOC Catalog', href: '#', active: false },
  { icon: FileText, label: 'IOC Reports', href: '#', active: false },
  { icon: Brain, label: 'AI Intelligence', href: '#', active: false },
  { icon: Settings, label: 'Settings', href: '#', active: false },
]

export default function GlobePage() {
  const [data, setData] = useState<ThreatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [leftNavOpen, setLeftNavOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [attackCount, setAttackCount] = useState(0)

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

  return (
    <div className="h-[calc(100vh-84px)] flex flex-col bg-[#030810] text-white overflow-hidden">
      {/* Top Stats Bar */}
      <div className="flex-shrink-0 h-12 bg-[#0a1225]/90 border-b border-cyan-500/10 flex items-center justify-between px-4 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">CAPRI Threat Map</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-gray-400">LIVE</span>
            </div>
            <div>
              <span className="text-gray-500">IOCs: </span>
              <span className="text-cyan-400">{attackCount.toLocaleString()}</span>
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
          <button onClick={fetchData} className="text-gray-400 hover:text-cyan-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="md:hidden text-gray-400 hover:text-cyan-400 transition-colors text-xs font-mono border border-gray-700 px-2 py-1 rounded"
          >
            Threats
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <div className={`flex-shrink-0 bg-[#0a1225]/80 border-r border-cyan-500/10 transition-all duration-300 ${leftNavOpen ? 'w-48' : 'w-12'} hidden md:flex flex-col`}>
          <div className="flex items-center justify-end p-2">
            <button
              onClick={() => setLeftNavOpen(!leftNavOpen)}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
            >
              {leftNavOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                  item.active
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {leftNavOpen && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {leftNavOpen && (
            <div className="p-3 border-t border-cyan-500/10">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Threat Severity</p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 rounded-full bg-red-500" />
                  <span className="text-gray-400">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 rounded-full bg-orange-500" />
                  <span className="text-gray-400">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 rounded-full bg-yellow-500" />
                  <span className="text-gray-400">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 rounded-full bg-cyan-500" />
                  <span className="text-gray-400">Target</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Globe Viewport */}
        <div className="flex-1 relative">
          <GlobeCanvas />

          {/* Overlay: Score Badge */}
          {data?.score && (
            <div className="absolute top-4 left-4 bg-[#0a1225]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl px-4 py-3">
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

          {/* Overlay: Attack Counter */}
          <div className="absolute bottom-4 left-4 bg-[#0a1225]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-red-400 animate-pulse" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Observed Attacks</p>
                <p className="text-lg font-bold font-mono text-red-400">{attackCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Overlay: Region Legend */}
          <div className="absolute bottom-4 right-4 bg-[#0a1225]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl px-3 py-2 hidden lg:block">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Regions</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#4a9eff' }} /><span className="text-gray-400">N. America</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#6b8aff' }} /><span className="text-gray-400">Europe</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#ff8844' }} /><span className="text-gray-400">Russia</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#ff9944' }} /><span className="text-gray-400">Asia</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#ffaa44' }} /><span className="text-gray-400">Mid. East</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#66cc88' }} /><span className="text-gray-400">Africa</span></div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Threat Feed */}
        <div className={`flex-shrink-0 bg-[#0a1225]/90 border-l border-cyan-500/10 transition-all duration-300 overflow-hidden ${rightPanelOpen ? 'w-80' : 'w-0'} hidden md:block`}>
          <div className="h-full flex flex-col w-80">
            <div className="flex-shrink-0 p-4 border-b border-cyan-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Top Critical Threats
                </h2>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="text-gray-500 hover:text-cyan-400 transition-colors"
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
                topThreats.map((threat, i) => (
                  <a
                    key={threat.id}
                    href={threat.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/20 rounded-lg p-3 transition-all group"
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
                    <h3 className="text-xs font-medium text-gray-200 group-hover:text-cyan-300 transition-colors line-clamp-2 mb-1.5">
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
              <div className="flex-shrink-0 p-3 border-t border-cyan-500/10">
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

        {/* Mobile Right Panel Toggle (when closed) */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 bg-cyan-500/10 border border-cyan-500/20 rounded-l-lg px-1 py-4 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
