'use client'

interface Last24h {
  kev: number
  ics: number
  total: number
}

interface KeyMetricsProps {
  score: number
  label: string
  color: string
  last24h: Last24h
}

export default function KeyMetrics({ score, label, color, last24h }: KeyMetricsProps) {
  return (
    <section className="py-8 px-4 bg-cisa-navy dark:bg-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current Score */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Score</p>
            <p className="text-4xl font-bold" style={{ color }}>{score.toFixed(1)}</p>
            <p className="text-lg font-semibold mt-1" style={{ color }}>
              {label}
            </p>
          </div>

          {/* Last 24 Hours Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Last 24 Hours</p>
            <p className="text-gray-900 dark:text-white text-2xl font-bold mb-2">{last24h.total} New</p>
            <p className="text-sm">
              {last24h.kev > 0 && <span className="text-red-600 dark:text-red-400 font-medium" title="Known Exploited Vulnerabilities — actively exploited CVEs cataloged by CISA">{last24h.kev} KEV</span>}
              {last24h.kev > 0 && last24h.ics > 0 && <span className="text-gray-400"> · </span>}
              {last24h.ics > 0 && <span className="text-yellow-600 dark:text-yellow-400 font-medium" title="Industrial Control Systems / Operational Technology vulnerabilities">{last24h.ics} ICS</span>}
              {last24h.kev === 0 && last24h.ics === 0 && <span className="text-gray-500 dark:text-gray-400">No critical alerts</span>}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
