// CAPRI Threshold-Based Alert Rules
// User-configurable rules that dispatch via the existing /api/webhook endpoint

import { Sector } from '@/components/globe/worldData'

export type AlertRuleType =
  | 'capri_score_below'
  | 'kev_sector'
  | 'nation_state_sector'
  | 'facility_risk_below'

export interface AlertRule {
  id: string
  type: AlertRuleType
  label: string
  description: string
  enabled: boolean
  threshold?: number         // for score-based rules
  sector?: Sector            // for sector-based rules
}

export interface AlertConfig {
  webhookUrl: string
  rules: AlertRule[]
  lastTriggered: Record<string, number> // ruleId → timestamp of last trigger
}

// 5-minute cooldown per rule
export const COOLDOWN_MS = 5 * 60 * 1000

export const DEFAULT_RULES: AlertRule[] = [
  // CAPRI score thresholds
  { id: 'capri-below-2', type: 'capri_score_below', label: 'CAPRI Score Critical', description: 'Fires when CAPRI score drops below 2.0 (Severe)', enabled: true, threshold: 2.0 },
  { id: 'capri-below-3', type: 'capri_score_below', label: 'CAPRI Score Elevated', description: 'Fires when CAPRI score drops below 3.0 (High)', enabled: false, threshold: 3.0 },

  // KEV per sector
  { id: 'kev-grid', type: 'kev_sector', label: 'KEV: Grid Sector', description: 'New KEV matching grid/ICS sector keywords', enabled: true, sector: 'grid' },
  { id: 'kev-nuclear', type: 'kev_sector', label: 'KEV: Nuclear Sector', description: 'New KEV matching nuclear sector keywords', enabled: true, sector: 'nuclear' },
  { id: 'kev-water', type: 'kev_sector', label: 'KEV: Water Sector', description: 'New KEV matching water sector keywords', enabled: false, sector: 'water' },

  // Nation-state activity per sector
  { id: 'ns-grid', type: 'nation_state_sector', label: 'Nation-State: Grid', description: 'Nation-state threat activity targeting grid sector', enabled: true, sector: 'grid' },
  { id: 'ns-nuclear', type: 'nation_state_sector', label: 'Nation-State: Nuclear', description: 'Nation-state threat activity targeting nuclear sector', enabled: true, sector: 'nuclear' },

  // Facility risk thresholds
  { id: 'facility-risk-below-2', type: 'facility_risk_below', label: 'Facility Threat Severe', description: 'Any facility threat score drops below 2.0', enabled: true, threshold: 2.0 },
  { id: 'facility-risk-below-3', type: 'facility_risk_below', label: 'Facility Threat High', description: 'Any facility threat score drops below 3.0', enabled: false, threshold: 3.0 },
]

const STORAGE_KEY = 'capri-alert-config'

export function loadAlertConfig(): AlertConfig {
  if (typeof window === 'undefined') {
    return { webhookUrl: '', rules: DEFAULT_RULES, lastTriggered: {} }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as AlertConfig
      // Merge with defaults to pick up any new rules
      const ruleMap = new Map(parsed.rules.map(r => [r.id, r]))
      const mergedRules = DEFAULT_RULES.map(dr => ruleMap.get(dr.id) || dr)
      return { ...parsed, rules: mergedRules }
    }
  } catch {}
  return { webhookUrl: '', rules: DEFAULT_RULES, lastTriggered: {} }
}

export function saveAlertConfig(config: AlertConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}
