// CAPRI-E Score History Tracking
// Uses localStorage for simple, functional persistence

export interface ScoreSnapshot {
  timestamp: string
  score: number
  label: string
}

const STORAGE_KEY = 'capri-score-history'
const MAX_AGE_DAYS = 30

export function saveScore(score: number, label: string): void {
  if (typeof window === 'undefined') return

  const history = getHistory()

  // Avoid duplicate entries within 5 minutes
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  const recentEntry = history.find(h => new Date(h.timestamp).getTime() > fiveMinutesAgo)
  if (recentEntry) return

  history.push({
    timestamp: new Date().toISOString(),
    score,
    label
  })

  // Keep last 30 days only
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const trimmed = history.filter(h => new Date(h.timestamp).getTime() > cutoff)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function getHistory(): ScoreSnapshot[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function getLatestScore(): ScoreSnapshot | null {
  const history = getHistory()
  return history.length > 0 ? history[history.length - 1] : null
}

// ─── Weekly Trend Snapshots ─────────────────────────────────────────────────────
// Store weekly threat counts so the trend chart shows real historical variation
// instead of flat re-computed data from current feed items.

export interface TrendSnapshot {
  weekOf: string // ISO date string for the Monday of the week
  threats: number
  energyThreats: number
  kevCount: number
}

const TREND_STORAGE_KEY = 'capri-trend-history'

function getWeekMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export function saveTrendSnapshot(serverTrend: { week: string; threats: number; energyThreats: number; kevCount: number }[]): void {
  if (typeof window === 'undefined' || !serverTrend || serverTrend.length === 0) return

  const stored = getTrendHistory()
  const currentWeek = getWeekMonday()

  // The server's most recent week (last element) represents the current week's data
  const currentData = serverTrend[serverTrend.length - 1]
  if (!currentData) return

  // Update or insert the current week's snapshot
  const existingIdx = stored.findIndex(s => s.weekOf === currentWeek)
  const snapshot: TrendSnapshot = {
    weekOf: currentWeek,
    threats: currentData.threats,
    energyThreats: currentData.energyThreats,
    kevCount: currentData.kevCount,
  }

  if (existingIdx >= 0) {
    // Update with latest data (counts may change as more items arrive during the week)
    stored[existingIdx] = snapshot
  } else {
    stored.push(snapshot)
  }

  // Keep last 8 weeks
  const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 60 * 60 * 1000
  const trimmed = stored.filter(s => new Date(s.weekOf).getTime() > eightWeeksAgo)

  localStorage.setItem(TREND_STORAGE_KEY, JSON.stringify(trimmed))
}

export function getTrendHistory(): TrendSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(TREND_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Merge stored historical trend data with server's current-week data.
// Uses server trend as the base (correct labels/positions), but replaces
// past weeks with stored snapshots once we have enough history.
export function getMergedTrend(serverTrend: { week: string; threats: number; energyThreats: number; kevCount: number }[]): { week: string; threats: number; energyThreats: number; kevCount: number }[] {
  const stored = getTrendHistory()

  // Need at least 2 stored snapshots (spanning 2+ weeks) before merging is useful.
  // Until then, the server data is the best we have.
  if (stored.length < 2) return serverTrend

  // Server trend has 4 entries in chronological order (oldest first).
  // Map each server week position to a Monday key and check for a stored snapshot.
  return serverTrend.map((serverWeek, i) => {
    // Compute the Monday for this position: week 0 = 3 weeks ago, week 3 = this week
    const weeksAgo = serverTrend.length - 1 - i
    const d = new Date()
    d.setDate(d.getDate() - weeksAgo * 7)
    const weekMonday = getWeekMonday(d)

    const snapshot = stored.find(s => s.weekOf === weekMonday)
    if (snapshot) {
      // Use stored snapshot data but keep the server's week label for chart consistency
      return {
        week: serverWeek.week,
        threats: snapshot.threats,
        energyThreats: snapshot.energyThreats,
        kevCount: snapshot.kevCount,
      }
    }
    return serverWeek
  })
}

// Get last week's average score (7-14 days ago)
export function getLastWeekScore(): { score: number; label: string } | null {
  const history = getHistory()
  if (history.length === 0) return null

  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000

  // Filter entries from last week (7-14 days ago)
  const lastWeekEntries = history.filter(h => {
    const timestamp = new Date(h.timestamp).getTime()
    return timestamp >= twoWeeksAgo && timestamp < oneWeekAgo
  })

  if (lastWeekEntries.length === 0) {
    // No data from 7-14 days ago - return null (don't show misleading fallback)
    return null
  }

  // Calculate average score from last week
  const avgScore = lastWeekEntries.reduce((sum, h) => sum + h.score, 0) / lastWeekEntries.length

  // Determine label based on average
  let label = 'Normal'
  if (avgScore <= 2.0) label = 'Severe'
  else if (avgScore <= 3.0) label = 'Elevated'

  return { score: Math.round(avgScore * 10) / 10, label }
}
