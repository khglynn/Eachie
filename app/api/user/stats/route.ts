/**
 * User Stats API
 *
 * GET: Returns per-user query cost statistics
 *
 * Requires authentication. Only shows stats after 10+ queries.
 *
 * Created: December 2024
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserQueryStats } from '@/server/queries/analytics'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getUserQueryStats(userId)

    if (!stats) {
      // Not enough data yet (< 10 queries)
      return NextResponse.json({
        error: 'Not enough data',
        message: 'Your stats will appear after 10 queries',
        code: 'INSUFFICIENT_DATA',
        minQueries: 10,
      }, { status: 202 })
    }

    return NextResponse.json({
      avgQueryCostCents: stats.avgQueryCostCents,
      totalQueries: stats.totalQueries,
      totalSpentCents: stats.totalSpentCents,
      // Derived values for UI
      avgQueriesPerDollar: stats.avgQueryCostCents > 0
        ? Math.round((100 / stats.avgQueryCostCents) * 100) / 100
        : 0,
    })
  } catch (error) {
    console.error('[User Stats API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get user stats' },
      { status: 500 }
    )
  }
}
