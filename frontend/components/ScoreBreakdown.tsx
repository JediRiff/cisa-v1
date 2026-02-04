'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'

interface FactorItem {
  id: string
  title: string
  link: string
  source: string
  pubDate?: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })
}

function isCISASource(source: string): boolean {
  return source.startsWith('CISA') || source === 'CISA KEV' ||
         source === 'CISA Advisories' || source === 'CISA ICS-CERT'
}

interface ScoreFactor {
  name: string
  impact: number
  count: number
  description: string
  items?: FactorItem[]
}

interface ScoreBreakdownProps {
  score: number
  label: string
  color: string
  factors: ScoreFactor[]
}

export default function ScoreBreakdown({ score, label, color, factors }: ScoreBreakdownProps) {
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null)

  // Calculate position on the scale (5.0 = 0%, 1.0 = 100%)
  const position = ((5.0 - score) / 4.0) * 100

  // Filter factors that have actual impact
  const activeFactors = factors.filter(f => f.impact !== 0)

  const toggleFactor = (name: string) => {
    setExpandedFactor(expandedFactor === name ? null : name)
  }

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-cisa-navy mb-6">
          Score Breakdown
        </h2>

        {/* Visual Score Bar */}
        <div className="mb-6">
          <div className="relative">
            {/* Background gradient bar */}
            <div className="h-3 rounded-full bg-gradient-to-r from-severity-normal via-severity-elevated to-severity-severe" />

            {/* Score indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md"
              style={{
                left: `calc(${position}% - 12px)`,
                backgroundColor: color
              }}
            />
          </div>

          {/* Scale labels */}
          <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
            <span>5.0 Normal</span>
            <span>3.0 Elevated</span>
            <span>1.0 Severe</span>
          </div>
        </div>

        {/* Score Calculation Breakdown */}
        <div className="bg-cisa-light rounded-xl p-4">
          {/* Starting score */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Starting Score</span>
            <span className="text-lg font-bold text-severity-normal">5.0</span>
          </div>

          {/* Active factors - Expandable */}
          {activeFactors.length > 0 ? (
            activeFactors.map((factor) => (
              <div key={factor.name} className="border-b border-gray-200">
                {/* Factor Header - Clickable */}
                <button
                  onClick={() => toggleFactor(factor.name)}
                  className="w-full flex items-center justify-between py-2 hover:bg-white/50 transition-colors rounded"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        expandedFactor === factor.name ? 'rotate-180' : ''
                      }`}
                    />
                    <span className="text-red-500 font-bold">−</span>
                    <span className="text-sm text-gray-800">{factor.name}</span>
                    <span className="text-xs text-gray-500">({factor.count} items)</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{Math.abs(factor.impact).toFixed(1)}</span>
                </button>

                {/* Expanded Items */}
                {expandedFactor === factor.name && factor.items && factor.items.length > 0 && (
                  <div className="pl-8 pb-3 space-y-1">
                    {factor.items.slice(0, 5).map((item) => (
                      <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-gray-600 hover:text-cisa-navy py-1"
                      >
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                        <span className="truncate flex-1">{item.title.substring(0, 60)}{item.title.length > 60 ? '...' : ''}</span>
                        {isCISASource(item.source) && (
                          <span className="px-1 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded flex-shrink-0">CISA</span>
                        )}
                        <span className="text-gray-400 flex-shrink-0">
                          {item.source}
                          {item.pubDate && item.source === 'CISA KEV' && ` · Added ${formatDate(item.pubDate)}`}
                        </span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ))}
                    {factor.count > 5 && (
                      <p className="text-xs text-gray-400 pl-3">
                        and {factor.count - 5} more...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-2 text-center text-sm text-gray-500">
              No active threat factors detected
            </div>
          )}

          {/* Final score */}
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-sm font-semibold text-gray-900">Current Score</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color }}>
                {score.toFixed(1)}
              </span>
              <span
                className="px-2 py-1 rounded text-white text-xs font-semibold"
                style={{ backgroundColor: color }}
              >
                {label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
