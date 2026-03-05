// CAPRI Alert Rule Evaluator
// Checks rules against current data and dispatches to webhook

import { AlertConfig, AlertRule, COOLDOWN_MS, saveAlertConfig } from './alertRules'
import { matchesSectorKeywords } from '@/components/globe/worldData'
import { NATION_STATE_INDICATORS, matchesIndicator } from './indicators'

export interface AlertContext {
  capriScore: number
  kevItems: any[]
  threatItems: any[]
  facilityRiskScores: Record<string, number>
}

interface FiredAlert {
  rule: AlertRule
  title: string
  description: string
  alertType: 'critical_threat' | 'kev_added' | 'score_change' | 'nation_state'
  details: Record<string, string | number | boolean>
}

export function evaluateAlertRules(config: AlertConfig, context: AlertContext): FiredAlert[] {
  const now = Date.now()
  const alerts: FiredAlert[] = []

  for (const rule of config.rules) {
    if (!rule.enabled) continue

    // Check cooldown
    const lastFired = config.lastTriggered[rule.id] || 0
    if (now - lastFired < COOLDOWN_MS) continue

    const fired = evaluateRule(rule, context)
    if (fired) alerts.push(fired)
  }

  return alerts
}

function evaluateRule(rule: AlertRule, ctx: AlertContext): FiredAlert | null {
  switch (rule.type) {
    case 'capri_score_below': {
      const threshold = rule.threshold ?? 2.0
      if (ctx.capriScore < threshold) {
        return {
          rule,
          title: `CAPRI Score Below ${threshold.toFixed(1)}`,
          description: `Current CAPRI score is ${ctx.capriScore.toFixed(1)}, below the ${threshold.toFixed(1)} threshold.`,
          alertType: 'score_change',
          details: {
            currentScore: ctx.capriScore,
            threshold,
            ruleId: rule.id,
          },
        }
      }
      return null
    }

    case 'kev_sector': {
      const sector = rule.sector
      if (!sector) return null
      const matchingKevs = ctx.kevItems.filter(kev => {
        const text = `${kev.vendorProject || ''} ${kev.product || ''} ${kev.shortDescription || ''}`
        return matchesSectorKeywords(text, sector)
      })
      if (matchingKevs.length > 0) {
        return {
          rule,
          title: `KEV Activity in ${sector} Sector`,
          description: `${matchingKevs.length} KEV(s) matching the ${sector} sector detected.`,
          alertType: 'kev_added',
          details: {
            sector,
            matchCount: matchingKevs.length,
            latestKev: matchingKevs[0]?.vulnerabilityName || matchingKevs[0]?.cveID || 'Unknown',
          },
        }
      }
      return null
    }

    case 'nation_state_sector': {
      const sector = rule.sector
      if (!sector) return null
      const matchingThreats = ctx.threatItems.filter(item => {
        const text = `${item.title || ''} ${item.shortDescription || ''} ${item.description || ''}`
        const isNS = NATION_STATE_INDICATORS.some(ind => matchesIndicator(text.toLowerCase(), ind))
        const isSector = matchesSectorKeywords(text, sector)
        return isNS && isSector
      })
      if (matchingThreats.length > 0) {
        return {
          rule,
          title: `Nation-State Threat: ${sector} Sector`,
          description: `${matchingThreats.length} nation-state indicator(s) targeting the ${sector} sector.`,
          alertType: 'nation_state',
          details: {
            sector,
            matchCount: matchingThreats.length,
            latestTitle: matchingThreats[0]?.title || 'Unknown',
          },
        }
      }
      return null
    }

    case 'facility_risk_below': {
      const threshold = rule.threshold ?? 2.0
      const critical = Object.entries(ctx.facilityRiskScores).filter(
        ([, score]) => score < threshold
      )
      if (critical.length > 0) {
        const worst = critical.reduce((a, b) => (a[1] < b[1] ? a : b))
        return {
          rule,
          title: `Facility Risk Below ${threshold.toFixed(1)}`,
          description: `${critical.length} facility/facilities with risk score below ${threshold.toFixed(1)}. Worst: ${worst[0]} at ${worst[1].toFixed(1)}.`,
          alertType: 'critical_threat',
          details: {
            facilitiesAffected: critical.length,
            worstFacility: worst[0],
            worstScore: worst[1],
            threshold,
          },
        }
      }
      return null
    }

    default:
      return null
  }
}

export async function dispatchAlerts(
  config: AlertConfig,
  alerts: FiredAlert[],
): Promise<void> {
  if (!config.webhookUrl || alerts.length === 0) return

  const now = Date.now()

  for (const alert of alerts) {
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          payload: {
            alertType: alert.alertType,
            title: alert.title,
            description: alert.description,
            details: alert.details,
            dashboardUrl: typeof window !== 'undefined' ? window.location.origin + '/globe' : '',
            timestamp: new Date().toISOString(),
          },
        }),
      })

      // Mark rule as triggered (cooldown)
      config.lastTriggered[alert.rule.id] = now
    } catch (err) {
      console.error(`Failed to dispatch alert for rule ${alert.rule.id}:`, err)
    }
  }

  // Persist updated cooldowns
  saveAlertConfig(config)
}
