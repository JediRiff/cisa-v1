'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, DollarSign, Users, Info } from 'lucide-react'
import { type KEVAction } from '@/components/ActionableRecommendations'
import { type ThreatItem } from '@/components/ThreatCard'

interface Last24h {
  kev: number
  nationState: number
  ics: number
  total: number
}

interface RecoverEstimateProps {
  threats: {
    all: ThreatItem[]
    energyRelevant: ThreatItem[]
    critical: ThreatItem[]
  }
  kev: KEVAction[]
  last24h: Last24h
  score: number
}

interface CostBreakdownRow {
  category: string
  count: number
  unitCost: number
  subtotal: number
  rationale: string
}

function estimateEconomicImpact(threats: RecoverEstimateProps['threats'], kev: KEVAction[], last24h: Last24h) {
  // Ransomware: KEVs with known ransomware use
  const ransomwareKevs = kev.filter(k => k.ransomwareUse)
  const ransomwareCost = ransomwareKevs.length * 4_450_000

  // Nation-state: items matching nation-state indicators
  const nationStateCost = last24h.nationState * 1_200_000

  // ICS/OT: items matching ICS keywords
  const icsCost = last24h.ics * 2_800_000

  // General critical/high vuln exposure
  const criticalItems = threats.critical.length
  const generalCost = criticalItems * 500_000

  const totalWeekly = ransomwareCost + nationStateCost + icsCost + generalCost

  // Person-days: rough sector disruption estimate
  const personDays = (ransomwareKevs.length * 45) + (last24h.nationState * 30) +
    (last24h.ics * 35) + (criticalItems * 10)

  // Recovery readiness: 5 = good (few active threats), 1 = bad (many active)
  const pressure = Math.min((ransomwareKevs.length * 2 + last24h.nationState + last24h.ics) / 10, 1)
  const readiness = Math.round((5 - pressure * 4) * 10) / 10 // 5.0 -> 1.0

  const breakdown: CostBreakdownRow[] = [
    {
      category: 'Ransomware Exposure',
      count: ransomwareKevs.length,
      unitCost: 4_450_000,
      subtotal: ransomwareCost,
      rationale: 'KEVs with confirmed ransomware use × $4.45M avg cost (IBM Cost of a Data Breach 2023)',
    },
    {
      category: 'Nation-State Incident Risk',
      count: last24h.nationState,
      unitCost: 1_200_000,
      subtotal: nationStateCost,
      rationale: 'Nation-state threat items (24h) × $1.2M weighted cost per state-sponsored incident',
    },
    {
      category: 'ICS/OT Disruption',
      count: last24h.ics,
      unitCost: 2_800_000,
      subtotal: icsCost,
      rationale: 'ICS-related items (24h) × $2.8M avg industrial control system incident cost',
    },
    {
      category: 'General Vulnerability Exposure',
      count: criticalItems,
      unitCost: 500_000,
      subtotal: generalCost,
      rationale: 'Critical-severity items × $0.5M avg remediation and downtime cost',
    },
  ]

  return { totalWeekly, personDays, readiness, breakdown }
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function formatUnitCost(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}


export default function RecoverEstimate({ threats, kev, last24h }: RecoverEstimateProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  const impact = useMemo(
    () => estimateEconomicImpact(threats, kev, last24h),
    [threats, kev, last24h]
  )

  return (
    <section className="py-8 px-4 bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-cisa-navy dark:text-blue-400 mb-2">
          Recover: Economic Loss Estimation
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Estimated financial impact derived from active threat data — supports CIRCIA cost-benefit analysis
        </p>

        {/* Summary Cards - 2 column grid matching KeyMetrics navy box style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Estimated Weekly Loss */}
          <div className="bg-cisa-navy dark:bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Est. Weekly Loss</p>
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-200" />
              <p className="text-white text-3xl font-bold">{formatDollars(impact.totalWeekly)}</p>
            </div>
            <p className="text-blue-200 text-sm mt-1">across {impact.breakdown.filter(r => r.count > 0).length} risk categories</p>
          </div>

          {/* Person-Days of Disruption */}
          <div className="bg-cisa-navy dark:bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Person-Days Disruption</p>
            <div className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-blue-200" />
              <p className="text-white text-3xl font-bold">{impact.personDays.toLocaleString()}</p>
            </div>
            <p className="text-blue-200 text-sm mt-1">estimated recovery effort</p>
          </div>
        </div>

        {/* Cost Breakdown Table - Expandable */}
        <div className="mb-4">
          <button
            onClick={() => setBreakdownOpen(!breakdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cisa-navy dark:text-blue-400" />
              <span className="font-semibold text-cisa-navy dark:text-blue-400">Cost Breakdown</span>
            </div>
            {breakdownOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {breakdownOpen && (
            <div className="mt-2 p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cisa-navy dark:bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left rounded-tl-lg">Category</th>
                      <th className="px-3 py-2 text-center">Count</th>
                      <th className="px-3 py-2 text-center">Unit Cost</th>
                      <th className="px-3 py-2 text-center">Subtotal</th>
                      <th className="px-3 py-2 text-left rounded-tr-lg">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {impact.breakdown.map((row, i) => (
                      <tr key={row.category} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800'}>
                        <td className="px-3 py-2 font-medium dark:text-gray-200">{row.category}</td>
                        <td className="px-3 py-2 text-center dark:text-gray-300">{row.count}</td>
                        <td className="px-3 py-2 text-center font-mono dark:text-gray-300">{formatUnitCost(row.unitCost)}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold dark:text-gray-200">
                          {row.subtotal > 0 ? formatDollars(row.subtotal) : '$0'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{row.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-cisa-navy/10 dark:bg-blue-900/30 font-semibold">
                      <td className="px-3 py-2 dark:text-gray-200">Total</td>
                      <td className="px-3 py-2 text-center dark:text-gray-300">
                        {impact.breakdown.reduce((sum, r) => sum + r.count, 0)}
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-center font-mono text-cisa-navy dark:text-blue-400">
                        {formatDollars(impact.totalWeekly)}
                      </td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                Estimates based on IBM Cost of a Data Breach Report 2023, Dragos ICS/OT incident data, and industry benchmarks. Actual costs vary by organization size and response capability.
              </p>
            </div>
          )}
        </div>

        {/* Policy Context - Expandable */}
        <div>
          <button
            onClick={() => setPolicyOpen(!policyOpen)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-cisa-navy dark:text-blue-400" />
              <span className="font-semibold text-cisa-navy dark:text-blue-400">Policy Context: NIST CSF Recover & CIRCIA</span>
            </div>
            {policyOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {policyOpen && (
            <div className="mt-2 p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">NIST CSF &mdash; Recover Function</h4>
                  <p>
                    Restoring capabilities after cyber incidents. Loss estimation quantifies impact to prioritize
                    resilience investments and recovery planning.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">CIRCIA &mdash; Cyber Incident Reporting for Critical Infrastructure Act</h4>
                  <p>
                    Requires critical infrastructure entities to report incidents to CISA within 72 hours and
                    ransomware payments within 24 hours. These estimates support the mandated cost-benefit analysis.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">How This Metric Helps</h4>
                  <p>
                    Translates threat intelligence into dollar figures for executive-level risk communication.
                    Derived from industry benchmarks and current threat counts — directional indicators, not forecasts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
