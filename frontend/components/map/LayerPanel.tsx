'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Layers, Eye, EyeOff } from 'lucide-react'
import {
  LayerVisibility,
  SECTOR_COLORS,
  SECTOR_LABELS,
  INFRA_COLORS,
  EnergySector,
  InfrastructureType,
} from './types'

interface LayerPanelProps {
  layers: LayerVisibility
  onToggle: (key: keyof LayerVisibility) => void
  featureCounts?: Partial<Record<keyof LayerVisibility, number>>
}

// Ordered lists for each section
const POWER_PLANT_KEYS: { key: keyof LayerVisibility; sector: EnergySector }[] = [
  { key: 'solar', sector: 'solar' },
  { key: 'wind', sector: 'wind' },
  { key: 'offshore_wind', sector: 'offshore_wind' },
  { key: 'storage', sector: 'storage' },
  { key: 'pump_storage', sector: 'pump_storage' },
  { key: 'hydro', sector: 'hydro' },
  { key: 'nuclear', sector: 'nuclear' },
  { key: 'gas', sector: 'gas' },
  { key: 'coal', sector: 'coal' },
  { key: 'oil', sector: 'oil' },
  { key: 'geothermal', sector: 'geothermal' },
  { key: 'biomass', sector: 'biomass' },
]

const INFRA_KEYS: { key: keyof LayerVisibility; type: InfrastructureType; label: string }[] = [
  { key: 'data_centers', type: 'data_center', label: 'Data Centers' },
  { key: 'substations', type: 'substation', label: 'Substations' },
  { key: 'transmission_lines', type: 'transmission_line', label: 'Transmission Lines' },
  { key: 'submarine_cables', type: 'submarine_cable', label: 'Submarine Cables' },
  { key: 'fiber_routes', type: 'fiber_route', label: 'Fiber Routes' },
  { key: 'gas_pipelines', type: 'gas_pipeline', label: 'Gas Pipelines' },
]

const THREAT_KEYS: { key: keyof LayerVisibility; label: string; color: string }[] = [
  { key: 'threat_actors', label: 'Threat Actors', color: '#ef4444' },
  { key: 'attack_arcs', label: 'Attack Arcs', color: '#ff6060' },
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
      className="w-full flex items-center justify-between py-1.5 group"
    >
      <div className="flex items-center gap-1.5">
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        )}
        <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold group-hover:text-gray-300 transition-colors">
          {title}
        </span>
      </div>
      <span className="text-[9px] text-gray-600 font-mono">
        {visibleCount}/{totalCount}
      </span>
    </button>
  )
}

function LayerRow({
  layerKey,
  label,
  color,
  checked,
  count,
  onToggle,
}: {
  layerKey: string
  label: string
  color: string
  checked: boolean
  count?: number
  onToggle: () => void
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer group py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <div
        className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0 transition-all"
        style={{
          background: checked ? color : 'transparent',
          borderColor: checked ? color : undefined,
          boxShadow: checked ? `0 0 4px ${color}40` : 'none',
        }}
      />
      <span
        className={`text-[10px] flex-1 transition-colors ${
          checked ? 'text-gray-300' : 'text-gray-600'
        } group-hover:text-gray-200`}
      >
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[9px] font-mono tabular-nums transition-colors ${
            checked ? 'text-gray-500' : 'text-gray-700'
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

  // Count how many layers are visible in each section
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

  // Bulk toggle helpers
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
      className="absolute bottom-4 right-4 z-20 bg-[#060d1a]/90 backdrop-blur-md border border-white/[0.08] rounded-lg overflow-hidden select-none"
      style={{ minWidth: collapsed ? 160 : 210, maxHeight: 'calc(100vh - 140px)' }}
    >
      {/* Panel Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
            Map Layers
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {!collapsed && (
        <div className="px-3 pb-2.5 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* ── Power Plants ── */}
          <div className="border-t border-white/5 pt-1">
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <SectionHeader
                  title="Power Plants"
                  expanded={plantSection}
                  onToggle={() => setPlantSection(!plantSection)}
                  visibleCount={plantVisibleCount}
                  totalCount={POWER_PLANT_KEYS.length}
                />
              </div>
              <button
                onClick={toggleAllPlants}
                className="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                {POWER_PLANT_KEYS.map(({ key, sector }) => (
                  <LayerRow
                    key={key}
                    layerKey={key}
                    label={SECTOR_LABELS[sector]}
                    color={SECTOR_COLORS[sector]}
                    checked={layers[key]}
                    count={featureCounts?.[key]}
                    onToggle={() => onToggle(key)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Infrastructure ── */}
          <div className="border-t border-white/5 pt-1 mt-1">
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
                className="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
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
              <div className="space-y-0">
                {INFRA_KEYS.map(({ key, type, label }) => (
                  <LayerRow
                    key={key}
                    layerKey={key}
                    label={label}
                    color={INFRA_COLORS[type]}
                    checked={layers[key]}
                    count={featureCounts?.[key]}
                    onToggle={() => onToggle(key)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Threat Overlays ── */}
          <div className="border-t border-white/5 pt-1 mt-1">
            <SectionHeader
              title="Threat Overlays"
              expanded={threatSection}
              onToggle={() => setThreatSection(!threatSection)}
              visibleCount={threatVisibleCount}
              totalCount={THREAT_KEYS.length}
            />
            {threatSection && (
              <div className="space-y-0">
                {THREAT_KEYS.map(({ key, label, color }) => (
                  <LayerRow
                    key={key}
                    layerKey={key}
                    label={label}
                    color={color}
                    checked={layers[key]}
                    count={featureCounts?.[key]}
                    onToggle={() => onToggle(key)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
