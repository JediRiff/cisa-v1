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
