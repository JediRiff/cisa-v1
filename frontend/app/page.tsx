'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { AlertTriangle, Shield, RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, Bell, BellOff, ChevronDown, MessageSquare } from 'lucide-react'
import { saveScore } from '@/lib/history'
import { checkAndTriggerAlerts, requestNotificationPermission, getNotificationPermission, setWebhookUrl, getWebhookUrl } from '@/lib/alerts'
import ActionableRecommendations, { type KEVAction } from '@/components/ActionableRecommendations'
import ScoreBreakdown from '@/components/ScoreBreakdown'
import ScoringMethodology from '@/components/ScoringMethodology'
import KeyMetrics from '@/components/KeyMetrics'

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

interface FactorItem {
  id: string
  title: string
  link: string
  source: string
}

interface ScoreFactor {
  name: string
  impact: number
  count: number
  description: string
  items?: FactorItem[]
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
  kev: KEVAction[]
  meta: {
    lastUpdated: string
    sourcesOnline: number
    sourcesTotal: number
    totalItems: number
    alertsThisWeek: number
    last24h: {
      kev: number
      nationState: number
      ics: number
      total: number
    }
    errors: string[]
  }
}

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default')
  const [webhookUrl, setWebhookUrlState] = useState('')
  const [showAlertSettings, setShowAlertSettings] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/threats')
      const json = await response.json()
      if (json.success) {
        setData(json)
        setLastRefresh(new Date())
        saveScore(json.score.score, json.score.label)
        checkAndTriggerAlerts(json.score.score)
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
    setNotificationStatus(getNotificationPermission())
    setWebhookUrlState(getWebhookUrl())
    fetchData()
    const interval = setInterval(fetchData, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleEnableAlerts = async () => {
    const granted = await requestNotificationPermission()
    setNotificationStatus(granted ? 'granted' : 'denied')
  }

  const handleWebhookSave = () => {
    setWebhookUrl(webhookUrl)
    setShowAlertSettings(false)
  }

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

  const isCISASource = (source: string) => {
    return source.startsWith('CISA') || source === 'CISA KEV' ||
           source === 'CISA Advisories'
  }

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id)
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/cisa-logo.svg"
            alt="CISA"
            width={300}
            height={60}
            className="h-14 w-auto mx-auto mb-6"
          />
          <p className="text-2xl font-bold text-cisa-navy mb-2">CAPRI</p>
          <p className="text-lg text-gray-600">Critical Infrastructure Alert Prioritization Index</p>
          <RefreshCw className="h-8 w-8 animate-spin text-cisa-navy mx-auto mt-4" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <p className="text-xl text-red-600 font-medium mb-4">{error}</p>
          <button onClick={fetchData} className="px-6 py-3 bg-cisa-navy text-white rounded-xl hover:bg-cisa-navy-dark transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - TrumpCard.gov Style */}
      <section className="hero-bg-pattern relative py-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          {/* CISA Agency Identifier with Official Logo */}
          <div className="flex justify-center mb-10">
            <Image
              src="/cisa-logo.svg"
              alt="CISA - Cybersecurity and Infrastructure Security Agency"
              width={400}
              height={80}
              className="h-16 md:h-20 w-auto"
              priority
            />
          </div>

          {/* Big Bold Hero Heading */}
          <div className="text-center mb-10">
            <h1 className="hero-heading text-6xl md:text-7xl lg:text-8xl text-cisa-navy mb-6">
              CAPRI
            </h1>
            <div className="inline-block">
              <p className="text-lg md:text-xl text-cisa-navy font-semibold tracking-wide uppercase">
                Cyber Alert Prioritization & Readiness Index
              </p>
              <div className="h-1 bg-gradient-to-r from-cisa-red via-white to-cisa-navy mt-3 rounded-full"></div>
            </div>
          </div>

          {/* Score Display - Centered and Enlarged */}
          <div className="flex flex-col items-center gap-6 mb-12">
            <div
              className="w-40 h-40 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-hero"
              style={{ backgroundColor: data?.score.color }}
            >
              {data?.score.score.toFixed(1)}
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Current Threat Level</h2>
              <p className="text-2xl font-semibold" style={{ color: data?.score.color }}>
                {data?.score.label}
              </p>
              <p className="text-sm text-gray-500 flex items-center justify-center gap-2 mt-3">
                <Clock className="h-4 w-4" />
                Updated {lastRefresh ? getTimeSince(lastRefresh) : 'never'}
              </p>
            </div>
          </div>

          {/* Action Buttons - Enhanced */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => notificationStatus === 'granted' ? setShowAlertSettings(!showAlertSettings) : handleEnableAlerts()}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-md hover:shadow-lg ${
                notificationStatus === 'granted'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white text-cisa-navy border-2 border-cisa-navy hover:bg-cisa-light'
              }`}
            >
              {notificationStatus === 'granted' ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
              {notificationStatus === 'granted' ? 'Alerts Enabled' : 'Enable Alerts'}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-4 bg-cisa-navy text-white rounded-xl font-semibold text-lg hover:bg-cisa-navy-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Alert Settings Panel */}
          {showAlertSettings && (
            <div className="max-w-lg mx-auto mt-8 p-6 bg-white rounded-2xl shadow-card-premium border border-gray-100">
              <h4 className="font-semibold text-cisa-navy mb-2 text-lg">Alert Settings</h4>
              <p className="text-sm text-gray-600 mb-4">
                Receive notifications when the score drops to Severe (≤2.0).
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Optional: Webhook URL (Slack, etc.)"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrlState(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-cisa-navy focus:outline-none"
                />
                <button
                  onClick={handleWebhookSave}
                  className="px-6 py-3 bg-cisa-navy text-white rounded-xl font-medium hover:bg-cisa-navy-dark"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Key Metrics - 3 Navy Boxes */}
      {data && (
        <KeyMetrics
          score={data.score.score}
          label={data.score.label}
          color={data.score.color}
          last24h={data.meta.last24h || { kev: 0, nationState: 0, ics: 0, total: 0 }}
        />
      )}

      {/* Score Breakdown - How It's Calculated */}
      {data && (
        <ScoreBreakdown
          score={data.score.score}
          label={data.score.label}
          color={data.score.color}
          factors={data.score.factors}
        />
      )}

      {/* Scoring Methodology - Expandable Explanation */}
      <ScoringMethodology />

      {/* Actionable Recommendations - THE CORE VALUE */}
      {/* Now shows specific KEV items with due dates, not generic advice */}
      {data && (
        <ActionableRecommendations kevItems={data.kev} />
      )}

      {/* Decorative Divider */}
      <div className="govt-top-border"></div>

      {/* Key Features - Navy Boxes (TrumpCard Style) - Simplified */}
      <section className="py-16 px-4 bg-white hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="hero-heading text-4xl md:text-5xl text-cisa-navy text-center mb-4">
            Energy Sector Protection
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Comprehensive threat monitoring for America&apos;s critical infrastructure
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature Box 1 */}
            <div className="feature-box-navy">
              <div className="feature-icon">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3>Real-Time Monitoring</h3>
              <p>
                7 threat intelligence sources aggregated every 10 minutes.
              </p>
            </div>

            {/* Feature Box 2 */}
            <div className="feature-box-navy">
              <div className="feature-icon">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h3>Energy Sector Focus</h3>
              <p>
                Filtered for power grids, pipelines, and energy infrastructure.
              </p>
            </div>

            {/* Feature Box 3 */}
            <div className="feature-box-navy">
              <div className="feature-icon">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h3>Instant Alerts</h3>
              <p>
                Browser notifications and webhooks for critical threats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="govt-top-border"></div>

      {/* Live Feed Sources */}
      <section className="py-8 px-4 bg-cisa-light">
        <div className="max-w-6xl mx-auto">
          <div className="card-premium-trump p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <span className="text-3xl font-bold text-cisa-navy">{data?.meta.sourcesOnline}/{data?.meta.sourcesTotal}</span>
                <span className="text-gray-600 ml-2 text-lg">Sources Online</span>
              </div>
            </div>
            <div className="text-gray-600 text-lg font-medium">{data?.meta.totalItems} threat items aggregated</div>
            {data?.meta.errors && data.meta.errors.length > 0 && (
              <details className="text-sm text-red-600">
                <summary className="cursor-pointer font-medium">{data.meta.errors.length} feed error(s)</summary>
                <ul className="mt-2 text-xs">{data.meta.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </details>
            )}
          </div>
        </div>
      </section>

      {/* Threat Feeds */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Energy-Relevant Threats */}
            <div className="card-premium-trump p-8">
              <h3 className="text-2xl font-bold text-cisa-navy mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                Energy Sector Alerts
                <span className="text-sm font-normal text-gray-500 ml-auto">({data?.threats.energyRelevant.length || 0})</span>
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {data?.threats.energyRelevant.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No energy-specific threats detected</p>
                ) : (
                  data?.threats.energyRelevant.map((item) => (
                    <div key={item.id} className="p-4 border border-gray-100 rounded-xl hover:bg-cisa-light transition-colors">
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-cisa-navy flex items-start gap-2 mb-2">
                        <span>{item.title.substring(0, 100)}{item.title.length > 100 ? '...' : ''}</span>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                      </a>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isCISASource(item.source) && (
                          <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded">CISA</span>
                        )}
                        <span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + getSourceStyle(item.sourceType)}>{item.source}</span>
                        <span className={'text-xs px-2.5 py-1 rounded-full border font-medium ' + getSeverityStyle(item.severity)}>{item.severity}</span>
                        <span className="text-xs text-gray-500">{formatDate(item.pubDate)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* All Recent Threats */}
            <div className="card-premium-trump p-8">
              <h3 className="text-2xl font-bold text-cisa-navy mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-cisa-navy" />
                </div>
                All Recent Threats
                <span className="text-sm font-normal text-gray-500 ml-auto">({data?.threats.all.length || 0})</span>
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {data?.threats.all.slice(0, 15).map((item) => (
                  <div key={item.id} className="p-4 border border-gray-100 rounded-xl hover:bg-cisa-light transition-colors">
                    <a href={item.link} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-cisa-navy flex items-start gap-2 mb-2">
                      <span>{item.title.substring(0, 100)}{item.title.length > 100 ? '...' : ''}</span>
                      <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                    </a>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCISASource(item.source) && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded">CISA</span>
                      )}
                      <span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + getSourceStyle(item.sourceType)}>{item.source}</span>
                      <span className={'text-xs px-2.5 py-1 rounded-full border font-medium ' + getSeverityStyle(item.severity)}>{item.severity}</span>
                      <span className="text-xs text-gray-500">{formatDate(item.pubDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology Section - Hidden (replaced by ScoreBreakdown) */}
      <section className="py-16 px-4 bg-white hidden">
        <div className="max-w-3xl mx-auto">
          <h2 className="hero-heading text-4xl md:text-5xl text-center text-cisa-navy mb-12">
            Methodology
          </h2>
          <div className="space-y-4">
            {/* Scoring Method */}
            <div className="accordion-trump">
              <button onClick={() => toggleFaq('scoring')} className="accordion-trigger-trump">
                <span>How is the score calculated?</span>
                <ChevronDown className={`arrow-icon transition-transform duration-300 ${expandedFaq === 'scoring' ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 'scoring' && (
                <div className="accordion-content-trump pt-4">
                  <p className="mb-4">
                    The score starts at 5.0 (Normal) and decreases based on detected threats. Each threat category has documented weights:
                  </p>
                  {data?.score.methodology && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-cisa-light">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-cisa-navy">Factor</th>
                            <th className="px-3 py-2 text-center font-semibold text-cisa-navy">Per Item</th>
                            <th className="px-3 py-2 text-center font-semibold text-cisa-navy">Max</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(data.score.methodology).map(([key, weight]) => (
                            <tr key={key}>
                              <td className="px-3 py-2 text-gray-900">{weight.name}</td>
                              <td className="px-3 py-2 text-center text-red-600 font-mono">{weight.perItem}</td>
                              <td className="px-3 py-2 text-center text-red-600 font-mono">{weight.maxImpact}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sources */}
            <div className="accordion-trump">
              <button onClick={() => toggleFaq('sources')} className="accordion-trigger-trump">
                <span>What sources are used?</span>
                <ChevronDown className={`arrow-icon transition-transform duration-300 ${expandedFaq === 'sources' ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 'sources' && (
                <div className="accordion-content-trump pt-4">
                  <p className="mb-3">CAPRI aggregates from 7 verified threat intelligence sources:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> <strong>CISA KEV</strong> - Known Exploited Vulnerabilities</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> <strong>CISA Advisories</strong> - Official cybersecurity alerts</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> <strong>Microsoft Security</strong> - Threat intelligence blog</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> <strong>Unit42</strong> - Palo Alto threat research</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> <strong>CrowdStrike</strong> - Threat intelligence</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> <strong>SentinelOne</strong> - Security research</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> <strong>Mandiant</strong> - Google threat intelligence</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Updates */}
            <div className="accordion-trump">
              <button onClick={() => toggleFaq('updates')} className="accordion-trigger-trump">
                <span>How often does it update?</span>
                <ChevronDown className={`arrow-icon transition-transform duration-300 ${expandedFaq === 'updates' ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 'updates' && (
                <div className="accordion-content-trump pt-4">
                  <p>
                    The dashboard auto-refreshes every <strong>10 minutes</strong> when open. The API caches data for 5 minutes to balance freshness with performance. You can also manually refresh at any time using the Refresh button.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* General Feedback Banner */}
      <section className="py-8 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-blue-800 font-medium text-center sm:text-left">
              Have any feedback? Want to change something?
            </p>
            <a
              href="https://github.com/JediRiff/cisa-v1/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-cisa-navy text-white rounded-lg font-medium hover:bg-cisa-navy-dark transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <MessageSquare className="h-5 w-5" />
              Submit feedback here
            </a>
          </div>
        </div>
      </section>

      {/* Score Scale Legend */}
      <section className="py-12 px-4 bg-cisa-light">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-cisa-navy mb-8 text-center">CAPRI Score Scale</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border-l-4 border-severity-severe shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-severity-severe"></div>
                <span className="text-xl font-bold text-severity-severe">1.0 - 2.0</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Severe</h4>
              <p className="text-gray-600 text-sm">High threat activity. Immediate attention recommended.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-l-4 border-severity-elevated shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-severity-elevated"></div>
                <span className="text-xl font-bold text-severity-elevated">2.1 - 3.0</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Elevated</h4>
              <p className="text-gray-600 text-sm">Increased threat activity. Enhanced monitoring advised.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-l-4 border-severity-normal shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-severity-normal"></div>
                <span className="text-xl font-bold text-severity-normal">3.1 - 5.0</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Normal</h4>
              <p className="text-gray-600 text-sm">Baseline threat levels. Standard security posture.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - CISA.gov Style Two-Tier */}
      {/* Top Tier - Navy */}
      <footer className="bg-cisa-navy text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-200 mr-2">Follow CISA:</span>
              <a href="https://www.facebook.com/CISA" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://twitter.com/CISAgov" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/cisagov" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://www.youtube.com/cisagov" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>

            {/* Contact */}
            <div className="text-right hidden lg:block">
              <p className="text-sm text-blue-200">CISA Central</p>
              <p className="font-semibold">1-844-Say-CISA</p>
              <p className="text-sm text-blue-200">contact@cisa.dhs.gov</p>
            </div>
          </div>
        </div>

        {/* Bottom Tier - Light Gray */}
        <div className="bg-slate-200 text-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
              {/* Government Logos */}
              <div className="flex items-center gap-8 flex-wrap">
                {/* CISA Logo */}
                <Image
                  src="/cisa-logo.svg"
                  alt="CISA - Cybersecurity and Infrastructure Security Agency"
                  width={200}
                  height={50}
                  className="h-12 w-auto"
                />
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-3 text-sm">
                <a href="https://www.cisa.gov/about" className="hover:text-cisa-navy hover:underline">About CISA</a>
                <a href="https://www.dhs.gov" className="hover:text-cisa-navy hover:underline">DHS.gov</a>
                <a href="https://www.cisa.gov/foia" className="hover:text-cisa-navy hover:underline">FOIA Requests</a>
                <a href="https://www.whitehouse.gov" className="hover:text-cisa-navy hover:underline">The White House</a>
                <a href="https://www.cisa.gov/privacy-policy" className="hover:text-cisa-navy hover:underline">Privacy Policy</a>
                <a href="https://www.usa.gov" className="hover:text-cisa-navy hover:underline">USA.gov</a>
                <a href="https://www.cisa.gov/subscribe" className="hover:text-cisa-navy hover:underline">Subscribe</a>
                <a href="https://www.cisa.gov/contact-us" className="hover:text-cisa-navy hover:underline">Contact Us</a>
              </div>

              {/* CAPRI-E Status Widget */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 min-w-[200px]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Threat Level</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: data?.score.color }}
                  >
                    {data?.score.score.toFixed(1)}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: data?.score.color }}>{data?.score.label}</p>
                    <p className="text-xs text-gray-500">{data?.meta.sourcesOnline}/{data?.meta.sourcesTotal} sources</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
