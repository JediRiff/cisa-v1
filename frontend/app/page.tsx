'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, RefreshCw, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react'

interface ThreatItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  source: string
  sourceType: 'government' | 'vendor' | 'energy'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown'
  isEnergyRelevant: boolean
}

interface ScoreFactor {
  name: string
  impact: number
  count: number
  description: string
}

interface ScoringWeight {
  name: string
  perItem: number
  maxImpact: number
  timeWindow: string
  rationale: string
}

interface ApiResponse {
  success: boolean
  score: {
    score: number
    label: string
    color: string
    factors: ScoreFactor[]
    summary: string
    methodology: Record<string, ScoringWeight>
    thresholds: Record<string, { max: number; color: string; label: string }>
  }
  threats: {
    all: ThreatItem[]
    energyRelevant: ThreatItem[]
    critical: ThreatItem[]
  }
  meta: {
    lastUpdated: string
    sourcesOnline: number
    sourcesTotal: number
    totalItems: number
    errors: string[]
  }
}

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/threats')
      const json = await response.json()
      if (json.success) {
        setData(json)
        setLastRefresh(new Date())
      } else {
        setError(json.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError('Network error - please try again')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const getTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return minutes + 'm ago'
    return Math.floor(minutes / 60) + 'h ago'
  }

  const getSeverityStyle = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
    }
    return styles[severity] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getSourceStyle = (sourceType: string) => {
    const styles: Record<string, string> = {
      government: 'bg-blue-50 text-blue-700',
      vendor: 'bg-purple-50 text-purple-700',
      energy: 'bg-amber-50 text-amber-700',
    }
    return styles[sourceType] || 'bg-gray-50 text-gray-700'
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-cisa-navy mx-auto mb-4" />
          <p className="text-gray-600">Loading threat intelligence from 7 sources...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-cisa-navy text-white rounded hover:bg-blue-800">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      {/* Hero Score Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-t-4" style={{ borderColor: data?.score.color }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg"
              style={{ backgroundColor: data?.score.color }}
            >
              {data?.score.score.toFixed(1)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Energy Sector Risk</h2>
              <p className="text-lg font-medium" style={{ color: data?.score.color }}>
                {data?.score.label}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4" />
                Updated {lastRefresh ? getTimeSince(lastRefresh) : 'never'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cisa-navy text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
        <p className="mt-4 text-gray-700">{data?.score.summary}</p>
      </div>

      {/* Score Factors */}
      {data?.score.factors && data.score.factors.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-cisa-navy" />
            Score Factors (Why This Score?)
          </h3>
          <div className="grid gap-3">
            {data.score.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{factor.name}</p>
                  <p className="text-sm text-gray-600">{factor.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-red-600 font-bold">{factor.impact.toFixed(2)}</span>
                  <p className="text-sm text-gray-500">{factor.count} items</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Status */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Feed Sources</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium">{data?.meta.sourcesOnline}/{data?.meta.sourcesTotal} Online</span>
          </div>
          <div className="text-sm text-gray-500">{data?.meta.totalItems} total threat items</div>
          {data?.meta.errors && data.meta.errors.length > 0 && (
            <details className="text-sm text-red-600">
              <summary className="cursor-pointer">{data.meta.errors.length} feed error(s)</summary>
              <ul className="mt-2 text-xs">{data.meta.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </details>
          )}
        </div>
      </div>

      {/* Threat Feeds */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Energy-Relevant Threats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Energy Sector Alerts ({data?.threats.energyRelevant.length || 0})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data?.threats.energyRelevant.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No energy-specific threats detected</p>
            ) : (
              data?.threats.energyRelevant.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <a href={item.link} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-gray-900 hover:text-cisa-navy flex items-center gap-1">
                    {item.title.substring(0, 80)}{item.title.length > 80 ? '...' : ''}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + getSourceStyle(item.sourceType)}>{item.source}</span>
                    <span className={'text-xs px-2 py-0.5 rounded-full border ' + getSeverityStyle(item.severity)}>{item.severity}</span>
                    <span className="text-xs text-gray-500">{formatDate(item.pubDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Recent Threats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-cisa-navy" />
            All Recent Threats ({data?.threats.all.length || 0})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data?.threats.all.slice(0, 15).map((item) => (
              <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50">
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-gray-900 hover:text-cisa-navy flex items-center gap-1">
                  {item.title.substring(0, 80)}{item.title.length > 80 ? '...' : ''}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + getSourceStyle(item.sourceType)}>{item.source}</span>
                  <span className={'text-xs px-2 py-0.5 rounded-full border ' + getSeverityStyle(item.severity)}>{item.severity}</span>
                  <span className="text-xs text-gray-500">{formatDate(item.pubDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Source Methodology */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-cisa-navy" />
          Open Source Scoring Methodology
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          CAPRI-E uses transparent, publicly-documented weights. Base score starts at 5.0 (Normal)
          and decreases based on detected threats. All calculations are open source.
        </p>
        {data?.score.methodology && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Factor</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Per Item</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Max Impact</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Window</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(data.score.methodology).map(([key, weight]) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{weight.name}</td>
                    <td className="px-3 py-2 text-center text-red-600 font-mono">{weight.perItem}</td>
                    <td className="px-3 py-2 text-center text-red-600 font-mono">{weight.maxImpact}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{weight.timeWindow}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{weight.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scale Legend */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CAPRI-E Score Scale (CPCON Model)</h3>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#d92525'}}></div>
            <span className="text-sm">1.0-2.0: <strong>Severe</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#f59e0b'}}></div>
            <span className="text-sm">2.1-3.0: <strong>Elevated</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#16a34a'}}></div>
            <span className="text-sm">3.1-5.0: <strong>Normal</strong></span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Score calculated from live feeds: CISA KEV, CISA Advisories, Microsoft Security, Unit42, CrowdStrike, SentinelOne, and Dragos.
          Auto-refreshes every 10 minutes.
        </p>
      </div>
    </div>
  )
}