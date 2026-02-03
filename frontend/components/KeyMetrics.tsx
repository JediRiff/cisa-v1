'use client'

import { useEffect, useState } from 'react'
import { getLastWeekScore } from '@/lib/history'

interface KeyMetricsProps {
  score: number
  label: string
  color: string
  alertsThisWeek: number
}

export default function KeyMetrics({ score, label, color, alertsThisWeek }: KeyMetricsProps) {
  const [lastWeek, setLastWeek] = useState<{ score: number; label: string } | null>(null)

  useEffect(() => {
    setLastWeek(getLastWeekScore())
  }, [])

  const getColorForScore = (s: number) => {
    if (s <= 2.0) return '#d92525'
    if (s <= 3.0) return '#f59e0b'
    return '#16a34a'
  }

  // Calculate trend arrow (higher score = better, so if current > lastWeek, it's improving)
  const getTrend = () => {
    if (!lastWeek) return null
    const diff = score - lastWeek.score
    if (diff > 0.3) return { arrow: '↑', label: 'Improving', color: '#86efac' }
    if (diff < -0.3) return { arrow: '↓', label: 'Worsening', color: '#fca5a5' }
    return { arrow: '→', label: 'Stable', color: '#93c5fd' }
  }

  const trend = getTrend()

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          {/* Current Score */}
          <div className="bg-cisa-navy rounded-xl p-6 text-center">
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-2">Score</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-white text-4xl font-bold">{score.toFixed(1)}</p>
              {trend && (
                <span className="text-2xl font-bold" style={{ color: trend.color }} title={trend.label}>
                  {trend.arrow}
                </span>
              )}
            </div>
            <p className="text-lg font-semibold mt-1" style={{ color: color === '#16a34a' ? '#86efac' : color === '#f59e0b' ? '#fde047' : '#fca5a5' }}>
              {label}
            </p>
          </div>

          {/* New Alerts This Week */}
          <div className="bg-cisa-navy rounded-xl p-6 text-center">
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-2">New Alerts</p>
            <p className="text-white text-4xl font-bold mb-1">{alertsThisWeek}</p>
            <p className="text-blue-200 text-lg">This Week</p>
          </div>

          {/* Last Week's Score */}
          <div className="bg-cisa-navy rounded-xl p-6 text-center">
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-2">Last Week</p>
            {lastWeek ? (
              <>
                <p className="text-white text-4xl font-bold mb-1">{lastWeek.score.toFixed(1)}</p>
                <p className="text-lg font-semibold" style={{
                  color: getColorForScore(lastWeek.score) === '#16a34a' ? '#86efac' :
                         getColorForScore(lastWeek.score) === '#f59e0b' ? '#fde047' : '#fca5a5'
                }}>
                  {lastWeek.label}
                </p>
              </>
            ) : (
              <>
                <p className="text-white text-4xl font-bold mb-1">--</p>
                <p className="text-blue-200 text-lg">No Data</p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
