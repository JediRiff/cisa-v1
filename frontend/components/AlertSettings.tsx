'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Bell, CheckCircle, AlertCircle, Loader2, ExternalLink, Save, Send, ChevronDown, ChevronUp, Eye, EyeOff, Key } from 'lucide-react'

// localStorage keys
const WEBHOOK_URL_KEY = 'capri-webhook-url'
const ALERT_TRIGGERS_KEY = 'capri-alert-triggers'
const ENRICHMENT_KEY_ABUSEIPDB = 'capri-api-abuseipdb'
const ENRICHMENT_KEY_SHODAN = 'capri-api-shodan'
const ENRICHMENT_KEY_VIRUSTOTAL = 'capri-api-virustotal'
const ENRICHMENT_KEY_GREYNOISE = 'capri-api-greynoise'

export type EnrichmentSource = 'abuseipdb' | 'shodan' | 'virustotal' | 'greynoise'

const ENRICHMENT_STORAGE_KEYS: Record<EnrichmentSource, string> = {
  abuseipdb: ENRICHMENT_KEY_ABUSEIPDB,
  shodan: ENRICHMENT_KEY_SHODAN,
  virustotal: ENRICHMENT_KEY_VIRUSTOTAL,
  greynoise: ENRICHMENT_KEY_GREYNOISE,
}

export function getStoredEnrichmentKeys(): { abuseIPDBKey: string; shodanKey: string; virusTotalKey: string; greyNoiseKey: string } {
  if (typeof window === 'undefined') return { abuseIPDBKey: '', shodanKey: '', virusTotalKey: '', greyNoiseKey: '' }
  return {
    abuseIPDBKey: localStorage.getItem(ENRICHMENT_KEY_ABUSEIPDB) || '',
    shodanKey: localStorage.getItem(ENRICHMENT_KEY_SHODAN) || '',
    virusTotalKey: localStorage.getItem(ENRICHMENT_KEY_VIRUSTOTAL) || '',
    greyNoiseKey: localStorage.getItem(ENRICHMENT_KEY_GREYNOISE) || '',
  }
}

export function setStoredEnrichmentKey(source: EnrichmentSource, key: string): void {
  if (typeof window === 'undefined') return
  const storageKey = ENRICHMENT_STORAGE_KEYS[source]
  if (key.trim()) {
    localStorage.setItem(storageKey, key.trim())
  } else {
    localStorage.removeItem(storageKey)
  }
}

export interface AlertTriggers {
  criticalThreats: boolean
  newKevEntries: boolean
  scoreElevatedOrSevere: boolean
  nationStateActivity: boolean
}

interface AlertSettingsProps {
  isOpen: boolean
  onClose: () => void
  currentScore?: number
  currentLabel?: string
}

const DEFAULT_TRIGGERS: AlertTriggers = {
  criticalThreats: true,
  newKevEntries: true,
  scoreElevatedOrSevere: true,
  nationStateActivity: true,
}

type WebhookPlatform = 'slack' | 'discord' | 'telegram' | 'generic'

function detectPlatform(url: string): WebhookPlatform {
  if (!url) return 'generic'
  if (url.includes('hooks.slack.com')) return 'slack'
  if (url.includes('discord.com/api/webhooks') || url.includes('discordapp.com/api/webhooks')) return 'discord'
  if (url.includes('api.telegram.org/bot')) return 'telegram'
  return 'generic'
}

const PLATFORM_CONFIG: Record<WebhookPlatform, { label: string; color: string; bgColor: string; textColor: string }> = {
  slack: { label: 'Slack', color: '#4A154B', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  discord: { label: 'Discord', color: '#5865F2', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  telegram: { label: 'Telegram', color: '#0088cc', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  generic: { label: 'Generic Webhook', color: '#6B7280', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
}

export function getStoredWebhookUrl(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(WEBHOOK_URL_KEY) || ''
}

export function setStoredWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return
  if (url.trim()) {
    localStorage.setItem(WEBHOOK_URL_KEY, url.trim())
  } else {
    localStorage.removeItem(WEBHOOK_URL_KEY)
  }
}

export function getStoredAlertTriggers(): AlertTriggers {
  if (typeof window === 'undefined') return DEFAULT_TRIGGERS
  const stored = localStorage.getItem(ALERT_TRIGGERS_KEY)
  if (stored) {
    try {
      return { ...DEFAULT_TRIGGERS, ...JSON.parse(stored) }
    } catch {
      return DEFAULT_TRIGGERS
    }
  }
  return DEFAULT_TRIGGERS
}

export function setStoredAlertTriggers(triggers: AlertTriggers): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ALERT_TRIGGERS_KEY, JSON.stringify(triggers))
}

export function isWebhookConfigured(): boolean {
  return !!getStoredWebhookUrl()
}

// Webhook payload types
export type WebhookAlertType = 'critical_threat' | 'kev_added' | 'score_change' | 'nation_state' | 'test'

export interface WebhookPayload {
  alertType: WebhookAlertType
  title: string
  description: string
  details?: Record<string, string | number | boolean>
  dashboardUrl: string
  timestamp: string
}

// Helper to send webhook alerts
export async function sendWebhookAlert(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = getStoredWebhookUrl()
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' }
  }

  try {
    const response = await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, payload }),
    })

    const result = await response.json()
    return { success: result.success, error: result.error }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send webhook' }
  }
}

export default function AlertSettings({ isOpen, onClose, currentScore, currentLabel }: AlertSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [triggers, setTriggers] = useState<AlertTriggers>(DEFAULT_TRIGGERS)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const [expandedGuide, setExpandedGuide] = useState<WebhookPlatform | null>(null)

  // Enrichment API keys
  const [enrichmentKeys, setEnrichmentKeys] = useState({ abuseipdb: '', shodan: '', virustotal: '', greynoise: '' })
  const [enrichmentVisible, setEnrichmentVisible] = useState({ abuseipdb: false, shodan: false, virustotal: false, greynoise: false })
  const [enrichmentSaveStatus, setEnrichmentSaveStatus] = useState<'idle' | 'saved'>('idle')

  const detectedPlatform = detectPlatform(webhookUrl)

  // Load saved settings on mount
  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getStoredWebhookUrl())
      setTriggers(getStoredAlertTriggers())
      setTestStatus('idle')
      setTestError(null)
      setSaveStatus('idle')

      const keys = getStoredEnrichmentKeys()
      setEnrichmentKeys({
        abuseipdb: keys.abuseIPDBKey,
        shodan: keys.shodanKey,
        virustotal: keys.virusTotalKey,
        greynoise: keys.greyNoiseKey,
      })
      setEnrichmentVisible({ abuseipdb: false, shodan: false, virustotal: false, greynoise: false })
      setEnrichmentSaveStatus('idle')
    }
  }, [isOpen])

  const handleTriggerChange = useCallback((key: keyof AlertTriggers) => {
    setTriggers(prev => ({ ...prev, [key]: !prev[key] }))
    setSaveStatus('idle')
  }, [])

  const handleSave = useCallback(() => {
    setStoredWebhookUrl(webhookUrl)
    setStoredAlertTriggers(triggers)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [webhookUrl, triggers])

  const handleSaveEnrichmentKeys = useCallback(() => {
    setStoredEnrichmentKey('abuseipdb', enrichmentKeys.abuseipdb)
    setStoredEnrichmentKey('shodan', enrichmentKeys.shodan)
    setStoredEnrichmentKey('virustotal', enrichmentKeys.virustotal)
    setStoredEnrichmentKey('greynoise', enrichmentKeys.greynoise)
    setEnrichmentSaveStatus('saved')
    setTimeout(() => setEnrichmentSaveStatus('idle'), 2000)
  }, [enrichmentKeys])

  const handleTestWebhook = useCallback(async () => {
    if (!webhookUrl.trim()) {
      setTestError('Please enter a webhook URL first')
      setTestStatus('error')
      return
    }

    setTestStatus('sending')
    setTestError(null)

    // Save the webhook URL first so the API can use it
    setStoredWebhookUrl(webhookUrl)

    const dashboardUrl = typeof window !== 'undefined' ? window.location.origin : 'https://capri.example.com'

    const testPayload: WebhookPayload = {
      alertType: 'test',
      title: 'CAPRI Test Alert',
      description: 'This is a test message from CAPRI - Cyber Alert Prioritization & Readiness Index. If you received this, your webhook integration is working correctly.',
      details: {
        currentScore: currentScore ?? 0,
        currentLabel: currentLabel ?? 'Unknown',
        triggeredBy: 'Manual test from Alert Settings',
      },
      dashboardUrl,
      timestamp: new Date().toISOString(),
    }

    const result = await sendWebhookAlert(testPayload)

    if (result.success) {
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } else {
      setTestStatus('error')
      setTestError(result.error || 'Failed to send test webhook')
    }
  }, [webhookUrl, currentScore, currentLabel])

  if (!isOpen) return null

  const isConfigured = !!getStoredWebhookUrl()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="alert-settings-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform transition-all">
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="bg-cisa-navy px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-6 w-6 text-white" />
                  <h2 id="alert-settings-title" className="text-xl font-semibold text-white">
                    Alert Settings
                  </h2>
                </div>
                <button
                  type="button"
                  className="rounded-md text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                  onClick={onClose}
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-sm text-blue-100">
                Configure webhook notifications for CAPRI alerts
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Webhook Status */}
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                isConfigured ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                {isConfigured ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Webhook Configured</p>
                      <p className="text-sm text-green-600 truncate max-w-[280px]">
                        {getStoredWebhookUrl().replace(/^(https?:\/\/[^/]+).*/, '$1/...')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800">No Webhook Configured</p>
                      <p className="text-sm text-amber-600">Add a webhook URL to receive alerts</p>
                    </div>
                  </>
                )}
              </div>

              {/* Webhook URL Input */}
              <div className="mb-6">
                <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  id="webhook-url"
                  placeholder="Paste Slack, Discord, Telegram, or generic webhook URL"
                  value={webhookUrl}
                  onChange={(e) => {
                    setWebhookUrl(e.target.value)
                    setSaveStatus('idle')
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-cisa-navy focus:outline-none transition-colors"
                />
                {webhookUrl.trim() && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PLATFORM_CONFIG[detectedPlatform].bgColor} ${PLATFORM_CONFIG[detectedPlatform].textColor}`}>
                      {PLATFORM_CONFIG[detectedPlatform].label} detected
                    </span>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supports Slack, Discord, Telegram bots, and generic JSON webhook endpoints.
                </p>
              </div>

              {/* Test Webhook Button */}
              <div className="mb-6">
                <button
                  onClick={handleTestWebhook}
                  disabled={!webhookUrl.trim() || testStatus === 'sending'}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    testStatus === 'success'
                      ? 'bg-green-600 text-white'
                      : testStatus === 'error'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {testStatus === 'sending' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending test...
                    </>
                  ) : testStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Test sent successfully!
                    </>
                  ) : testStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-5 w-5" />
                      {testError || 'Test failed'}
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Test Message
                    </>
                  )}
                </button>
              </div>

              {/* Alert Triggers */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Alert Triggers</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Choose which events should trigger webhook notifications.
                </p>

                <div className="space-y-3">
                  {/* Critical Threats */}
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={triggers.criticalThreats}
                      onChange={() => handleTriggerChange('criticalThreats')}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-cisa-navy focus:ring-cisa-navy"
                    />
                    <div>
                      <span className="block font-medium text-gray-900">Critical threats detected</span>
                      <span className="text-sm text-gray-500">
                        Alert when new critical-severity threats are identified
                      </span>
                    </div>
                  </label>

                  {/* New KEV Entries */}
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={triggers.newKevEntries}
                      onChange={() => handleTriggerChange('newKevEntries')}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-cisa-navy focus:ring-cisa-navy"
                    />
                    <div>
                      <span className="block font-medium text-gray-900">New KEV entries added</span>
                      <span className="text-sm text-gray-500">
                        Alert when CISA adds new Known Exploited Vulnerabilities
                      </span>
                    </div>
                  </label>

                  {/* Score Changes */}
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={triggers.scoreElevatedOrSevere}
                      onChange={() => handleTriggerChange('scoreElevatedOrSevere')}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-cisa-navy focus:ring-cisa-navy"
                    />
                    <div>
                      <span className="block font-medium text-gray-900">Score reaches Elevated or Severe</span>
                      <span className="text-sm text-gray-500">
                        Alert when CAPRI score drops to 3.0 (Elevated) or 2.0 (Severe)
                      </span>
                    </div>
                  </label>

                  {/* Nation-State Activity */}
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={triggers.nationStateActivity}
                      onChange={() => handleTriggerChange('nationStateActivity')}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-cisa-navy focus:ring-cisa-navy"
                    />
                    <div>
                      <span className="block font-medium text-gray-900">Nation-state actor activity</span>
                      <span className="text-sm text-gray-500">
                        Alert when APT or nation-state threats are detected
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Platform Setup Guides */}
              <div className="mb-6 space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Setup Guides</h4>

                {/* Slack Guide */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedGuide(expandedGuide === 'slack' ? null : 'slack')}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors ${detectedPlatform === 'slack' ? 'bg-green-50 text-green-900' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <span>Slack</span>
                    {expandedGuide === 'slack' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedGuide === 'slack' && (
                    <div className="px-4 py-3 bg-white">
                      <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                        <li>Go to your Slack App settings</li>
                        <li>Enable &quot;Incoming Webhooks&quot;</li>
                        <li>Click &quot;Add New Webhook to Workspace&quot;</li>
                        <li>Select the channel for alerts</li>
                        <li>Copy the webhook URL and paste above</li>
                      </ol>
                      <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium">
                        Slack Webhooks Documentation <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Discord Guide */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedGuide(expandedGuide === 'discord' ? null : 'discord')}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors ${detectedPlatform === 'discord' ? 'bg-purple-50 text-purple-900' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <span>Discord</span>
                    {expandedGuide === 'discord' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedGuide === 'discord' && (
                    <div className="px-4 py-3 bg-white">
                      <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                        <li>Open Server Settings &gt; Integrations</li>
                        <li>Click &quot;Webhooks&quot; &gt; &quot;New Webhook&quot;</li>
                        <li>Name it (e.g., &quot;CAPRI Alerts&quot;) and select a channel</li>
                        <li>Click &quot;Copy Webhook URL&quot;</li>
                        <li>Paste the URL above</li>
                      </ol>
                      <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium">
                        Discord Webhooks Guide <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Telegram Guide */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedGuide(expandedGuide === 'telegram' ? null : 'telegram')}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors ${detectedPlatform === 'telegram' ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <span>Telegram</span>
                    {expandedGuide === 'telegram' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedGuide === 'telegram' && (
                    <div className="px-4 py-3 bg-white">
                      <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                        <li>Message <strong>@BotFather</strong> on Telegram and send <code>/newbot</code></li>
                        <li>Follow prompts to name your bot and get a <strong>bot token</strong></li>
                        <li>Add the bot to your group/channel, then send a message</li>
                        <li>Visit <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> to find your <strong>chat_id</strong></li>
                        <li>Construct URL: <code>https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage?chat_id=&lt;CHAT_ID&gt;</code></li>
                      </ol>
                      <p className="mt-2 text-xs text-gray-500">
                        Paste the full constructed URL above. CAPRI will extract the token and chat ID automatically.
                      </p>
                    </div>
                  )}
                </div>

                {/* Generic Guide */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedGuide(expandedGuide === 'generic' ? null : 'generic')}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors ${detectedPlatform === 'generic' && webhookUrl.trim() ? 'bg-gray-200 text-gray-900' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <span>Generic / Custom</span>
                    {expandedGuide === 'generic' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedGuide === 'generic' && (
                    <div className="px-4 py-3 bg-white">
                      <p className="text-sm text-gray-700 mb-2">
                        Any HTTP endpoint that accepts POST with JSON body. Payload format:
                      </p>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto text-gray-800">{`{
  "source": "CAPRI",
  "alertType": "critical_threat",
  "alertLabel": "Critical Threat",
  "title": "...",
  "description": "...",
  "details": { ... },
  "dashboardUrl": "...",
  "timestamp": "ISO-8601",
  "severity": "high"
}`}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrichment Sources */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700">Enrichment Sources</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Connect your own API keys to enable additional threat intelligence sources. All keys are stored locally in your browser.
                </p>

                <div className="space-y-4">
                  {/* AbuseIPDB */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="enrichment-abuseipdb" className="text-sm font-medium text-gray-700">AbuseIPDB</label>
                      <span className={`flex items-center gap-1.5 text-xs ${enrichmentKeys.abuseipdb ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${enrichmentKeys.abuseipdb ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {enrichmentKeys.abuseipdb ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={enrichmentVisible.abuseipdb ? 'text' : 'password'}
                        id="enrichment-abuseipdb"
                        placeholder="AbuseIPDB API key"
                        value={enrichmentKeys.abuseipdb}
                        onChange={(e) => {
                          setEnrichmentKeys(prev => ({ ...prev, abuseipdb: e.target.value }))
                          setEnrichmentSaveStatus('idle')
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:border-cisa-navy focus:outline-none transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setEnrichmentVisible(prev => ({ ...prev, abuseipdb: !prev.abuseipdb }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {enrichmentVisible.abuseipdb ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Free API key &rarr;{' '}
                      <a href="https://www.abuseipdb.com/account/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        abuseipdb.com/account/api
                      </a>
                    </p>
                  </div>

                  {/* Shodan */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="enrichment-shodan" className="text-sm font-medium text-gray-700">Shodan</label>
                      <span className={`flex items-center gap-1.5 text-xs ${enrichmentKeys.shodan ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${enrichmentKeys.shodan ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {enrichmentKeys.shodan ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={enrichmentVisible.shodan ? 'text' : 'password'}
                        id="enrichment-shodan"
                        placeholder="Shodan API key"
                        value={enrichmentKeys.shodan}
                        onChange={(e) => {
                          setEnrichmentKeys(prev => ({ ...prev, shodan: e.target.value }))
                          setEnrichmentSaveStatus('idle')
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:border-cisa-navy focus:outline-none transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setEnrichmentVisible(prev => ({ ...prev, shodan: !prev.shodan }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {enrichmentVisible.shodan ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Free API key &rarr;{' '}
                      <a href="https://account.shodan.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        account.shodan.io
                      </a>
                    </p>
                  </div>

                  {/* VirusTotal */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="enrichment-virustotal" className="text-sm font-medium text-gray-700">VirusTotal</label>
                      <span className={`flex items-center gap-1.5 text-xs ${enrichmentKeys.virustotal ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${enrichmentKeys.virustotal ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {enrichmentKeys.virustotal ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={enrichmentVisible.virustotal ? 'text' : 'password'}
                        id="enrichment-virustotal"
                        placeholder="VirusTotal API key"
                        value={enrichmentKeys.virustotal}
                        onChange={(e) => {
                          setEnrichmentKeys(prev => ({ ...prev, virustotal: e.target.value }))
                          setEnrichmentSaveStatus('idle')
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:border-cisa-navy focus:outline-none transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setEnrichmentVisible(prev => ({ ...prev, virustotal: !prev.virustotal }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {enrichmentVisible.virustotal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Free API key &rarr;{' '}
                      <a href="https://www.virustotal.com/gui/my-apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        virustotal.com/gui/my-apikey
                      </a>
                    </p>
                  </div>

                  {/* GreyNoise */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="enrichment-greynoise" className="text-sm font-medium text-gray-700">GreyNoise</label>
                      <span className={`flex items-center gap-1.5 text-xs ${enrichmentKeys.greynoise ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${enrichmentKeys.greynoise ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {enrichmentKeys.greynoise ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={enrichmentVisible.greynoise ? 'text' : 'password'}
                        id="enrichment-greynoise"
                        placeholder="GreyNoise Community API key"
                        value={enrichmentKeys.greynoise}
                        onChange={(e) => {
                          setEnrichmentKeys(prev => ({ ...prev, greynoise: e.target.value }))
                          setEnrichmentSaveStatus('idle')
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:border-cisa-navy focus:outline-none transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setEnrichmentVisible(prev => ({ ...prev, greynoise: !prev.greynoise }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {enrichmentVisible.greynoise ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Free API key &rarr;{' '}
                      <a href="https://viz.greynoise.io/account/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        viz.greynoise.io/account/api
                      </a>
                    </p>
                  </div>
                </div>

                {/* Save Enrichment Keys Button */}
                <button
                  type="button"
                  onClick={handleSaveEnrichmentKeys}
                  className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    enrichmentSaveStatus === 'saved'
                      ? 'bg-green-600 text-white'
                      : 'bg-cisa-navy text-white hover:bg-cisa-navy-dark'
                  }`}
                >
                  {enrichmentSaveStatus === 'saved' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Keys Saved!
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Save Keys
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                    saveStatus === 'saved'
                      ? 'bg-green-600 text-white'
                      : 'bg-cisa-navy text-white hover:bg-cisa-navy-dark'
                  }`}
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
