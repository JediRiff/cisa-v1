'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WeeklyTrend {
  week: string
  threats: number
  energyThreats: number
  kevCount: number
}

interface ScoreTrendProps {
  trend: WeeklyTrend[]
  currentScore: number
}

export default function ScoreTrend({ trend, currentScore }: ScoreTrendProps) {
  // Calculate trend direction based on threat activity
  const getTrend = () => {
    if (trend.length < 2) return 'stable'
    const recent = trend[trend.length - 1]?.energyThreats || 0
    const previous = trend[trend.length - 2]?.energyThreats || 0
    if (recent > previous + 2) return 'down' // More threats = worsening
    if (recent < previous - 2) return 'up' // Fewer threats = improving
    return 'stable'
  }

  const trendDirection = getTrend()
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus
  const trendColor = trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-gray-500'
  const trendText = trendDirection === 'up' ? 'Improving' : trendDirection === 'down' ? 'Elevated Activity' : 'Stable'

  // Get bar color based on threat count
  const getBarColor = (threats: number) => {
    if (threats >= 10) return '#d92525' // Severe
    if (threats >= 5) return '#f59e0b' // Elevated
    return '#16a34a' // Normal
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-800">Week of {d.week}</p>
          <p className="text-sm text-gray-600">{d.threats} total threats</p>
          <p className="text-sm text-red-600">{d.energyThreats} energy-related</p>
          {d.kevCount > 0 && (
            <p className="text-sm text-purple-600">{d.kevCount} KEV entries</p>
          )}
        </div>
      )
    }
    return null
  }

  // Empty state
  if (!trend || trend.length === 0) {
    return (
      <section className="py-8 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="card-premium-trump p-6">
            <h3 className="text-xl font-bold text-cisa-navy mb-4">Threat Activity Trend</h3>
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-center">
                Not enough data to show trend
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="card-premium-trump p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-cisa-navy">Threat Activity (Last 4 Weeks)</h3>
            <div className={`flex items-center gap-2 ${trendColor}`}>
              <TrendIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{trendText}</span>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="energyThreats" radius={[4, 4, 0, 0]}>
                  {trend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.energyThreats)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-severity-normal" />
              <span>&lt;5 threats</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-severity-elevated" />
              <span>5-9 threats</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-severity-severe" />
              <span>10+ threats</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            Shows energy-relevant threats per week. Current score: {currentScore.toFixed(1)}
          </p>
        </div>
      </div>
    </section>
  )
}
