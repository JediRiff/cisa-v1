// CAPRI Score History API
import { NextResponse } from 'next/server'
import { getScoreHistory } from '@/lib/redis'

export const revalidate = 60 // Cache for 1 minute

export async function GET() {
  try {
    const history = await getScoreHistory(720) // ~30 days of entries

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    })
  } catch (error) {
    console.error('History API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch score history',
      history: [],
    }, { status: 500 })
  }
}
