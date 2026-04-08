'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Database } from 'lucide-react'

// ── Types ──

interface DataSource {
  name: string
  url: string
}

interface DataSourceCategory {
  label: string
  sources: DataSource[]
}

// ── Source Registry ──

const DATA_SOURCES: DataSourceCategory[] = [
  {
    label: 'Facility Data',
    sources: [
      { name: 'EIA', url: 'https://www.eia.gov' },
      { name: 'Global Energy Monitor', url: 'https://globalenergymonitor.org' },
      { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
    ],
  },
  {
    label: 'Threat Intelligence',
    sources: [
      { name: 'CISA KEV Catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
      { name: 'ICS-CERT Advisories', url: 'https://www.cisa.gov/news-events/ics-advisories' },
      { name: 'UK NCSC', url: 'https://www.ncsc.gov.uk' },
      { name: 'AlienVault OTX', url: 'https://otx.alienvault.com' },
    ],
  },
  {
    label: 'Security Vendors',
    sources: [
      { name: 'Microsoft Security', url: 'https://www.microsoft.com/en-us/security' },
      { name: 'Palo Alto Unit42', url: 'https://unit42.paloaltonetworks.com' },
      { name: 'CrowdStrike', url: 'https://www.crowdstrike.com/blog' },
      { name: 'SentinelOne', url: 'https://www.sentinelone.com/labs' },
      { name: 'Cisco Talos', url: 'https://blog.talosintelligence.com' },
      { name: 'Mandiant', url: 'https://www.mandiant.com/resources/blog' },
      { name: 'Google TAG', url: 'https://blog.google/threat-analysis-group' },
    ],
  },
  {
    label: 'Grid Data',
    sources: [
      { name: 'EIA-930 Grid Monitor', url: 'https://www.eia.gov/electricity/gridmonitor' },
    ],
  },
  {
    label: 'Social Intelligence',
    sources: [
      { name: 'Bluesky', url: 'https://bsky.app' },
      { name: 'Mastodon infosec.exchange', url: 'https://infosec.exchange' },
      { name: 'Reddit r/netsec', url: 'https://reddit.com/r/netsec' },
    ],
  },
  {
    label: 'Map',
    sources: [
      { name: 'MapLibre', url: 'https://maplibre.org' },
      { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
    ],
  },
]

const TOTAL_SOURCES = DATA_SOURCES.reduce((sum, cat) => sum + cat.sources.length, 0)

// ── Props ──

interface DataSourcesOverlayProps {
  sourcesOnline?: number
  sourcesTotal?: number
}

// ── Component ──

export default function DataSourcesOverlay({
  sourcesOnline,
  sourcesTotal,
}: DataSourcesOverlayProps) {
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const online = sourcesOnline ?? TOTAL_SOURCES
  const total = sourcesTotal ?? TOTAL_SOURCES

  // Close on click outside
  useEffect(() => {
    if (!expanded) return
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [expanded])

  return (
    <div
      ref={panelRef}
      className="absolute bottom-4 right-4 z-20"
      style={{ maxWidth: 420 }}
    >
      {/* Expanded panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[60vh] opacity-100 mb-1' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0a1628]/95 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-2xl overflow-y-auto scrollbar-thin" style={{ maxHeight: '55vh' }}>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {DATA_SOURCES.map((category) => (
                <div key={category.label}>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">
                    {category.label}
                  </p>
                  <div className="space-y-0.5">
                    {category.sources.map((source) => (
                      <div key={source.name + source.url} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 flex-shrink-0" />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gray-400 hover:text-white transition-colors truncate"
                        >
                          {source.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed pill / toggle button */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 bg-[#0a1628]/85 backdrop-blur-xl border border-white/[0.06] rounded-lg px-2.5 py-1.5 shadow-2xl hover:bg-[#0a1628]/95 transition-colors ml-auto"
      >
        <Database className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] text-gray-400 font-mono">
          Sources: <span className="text-emerald-400">{online}</span>/{total}
        </span>
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronUp className="w-3 h-3 text-slate-500" />
        )}
      </button>
    </div>
  )
}
