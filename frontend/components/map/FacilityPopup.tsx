'use client'

import type { SelectedFeature } from './types'
import { SECTOR_COLORS, SECTOR_LABELS, INFRA_COLORS, EnergySector } from './types'

interface FacilityPopupProps {
  /** The hovered feature to display in the popup */
  feature: SelectedFeature
  /** Screen-space position (px) for anchoring the popup */
  position: { x: number; y: number }
}

/** Safely extract a string from an unknown property. */
function str(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

export default function FacilityPopup({ feature, position }: FacilityPopupProps) {
  const props = feature.properties

  // Determine accent color
  let accentColor = '#6b7280'
  let typeLabel = 'Feature'

  switch (feature.type) {
    case 'plant': {
      const sector = (props.sector as EnergySector) || 'other'
      accentColor = SECTOR_COLORS[sector] || '#C0C0C0'
      typeLabel = SECTOR_LABELS[sector] || 'Power Plant'
      break
    }
    case 'data_center':
      accentColor = INFRA_COLORS.data_center
      typeLabel = 'Data Center'
      break
    case 'substation':
      accentColor = INFRA_COLORS.substation
      typeLabel = 'Substation'
      break
    case 'cable':
      accentColor = INFRA_COLORS.submarine_cable
      typeLabel = 'Submarine Cable'
      break
    case 'threat_actor':
      accentColor = (props.color as string) || '#ef4444'
      typeLabel = 'Threat Actor'
      break
  }

  // Threat badge
  const threatScore = feature.threatScore?.score
  let threatColor = '#6b7280'
  let threatLabel = ''
  if (threatScore !== undefined) {
    if (threatScore <= 1.5) { threatColor = '#ef4444'; threatLabel = 'SEV' }
    else if (threatScore <= 2.5) { threatColor = '#f97316'; threatLabel = 'HIGH' }
    else if (threatScore <= 3.5) { threatColor = '#eab308'; threatLabel = 'ELEV' }
    else if (threatScore <= 4.5) { threatColor = '#3b82f6'; threatLabel = 'GRD' }
    else { threatColor = '#22c55e'; threatLabel = 'LOW' }
  }

  // Offset popup so it doesn't overlap the cursor
  const style: React.CSSProperties = {
    position: 'absolute',
    left: position.x + 12,
    top: position.y - 8,
    pointerEvents: 'none',
    zIndex: 50,
    maxWidth: 260,
  }

  return (
    <div style={style} className="animate-in fade-in duration-100">
      <div
        className="bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.12] rounded-lg px-3 py-2 shadow-lg"
        style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
      >
        {/* Type badge + Name */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: accentColor }}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {typeLabel}
          </span>
          {threatScore !== undefined && (
            <span
              className="text-[9px] font-bold font-mono ml-auto px-1 py-0.5 rounded"
              style={{ color: threatColor, background: `${threatColor}20` }}
            >
              {threatScore.toFixed(1)} {threatLabel}
            </span>
          )}
        </div>

        <p className="text-xs font-medium text-white leading-tight truncate">
          {str(props.name) || 'Unknown'}
        </p>

        {/* Optional metadata row */}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
          {!!props.operator && (
            <span className="truncate">{str(props.operator)}</span>
          )}
          {!!props.capacity && (
            <span className="text-gray-500 flex-shrink-0">{str(props.capacity)}</span>
          )}
          {!!props.country && feature.type === 'threat_actor' && (
            <span className="text-gray-500">{str(props.country)}</span>
          )}
          {!!props.voltage && (
            <span className="text-gray-500">{str(props.voltage)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
