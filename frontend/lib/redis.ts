// Upstash Redis client for server-side score history
import { Redis } from '@upstash/redis'

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

export interface ScoreSnapshot {
  timestamp: string
  score: number
  label: string
}

const HISTORY_KEY = 'capri:score-history'
const MAX_ENTRIES = 1000 // Keep ~30 days of hourly data

// Save a score snapshot (called when fresh data is fetched)
export async function saveScoreToHistory(score: number, label: string): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('Redis not configured - skipping history save')
    return
  }

  try {
    const snapshot: ScoreSnapshot = {
      timestamp: new Date().toISOString(),
      score,
      label,
    }

    // Push to the list and trim to keep only recent entries
    await redis.lpush(HISTORY_KEY, JSON.stringify(snapshot))
    await redis.ltrim(HISTORY_KEY, 0, MAX_ENTRIES - 1)
  } catch (error) {
    console.error('Failed to save score to history:', error)
  }
}

// Get score history (most recent first, then reversed for chart display)
export async function getScoreHistory(limit: number = 720): Promise<ScoreSnapshot[]> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('Redis not configured - returning empty history')
    return []
  }

  try {
    const data = await redis.lrange(HISTORY_KEY, 0, limit - 1)
    const history = data
      .map((item: string | ScoreSnapshot) => {
        if (typeof item === 'string') {
          return JSON.parse(item) as ScoreSnapshot
        }
        return item as ScoreSnapshot
      })
      .reverse() // Reverse so oldest is first (for chart display)

    return history
  } catch (error) {
    console.error('Failed to get score history:', error)
    return []
  }
}

// Get the most recent score
export async function getLatestScore(): Promise<ScoreSnapshot | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return null
  }

  try {
    const data = await redis.lindex(HISTORY_KEY, 0)
    if (!data) return null

    if (typeof data === 'string') {
      return JSON.parse(data) as ScoreSnapshot
    }
    return data as ScoreSnapshot
  } catch (error) {
    console.error('Failed to get latest score:', error)
    return null
  }
}

// Check if we should save a new entry (avoid duplicates within 30 minutes)
export async function shouldSaveNewEntry(): Promise<boolean> {
  const latest = await getLatestScore()
  if (!latest) return true

  const latestTime = new Date(latest.timestamp).getTime()
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000

  return latestTime < thirtyMinutesAgo
}
