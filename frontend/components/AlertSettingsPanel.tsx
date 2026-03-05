'use client'

import { useState } from 'react'
import { X, Bell, Send, Check, AlertTriangle } from 'lucide-react'
import { AlertConfig, AlertRule, saveAlertConfig } from '@/lib/alertRules'

interface AlertSettingsPanelProps {
  config: AlertConfig
  onConfigChange: (config: AlertConfig) => void
  onClose: () => void
}

export default function AlertSettingsPanel({ config, onConfigChange, onClose }: AlertSettingsPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  function updateWebhookUrl(url: string) {
    setWebhookUrl(url)
    const updated = { ...config, webhookUrl: url }
    saveAlertConfig(updated)
    onConfigChange(updated)
  }

  function toggleRule(ruleId: string) {
    const updated = {
      ...config,
      rules: config.rules.map(r =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
    }
    saveAlertConfig(updated)
    onConfigChange(updated)
  }

  function updateThreshold(ruleId: string, value: number) {
    const updated = {
      ...config,
      rules: config.rules.map(r =>
        r.id === ruleId ? { ...r, threshold: value } : r
      ),
    }
    saveAlertConfig(updated)
    onConfigChange(updated)
  }

  async function testWebhook() {
    if (!webhookUrl) return
    setTestStatus('sending')
    setTestError('')
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          payload: {
            alertType: 'test' as const,
            title: 'CAPRI Alert Test',
            description: 'This is a test message from CAPRI Alert Configuration. If you see this, your webhook is working correctly.',
            details: { source: 'Alert Settings Panel', timestamp: new Date().toISOString() },
            dashboardUrl: window.location.origin + '/globe',
            timestamp: new Date().toISOString(),
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTestStatus('success')
        setTimeout(() => setTestStatus('idle'), 3000)
      } else {
        setTestStatus('error')
        setTestError(data.error || 'Unknown error')
      }
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Failed to send')
    }
  }

  // Group rules by type for display
  const scoreRules = config.rules.filter(r => r.type === 'capri_score_below')
  const kevRules = config.rules.filter(r => r.type === 'kev_sector')
  const nsRules = config.rules.filter(r => r.type === 'nation_state_sector')
  const facilityRules = config.rules.filter(r => r.type === 'facility_risk_below')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[80vh] bg-[#0d1526] border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Alert Configuration</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* Webhook URL */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-1.5">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => updateWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
              <button
                onClick={testWebhook}
                disabled={!webhookUrl || testStatus === 'sending'}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-colors disabled:opacity-40"
              >
                {testStatus === 'sending' ? (
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : testStatus === 'success' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : testStatus === 'error' ? (
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                Test
              </button>
            </div>
            {testStatus === 'error' && testError && (
              <p className="text-[10px] text-red-400 mt-1">{testError}</p>
            )}
            {testStatus === 'success' && (
              <p className="text-[10px] text-emerald-400 mt-1">Webhook test sent successfully</p>
            )}
            <p className="text-[10px] text-gray-600 mt-1">Supports Slack, Discord, Telegram, and generic webhooks</p>
          </div>

          {/* Rule Groups */}
          <RuleGroup title="CAPRI Score Alerts" rules={scoreRules} onToggle={toggleRule} onThresholdChange={updateThreshold} />
          <RuleGroup title="KEV Sector Alerts" rules={kevRules} onToggle={toggleRule} />
          <RuleGroup title="Nation-State Sector Alerts" rules={nsRules} onToggle={toggleRule} />
          <RuleGroup title="Facility Risk Alerts" rules={facilityRules} onToggle={toggleRule} onThresholdChange={updateThreshold} />

          {/* Cooldown info */}
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Each rule has a 5-minute cooldown after firing to prevent alert flooding.
              Rules are evaluated whenever new threat data is fetched (~60s interval).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RuleGroup({
  title,
  rules,
  onToggle,
  onThresholdChange,
}: {
  title: string
  rules: AlertRule[]
  onToggle: (id: string) => void
  onThresholdChange?: (id: string, value: number) => void
}) {
  if (rules.length === 0) return null

  return (
    <div>
      <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">{title}</h3>
      <div className="space-y-1.5">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`flex items-center justify-between gap-3 bg-white/[0.03] border rounded-lg px-3 py-2.5 transition-colors ${
              rule.enabled ? 'border-white/10' : 'border-white/5 opacity-60'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white font-medium">{rule.label}</span>
                {rule.threshold != null && onThresholdChange && (
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={rule.threshold}
                    onChange={(e) => onThresholdChange(rule.id, parseFloat(e.target.value) || 2)}
                    className="w-14 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono text-center focus:outline-none focus:border-white/20"
                  />
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{rule.description}</p>
            </div>
            <button
              onClick={() => onToggle(rule.id)}
              className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${
                rule.enabled ? 'bg-emerald-500/60' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  rule.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
