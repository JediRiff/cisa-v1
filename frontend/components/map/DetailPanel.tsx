'use client'

import { useMemo } from 'react'
import {
  X,
  ExternalLink,
  Shield,
  Zap,
  Factory,
  Crosshair,
} from 'lucide-react'
import type { SelectedFeature, FacilityRisk } from './types'
import { SECTOR_COLORS, SECTOR_LABELS, INFRA_COLORS, EnergySector } from './types'
import type { ThreatActor, MitreTTP } from '@/components/globe/worldData'

// ── Helpers ──

/** Safely extract a string from an unknown property. */
function str(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

function getRiskBadgeStyle(score: number): { color: string; bg: string; label: string } {
  if (score <= 1.5) return { color: '#ef4444', bg: '#ef444420', label: 'Severe' }
  if (score <= 2.5) return { color: '#f97316', bg: '#f9731620', label: 'High' }
  if (score <= 3.5) return { color: '#eab308', bg: '#eab30820', label: 'Elevated' }
  if (score <= 4.5) return { color: '#3b82f6', bg: '#3b82f620', label: 'Guarded' }
  return { color: '#22c55e', bg: '#22c55e20', label: 'Low' }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
    case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
    case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
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

// ── Props ──

interface DetailPanelProps {
  feature: SelectedFeature
  /** Risk score computed for the selected feature (power plant / infra) */
  risk?: FacilityRisk | null
  /** Threat items relevant to this feature's sector / type */
  sectorThreats?: any[]
  /** Threat actors targeting this feature's sector */
  targetingActors?: ThreatActor[]
  /** Active campaigns affecting this feature */
  campaigns?: any[]
  /** Vendor alerts for supply chain exposure */
  vendorAlerts?: any[]
  onClose: () => void
}

export default function DetailPanel({
  feature,
  risk,
  sectorThreats = [],
  targetingActors = [],
  campaigns = [],
  vendorAlerts = [],
  onClose,
}: DetailPanelProps) {
  const props = feature.properties

  // Determine accent color based on feature type
  const accentColor = useMemo(() => {
    if (feature.type === 'plant') {
      const sector = (props.sector as EnergySector) || 'other'
      return SECTOR_COLORS[sector] || '#C0C0C0'
    }
    if (feature.type === 'data_center') return INFRA_COLORS.data_center
    if (feature.type === 'substation') return INFRA_COLORS.substation
    if (feature.type === 'cable') return INFRA_COLORS.submarine_cable
    if (feature.type === 'threat_actor') return (props.color as string) || '#ef4444'
    return '#6b7280'
  }, [feature.type, props])

  const riskBadge = risk ? getRiskBadgeStyle(risk.score) : null

  return (
    <div
      className="absolute top-0 right-0 w-[400px] h-full bg-[#0a1628]/95 backdrop-blur-md border-l border-white/[0.08] flex flex-col z-30 animate-in slide-in-from-right duration-300"
      style={{ borderTopColor: accentColor, borderTopWidth: 3 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Type badge */}
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: accentColor }}
            >
              {feature.type === 'plant'
                ? SECTOR_LABELS[(props.sector as EnergySector) || 'other'] || 'Power Plant'
                : feature.type === 'data_center'
                ? 'Data Center'
                : feature.type === 'substation'
                ? 'Substation'
                : feature.type === 'cable'
                ? 'Submarine Cable'
                : feature.type === 'threat_actor'
                ? 'Threat Actor'
                : 'Feature'}
            </p>
            {/* Name */}
            <h3 className="text-sm font-bold text-white leading-tight">
              {str(props.name) || 'Unknown'}
            </h3>
            {/* Aliases (threat actors) — MapLibre serializes arrays to strings */}
            {feature.type === 'threat_actor' && !!props.aliases && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                aka {Array.isArray(props.aliases) ? (props.aliases as string[]).join(', ') : str(props.aliases)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Key metadata row */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {!!props.operator && (
            <div>
              <span className="text-gray-500">Operator: </span>
              <span className="text-gray-300">{str(props.operator)}</span>
            </div>
          )}
          {!!props.capacity && (
            <div>
              <span className="text-gray-500">Capacity: </span>
              <span className="text-gray-300">{str(props.capacity)}</span>
            </div>
          )}
          {!!props.status && (
            <div>
              <span className="text-gray-500">Status: </span>
              <span className="text-gray-300 capitalize">{str(props.status)}</span>
            </div>
          )}
          {!!props.voltage && (
            <div>
              <span className="text-gray-500">Voltage: </span>
              <span className="text-gray-300">{str(props.voltage)}</span>
            </div>
          )}
          {!!props.owner && (
            <div>
              <span className="text-gray-500">Owner: </span>
              <span className="text-gray-300">{str(props.owner)}</span>
            </div>
          )}
          {!!props.country && (
            <div>
              <span className="text-gray-500">Origin: </span>
              <span className="text-gray-300">{str(props.country)}</span>
            </div>
          )}
          {!!props.type && feature.type === 'threat_actor' && (
            <div>
              <span className="text-gray-500">Type: </span>
              <span className="text-gray-300">{str(props.type)}</span>
            </div>
          )}
          {/* Coordinates */}
          <div>
            <span className="text-gray-500">Location: </span>
            <span className="text-gray-400 font-mono text-[10px]">
              {feature.coordinates[1].toFixed(2)}, {feature.coordinates[0].toFixed(2)}
            </span>
          </div>
        </div>

        {/* Description (threat actors) */}
        {feature.type === 'threat_actor' && !!props.description && (
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
            {str(props.description)}
          </p>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* ── Relevant Alerts & CVEs (TOP of detail panel) ── */}
        {sectorThreats.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-red-400" />
              Relevant Alerts & CVEs
              <span className="text-[9px] font-mono text-gray-500 ml-auto">{sectorThreats.length}</span>
            </h4>
            <div className="space-y-1.5">
              {sectorThreats.slice(0, 12).map((threat: any, i: number) => (
                <a
                  key={threat.id || threat.cveID || i}
                  href={threat.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-2.5 py-2 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {threat.severity && (
                      <span
                        className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded border ${getSeverityColor(
                          threat.severity
                        )}`}
                      >
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
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-gray-600">{threat.source}</span>
                      {threat.pubDate && (
                        <span className="text-gray-600">{formatTimeAgo(threat.pubDate)}</span>
                      )}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Risk Score (for plants and infrastructure) ── */}
        {risk && (
          <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Risk Assessment
              </h4>
              <div className="flex items-center gap-2">
                <span
                  className="text-lg font-bold font-mono"
                  style={{ color: riskBadge!.color }}
                >
                  {risk.score.toFixed(1)}/5
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: riskBadge!.color, background: riskBadge!.bg }}
                >
                  {riskBadge!.label}
                </span>
              </div>
            </div>

            {/* Risk bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((5 - risk.score) / 4) * 100}%`,
                  background: riskBadge!.color,
                }}
              />
            </div>

            {/* Risk factors */}
            <div className="space-y-1">
              {risk.factors.map((factor, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[10px] mt-0.5" style={{ color: riskBadge!.color }}>
                    &#x25cf;
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">{factor}</span>
                </div>
              ))}
            </div>

            {/* Breakdown grid */}
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
                <p className="text-[10px] text-gray-500">Vendors</p>
                <p className="text-xs font-bold text-white">{risk.exposedVendors.length}</p>
              </div>
            </div>

            {/* Grid stress (if present) */}
            {risk.gridHeadroom !== undefined && risk.gridStressScore > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">Grid Headroom</span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {(risk.gridHeadroom * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${risk.gridHeadroom * 100}%`,
                      background:
                        risk.gridHeadroom < 0.1
                          ? '#ef4444'
                          : risk.gridHeadroom < 0.2
                          ? '#f97316'
                          : risk.gridHeadroom < 0.35
                          ? '#eab308'
                          : '#22c55e',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Score computation details */}
            <details className="mt-2 pt-2 border-t border-white/5">
              <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                Score breakdown
              </summary>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Raw total</span>
                  <span className="text-white font-mono">{risk.rawTotal.toFixed(1)} / 10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vendor exposure</span>
                  <span className="text-white font-mono">
                    {risk.vendorExposureScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Grid stress</span>
                  <span className="text-white font-mono">{risk.gridStressScore.toFixed(1)}</span>
                </div>
                <p className="text-gray-600 mt-1">
                  CAPRI: 5 - (raw/10 x 4) = {risk.score.toFixed(1)}
                </p>
              </div>
            </details>
          </div>
        )}

        {/* ── Target Sectors (threat actors) ── */}
        {feature.type === 'threat_actor' && !!props.targetSectors && (
          <div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
              Target Sectors
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(props.targetSectors) ? props.targetSectors : str(props.targetSectors).split(', ').filter(Boolean)).map((sector: string) => {
                const sectorKey = sector as EnergySector
                const color = SECTOR_COLORS[sectorKey] || '#6b7280'
                const label = SECTOR_LABELS[sectorKey] || sector
                return (
                  <span
                    key={sector}
                    className="text-[10px] font-medium px-2 py-1 rounded-md border"
                    style={{
                      color,
                      background: `${color}15`,
                      borderColor: `${color}30`,
                    }}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MITRE ATT&CK TTPs (threat actors) ── */}
        {feature.type === 'threat_actor' && !!props.ttps && (props.ttps as MitreTTP[]).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">
                MITRE ATT&CK TTPs
              </h4>
              {!!props.mitrePage && (
                <a
                  href={props.mitrePage as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {str(props.mitreId) || 'View'}{' '}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <div className="space-y-1">
              {(props.ttps as MitreTTP[]).map((ttp) => (
                <a
                  key={ttp.id}
                  href={`https://attack.mitre.org/techniques/${ttp.id.replace('.', '/')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] rounded px-2 py-1.5 transition-colors group"
                >
                  <span className="text-[10px] font-mono text-red-400 flex-shrink-0 w-16">
                    {ttp.id}
                  </span>
                  <span className="text-[10px] text-gray-300 group-hover:text-white flex-1 truncate">
                    {ttp.name}
                  </span>
                  <span className="text-[9px] text-gray-600 flex-shrink-0">{ttp.tactic}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Campaign Exposure ── */}
        {campaigns.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-amber-400" />
              Campaign Exposure
            </h4>
            <div className="space-y-1.5">
              {campaigns.map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-semibold text-white">
                      {campaign.actorName}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                        campaign.confidence === 'high'
                          ? 'text-red-400 bg-red-500/20'
                          : campaign.confidence === 'medium'
                          ? 'text-amber-400 bg-amber-500/20'
                          : 'text-gray-400 bg-gray-500/20'
                      }`}
                    >
                      {campaign.confidence}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span>{campaign.correlatedItems?.length || 0} items</span>
                    <span>Severity: {campaign.avgSeverity?.toFixed(2) || '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Targeting Actors (for plants/infra) ── */}
        {feature.type !== 'threat_actor' && targetingActors.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
              Threat Actors Targeting This Sector
            </h4>
            <div className="space-y-1">
              {targetingActors.map((actor) => (
                <div
                  key={actor.name}
                  className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: actor.color }}
                  />
                  <span className="text-xs text-gray-200">{actor.name}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{actor.country}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Supply Chain Dependencies ── */}
        {vendorAlerts.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Factory className="w-3 h-3 text-cyan-400" />
              Supply Chain Exposure
            </h4>
            <div className="space-y-1">
              {vendorAlerts.map((alert: any, i: number) => (
                <div
                  key={`${alert.vendor}-${i}`}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                    alert.kevCount > 0
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-white/[0.03]'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      alert.kevCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-xs text-gray-200 capitalize flex-1">
                    {alert.vendor}
                  </span>
                  {alert.kevCount > 0 && (
                    <span className="text-[9px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
                      {alert.kevCount} KEV{alert.kevCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {alert.cveCount > 0 && (
                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
                      {alert.cveCount} CVE{alert.cveCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts moved to top of panel */}
      </div>
    </div>
  )
}
