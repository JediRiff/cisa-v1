'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import {
  LayerVisibility,
  SECTOR_COLORS,
  SECTOR_LABELS,
  SECTOR_SHAPES,
  INFRA_COLORS,
  EnergySector,
  InfrastructureType,
  MarkerShape,
} from './types'

interface LayerPanelProps {
  layers: LayerVisibility
  onToggle: (key: keyof LayerVisibility) => void
  featureCounts?: Partial<Record<keyof LayerVisibility, number>>
}

// Ordered lists for each section
const POWER_PLANT_KEYS: { key: keyof LayerVisibility; sector: EnergySector }[] = [
  { key: 'nuclear', sector: 'nuclear' },
  { key: 'hydro', sector: 'hydro' },
  { key: 'gas', sector: 'gas' },
  { key: 'wind', sector: 'wind' },
  { key: 'solar', sector: 'solar' },
  { key: 'coal', sector: 'coal' },
  { key: 'oil', sector: 'oil' },
  { key: 'offshore_wind', sector: 'offshore_wind' },
  { key: 'storage', sector: 'storage' },
  { key: 'pump_storage', sector: 'pump_storage' },
  { key: 'geothermal', sector: 'geothermal' },
  { key: 'biomass', sector: 'biomass' },
]

const INFRA_KEYS: { key: keyof LayerVisibility; type: InfrastructureType; label: string }[] = [
  { key: 'substations', type: 'substation', label: 'Substations' },
  { key: 'transmission_lines', type: 'transmission_line', label: 'Transmission' },
  { key: 'data_centers', type: 'data_center', label: 'Data Centers' },
  { key: 'gas_pipelines', type: 'gas_pipeline', label: 'Gas Pipelines' },
  { key: 'submarine_cables', type: 'submarine_cable', label: 'Submarine Cables' },
  { key: 'fiber_routes', type: 'fiber_route', label: 'Fiber Routes' },
]

const THREAT_KEYS: { key: keyof LayerVisibility; label: string; color: string }[] = [
  { key: 'threat_actors', label: 'Threat Actors', color: '#f87171' },
  { key: 'attack_arcs', label: 'Attack Arcs', color: '#fb923c' },
]

function SectionHeader({
  title,
  expanded,
  onToggle,
  visibleCount,
  totalCount,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  visibleCount: number
  totalCount: number
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-1 group"
    >
      <div className="flex items-center gap-1.5">
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-500" />
        )}
        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold group-hover:text-slate-200 transition-colors">
          {title}
        </span>
      </div>
      <span className="text-[9px] text-slate-600 font-mono">
        {visibleCount}/{totalCount}
      </span>
    </button>
  )
}

/** SVG shape icon for the legend */
function ShapeIcon({ shape, color, checked, size = 10 }: { shape: MarkerShape | 'line' | 'circle-infra'; color: string; checked: boolean; size?: number }) {
  const fill = checked ? color : 'transparent'
  const stroke = checked ? color : 'rgba(100,116,139,0.3)'
  const glow = checked ? `drop-shadow(0 0 3px ${color}60)` : 'none'
  const s = size
  const c = s / 2

  if (shape === 'line') {
    return (
      <svg width={16} height={s} className="flex-shrink-0" style={{ filter: glow }}>
        <line x1={0} y1={c} x2={16} y2={c} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </svg>
    )
  }
  if (shape === 'circle-infra') {
    return (
      <svg width={s} height={s} className="flex-shrink-0" style={{ filter: glow }}>
        <circle cx={c} cy={c} r={c - 1} fill={fill} stroke={stroke} strokeWidth={1} />
      </svg>
    )
  }

  return (
    <svg width={s} height={s} className="flex-shrink-0" style={{ filter: glow }}>
      {shape === 'triangle' && (
        <polygon points={`${c},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={fill} stroke={stroke} strokeWidth={1} />
      )}
      {shape === 'square' && (
        <rect x={1} y={1} width={s - 2} height={s - 2} fill={fill} stroke={stroke} strokeWidth={1} />
      )}
      {shape === 'diamond' && (
        <polygon points={`${c},1 ${s - 1},${c} ${c},${s - 1} 1,${c}`} fill={fill} stroke={stroke} strokeWidth={1} />
      )}
      {shape === 'star' && (
        <polygon
          points={(() => {
            const pts: string[] = []
            for (let i = 0; i < 10; i++) {
              const angle = (i * Math.PI) / 5 - Math.PI / 2
              const r = i % 2 === 0 ? c - 1 : (c - 1) * 0.4
              pts.push(`${c + Math.cos(angle) * r},${c + Math.sin(angle) * r}`)
            }
            return pts.join(' ')
          })()}
          fill={fill} stroke={stroke} strokeWidth={0.8}
        />
      )}
      {shape === 'hexagon' && (
        <polygon
          points={(() => {
            const pts: string[] = []
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3 - Math.PI / 6
              pts.push(`${c + Math.cos(angle) * (c - 1)},${c + Math.sin(angle) * (c - 1)}`)
            }
            return pts.join(' ')
          })()}
          fill={fill} stroke={stroke} strokeWidth={1}
        />
      )}
      {shape === 'dot' && (
        <circle cx={c} cy={c} r={c * 0.55} fill={fill} stroke={stroke} strokeWidth={0.8} />
      )}
      {shape === 'circle' && (
        <circle cx={c} cy={c} r={c - 1} fill={fill} stroke={stroke} strokeWidth={1} />
      )}
    </svg>
  )
}

function LayerRow({
  label,
  color,
  checked,
  count,
  onToggle,
  markerShape = 'circle',
}: {
  label: string
  color: string
  checked: boolean
  count?: number
  onToggle: () => void
  markerShape?: MarkerShape | 'line' | 'circle-infra'
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-[3px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <ShapeIcon shape={markerShape} color={color} checked={checked} />
      <span
        className={`text-[10px] flex-1 transition-colors leading-tight ${
          checked ? 'text-slate-300' : 'text-slate-600'
        } group-hover:text-slate-200`}
      >
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[9px] font-mono tabular-nums transition-colors ${
            checked ? 'text-slate-500' : 'text-slate-700'
          }`}
        >
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </label>
  )
}

export default function LayerPanel({ layers, onToggle, featureCounts }: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [plantSection, setPlantSection] = useState(true)
  const [infraSection, setInfraSection] = useState(true)
  const [threatSection, setThreatSection] = useState(true)

  const plantVisibleCount = useMemo(
    () => POWER_PLANT_KEYS.filter((p) => layers[p.key]).length,
    [layers]
  )
  const infraVisibleCount = useMemo(
    () => INFRA_KEYS.filter((i) => layers[i.key]).length,
    [layers]
  )
  const threatVisibleCount = useMemo(
    () => THREAT_KEYS.filter((t) => layers[t.key]).length,
    [layers]
  )

  function toggleAllPlants() {
    const allOn = plantVisibleCount === POWER_PLANT_KEYS.length
    POWER_PLANT_KEYS.forEach((p) => {
      if (layers[p.key] === allOn) onToggle(p.key)
    })
  }
  function toggleAllInfra() {
    const allOn = infraVisibleCount === INFRA_KEYS.length
    INFRA_KEYS.forEach((i) => {
      if (layers[i.key] === allOn) onToggle(i.key)
    })
  }

  return (
    <div
      data-legend-panel="true"
      className="absolute top-4 left-4 z-20 overflow-hidden select-none"
      style={{ minWidth: collapsed ? 140 : 200, maxHeight: 'calc(100vh - 140px)' }}
    >
      {/* Panel Container — glass morphism */}
      <div className="bg-[#0a1628]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-2xl">
        {/* Header with BETA badge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold">
              Legend
            </span>
            <span className="text-[8px] text-cyan-400/80 bg-cyan-400/10 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
              Beta
            </span>
          </div>
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          )}
        </button>

        {!collapsed && (
          <div className="px-3 pb-3 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Power Plants */}
            <div className="border-t border-white/[0.04] pt-1.5">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SectionHeader
                    title="Generation"
                    expanded={plantSection}
                    onToggle={() => setPlantSection(!plantSection)}
                    visibleCount={plantVisibleCount}
                    totalCount={POWER_PLANT_KEYS.length}
                  />
                </div>
                <button
                  onClick={toggleAllPlants}
                  className="text-slate-600 hover:text-slate-300 transition-colors p-0.5"
                  title={plantVisibleCount === POWER_PLANT_KEYS.length ? 'Hide all' : 'Show all'}
                >
                  {plantVisibleCount === POWER_PLANT_KEYS.length ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </button>
              </div>
              {plantSection && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-0 mt-0.5">
                  {POWER_PLANT_KEYS.map(({ key, sector }) => (
                    <LayerRow
                      key={key}
                      label={SECTOR_LABELS[sector]}
                      color={SECTOR_COLORS[sector]}
                      checked={layers[key]}
                      count={featureCounts?.[key]}
                      onToggle={() => onToggle(key)}
                      markerShape={SECTOR_SHAPES[sector]}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Infrastructure */}
            <div className="border-t border-white/[0.04] pt-1.5 mt-1">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SectionHeader
                    title="Infrastructure"
                    expanded={infraSection}
                    onToggle={() => setInfraSection(!infraSection)}
                    visibleCount={infraVisibleCount}
                    totalCount={INFRA_KEYS.length}
                  />
                </div>
                <button
                  onClick={toggleAllInfra}
                  className="text-slate-600 hover:text-slate-300 transition-colors p-0.5"
                  title={infraVisibleCount === INFRA_KEYS.length ? 'Hide all' : 'Show all'}
                >
                  {infraVisibleCount === INFRA_KEYS.length ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </button>
              </div>
              {infraSection && (
                <div className="space-y-0 mt-0.5">
                  {INFRA_KEYS.map(({ key, type, label }) => (
                    <LayerRow
                      key={key}
                      label={label}
                      color={INFRA_COLORS[type]}
                      checked={layers[key]}
                      count={featureCounts?.[key]}
                      onToggle={() => onToggle(key)}
                      markerShape={['transmission_line', 'submarine_cable', 'fiber_route', 'gas_pipeline'].includes(type) ? 'line' : 'circle-infra'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Threat Overlays */}
            <div className="border-t border-white/[0.04] pt-1.5 mt-1">
              <SectionHeader
                title="Threats"
                expanded={threatSection}
                onToggle={() => setThreatSection(!threatSection)}
                visibleCount={threatVisibleCount}
                totalCount={THREAT_KEYS.length}
              />
              {threatSection && (
                <div className="space-y-0 mt-0.5">
                  {THREAT_KEYS.map(({ key, label, color }) => (
                    <LayerRow
                      key={key}
                      label={label}
                      color={color}
                      checked={layers[key]}
                      count={featureCounts?.[key]}
                      onToggle={() => onToggle(key)}
                      markerShape={key === 'attack_arcs' ? 'line' : 'circle'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Risk Scale */}
            <div className="border-t border-white/[0.04] pt-2 mt-1.5">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">
                Risk Scale
              </div>
              <div className="flex items-center gap-0.5 h-2">
                <div className="flex-1 h-full rounded-l bg-gradient-to-r from-[#4ade80] to-[#60a5fa]" title="Low to Guarded" />
                <div className="flex-1 h-full bg-gradient-to-r from-[#60a5fa] to-[#eab308]" title="Guarded to Elevated" />
                <div className="flex-1 h-full bg-gradient-to-r from-[#eab308] to-[#f97316]" title="Elevated to High" />
                <div className="flex-1 h-full rounded-r bg-gradient-to-r from-[#f97316] to-[#ef4444]" title="High to Severe" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-[#4ade80]">5.0 Low</span>
                <span className="text-[8px] text-[#eab308]">3.0</span>
                <span className="text-[8px] text-[#ef4444]">1.0 Severe</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
