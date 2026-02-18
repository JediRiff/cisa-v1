'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Bell, CheckCircle, AlertCircle, Loader2, ExternalLink, Save, Send } from 'lucide-react'

// localStorage keys
const WEBHOOK_URL_KEY = 'capri-webhook-url'
const ALERT_TRIGGERS_KEY = 'capri-alert-triggers'

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

  // Load saved settings on mount
  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getStoredWebhookUrl())
      setTriggers(getStoredAlertTriggers())
      setTestStatus('idle')
      setTestError(null)
      setSaveStatus('idle')
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
                  placeholder="https://hooks.slack.com/services/... or any webhook URL"
                  value={webhookUrl}
                  onChange={(e) => {
                    setWebhookUrl(e.target.value)
                    setSaveStatus('idle')
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-cisa-navy focus:outline-none transition-colors"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Supports Slack incoming webhooks, Microsoft Teams, Discord, or any generic webhook endpoint.
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

              {/* Slack Setup Help */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Setting up Slack Webhooks</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to your Slack App settings</li>
                  <li>Enable &quot;Incoming Webhooks&quot;</li>
                  <li>Click &quot;Add New Webhook to Workspace&quot;</li>
                  <li>Select the channel for alerts</li>
                  <li>Copy the webhook URL and paste above</li>
                </ol>
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  Slack Webhooks Documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
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
