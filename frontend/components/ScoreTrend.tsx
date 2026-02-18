'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getHistory, ScoreSnapshot } from '@/lib/history'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ChartDataPoint {
  date: string
  score: number
  label: string
}

export default function ScoreTrend() {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')

  useEffect(() => {
    const history = getHistory()
    if (history.length < 2) {
      setData([])
      return
    }

    // Convert history to chart data
    const chartData: ChartDataPoint[] = history.map((snapshot: ScoreSnapshot) => ({
      date: new Date(snapshot.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      score: snapshot.score,
      label: snapshot.label
    }))

    setData(chartData)

    // Calculate trend (compare first half avg to second half avg)
    if (chartData.length >= 4) {
      const midpoint = Math.floor(chartData.length / 2)
      const firstHalfAvg = chartData.slice(0, midpoint).reduce((sum, d) => sum + d.score, 0) / midpoint
      const secondHalfAvg = chartData.slice(midpoint).reduce((sum, d) => sum + d.score, 0) / (chartData.length - midpoint)
      const diff = secondHalfAvg - firstHalfAvg
      if (diff > 0.2) setTrend('up')
      else if (diff < -0.2) setTrend('down')
      else setTrend('stable')
    }
  }, [])

  // Empty state
  if (data.length < 2) {
    return (
      <section className="py-8 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="card-premium-trump p-6">
            <h3 className="text-xl font-bold text-cisa-navy mb-4">Score Trend</h3>
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-center">
                Not enough data yet — check back in a few days
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-600">{d.date}</p>
          <p className="text-lg font-bold" style={{ color: getScoreColor(d.score) }}>
            {d.score.toFixed(1)} — {d.label}
          </p>
        </div>
      )
    }
    return null
  }

  const getScoreColor = (score: number) => {
    if (score <= 2.0) return '#d92525'
    if (score <= 3.0) return '#f59e0b'
    return '#16a34a'
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
  const trendText = trend === 'up' ? 'Improving' : trend === 'down' ? 'Worsening' : 'Stable'

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="card-premium-trump p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-cisa-navy">Score Trend (Last 30 Days)</h3>
            <div className={`flex items-center gap-2 ${trendColor}`}>
              <TrendIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{trendText}</span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Severity zone reference lines */}
                <ReferenceLine y={2} stroke="#d92525" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#003366"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  dot={{ fill: '#003366', strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: '#003366', strokeWidth: 2, stroke: '#fff', r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-severity-severe" />
              <span>Severe (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-severity-elevated" />
              <span>Elevated (2-3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-severity-normal" />
              <span>Normal (3-5)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
