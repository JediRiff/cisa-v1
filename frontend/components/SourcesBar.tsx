'use client'

import { CheckCircle, XCircle } from 'lucide-react'

interface SourcesBarProps {
  sourcesOnline: number
  sourcesTotal: number
  totalItems: number
  errors: string[]
}

// The 7 sources used by CAPRI-E
const SOURCES = [
  { name: 'CISA KEV', type: 'government' },
  { name: 'CISA Advisories', type: 'government' },
  { name: 'Microsoft Security', type: 'vendor' },
  { name: 'Unit42', type: 'vendor' },
  { name: 'CrowdStrike', type: 'vendor' },
  { name: 'SentinelOne', type: 'vendor' },
  { name: 'Mandiant', type: 'vendor' },
]

export default function SourcesBar({ sourcesOnline, sourcesTotal, totalItems, errors }: SourcesBarProps) {
  const allOnline = sourcesOnline === sourcesTotal

  return (
    <section className="py-8 px-4 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-cisa-navy mb-2">Live Intelligence Sources</h3>
          <p className="text-gray-600">
            <span className="font-semibold text-cisa-navy">{totalItems}</span> threat items from{' '}
            <span className={`font-semibold ${allOnline ? 'text-green-600' : 'text-amber-600'}`}>
              {sourcesOnline}/{sourcesTotal}
            </span>{' '}
            sources
          </p>
        </div>

        {/* Sources Grid */}
        <div className="flex flex-wrap justify-center gap-3">
          {SOURCES.map((source, index) => {
            // Determine if this source is online (simplified - assumes first N are online)
            const isOnline = index < sourcesOnline
            const hasError = errors.some(e => e.toLowerCase().includes(source.name.toLowerCase()))

            return (
              <div
                key={source.name}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  isOnline && !hasError
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {isOnline && !hasError ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium">{source.name}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    source.type === 'government'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {source.type === 'government' ? 'GOV' : 'VENDOR'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <details className="mt-4 text-center">
            <summary className="text-sm text-red-600 cursor-pointer hover:underline">
              {errors.length} feed error(s) - click to expand
            </summary>
            <ul className="mt-2 text-xs text-red-500 space-y-1">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  )
}
