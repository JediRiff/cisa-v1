// CAPRI-E Alert Notifications
// Browser notifications + optional webhook

const WEBHOOK_KEY = 'capri-alert-webhook'
const LAST_ALERT_KEY = 'capri-last-alert-level'

export type AlertLevel = 'severe' | 'elevated' | 'normal'

export function getAlertLevel(score: number): AlertLevel {
  if (score <= 2.0) return 'severe'
  if (score <= 3.0) return 'elevated'
  return 'normal'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function checkAndTriggerAlerts(score: number): Promise<void> {
  if (typeof window === 'undefined') return

  const currentLevel = getAlertLevel(score)
  const lastLevel = localStorage.getItem(LAST_ALERT_KEY) as AlertLevel | null

  // Only alert when transitioning TO severe (not on every refresh)
  if (currentLevel === 'severe' && lastLevel !== 'severe') {
    await triggerAlert(score)
  }

  // Update stored level
  localStorage.setItem(LAST_ALERT_KEY, currentLevel)
}

async function triggerAlert(score: number): Promise<void> {
  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('CAPRI-E Alert: SEVERE', {
      body: `Energy sector risk score dropped to ${score.toFixed(1)}. Immediate attention recommended.`,
      icon: '/favicon.ico',
      tag: 'capri-severe-alert', // Prevents duplicate notifications
      requireInteraction: true
    })
  }

  // Webhook notification (if configured)
  const webhookUrl = getWebhookUrl()
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: 'CAPRI-E SEVERE',
          score: score,
          level: 'SEVERE',
          message: `Energy sector risk score dropped to ${score.toFixed(1)}`,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Webhook alert failed:', error)
    }
  }
}

export function setWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return
  if (url.trim()) {
    localStorage.setItem(WEBHOOK_KEY, url.trim())
  } else {
    localStorage.removeItem(WEBHOOK_KEY)
  }
}

export function getWebhookUrl(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(WEBHOOK_KEY) || ''
}

export function clearAlertState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LAST_ALERT_KEY)
}
