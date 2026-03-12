'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { LayerVisibility, Sector, sectorColors, sectorLabels } from './worldData'

interface LayerTogglePanelProps {
  layers: LayerVisibility
  onToggle: (key: keyof LayerVisibility) => void
}

const SECTOR_KEYS: Sector[] = ['nuclear', 'hydro', 'grid', 'natural_gas', 'oil', 'water']

const OVERLAY_ITEMS: { key: keyof LayerVisibility; label: string; color: string }[] = [
  { key: 'threatActors', label: 'Threat Actors', color: '#ef4444' },
  { key: 'attackArcs', label: 'Attack Arcs', color: '#ff6060' },
  { key: 'submarineCables', label: 'Submarine Cables', color: '#38bdf8' },
  { key: 'lngShippingLanes', label: 'LNG Shipping Lanes', color: '#f59e0b' },
]

export default function LayerTogglePanel({ layers, onToggle }: LayerTogglePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-[#060d1a]/90 backdrop-blur-md border border-white/[0.08] rounded-lg overflow-hidden hidden lg:block" style={{ minWidth: 200 }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Map Layers</span>
        </div>
        {collapsed ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-2.5 space-y-2">
          {/* Infrastructure Sectors */}
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Infrastructure</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {SECTOR_KEYS.map((sector) => (
                <label key={sector} className="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layers[sector]}
                    onChange={() => onToggle(sector)}
                    className="sr-only"
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: layers[sector] ? sectorColors[sector] : 'transparent',
                      borderColor: layers[sector] ? sectorColors[sector] : undefined,
                    }}
                  />
                  <span className={`text-[10px] transition-colors ${layers[sector] ? 'text-gray-300' : 'text-gray-600'} group-hover:text-gray-200`}>
                    {sectorLabels[sector]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Overlays */}
          <div className="pt-1.5 border-t border-white/5">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Overlays</p>
            <div className="space-y-0.5">
              {OVERLAY_ITEMS.map(({ key, label, color }) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={() => onToggle(key)}
                    className="sr-only"
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: layers[key] ? color : 'transparent',
                      borderColor: layers[key] ? color : undefined,
                    }}
                  />
                  <span className={`text-[10px] transition-colors ${layers[key] ? 'text-gray-300' : 'text-gray-600'} group-hover:text-gray-200`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
