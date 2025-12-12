/**
 * Global Stats API
 *
 * GET: Returns global query cost statistics (trimmed mean, cached 6 hours)
 *
 * Public endpoint - no auth required.
 * Use for dynamic pricing messaging like "$8 is on average X queries"
 *
 * Created: December 2024
 */

import { NextResponse } from 'next/server'
import { getCachedGlobalStats } from '@/server/queries/analytics'

export async function GET() {
  try {
    const stats = await getCachedGlobalStats()

    if (!stats) {
      // Not enough data yet (< 20 queries in last 90 days)
      return NextResponse.json({
        error: 'Not enough data',
        message: 'Need at least 20 queries to calculate average cost',
        code: 'INSUFFICIENT_DATA',
      }, { status: 202 })
    }

    return NextResponse.json({
      avgQueryCostCents: stats.trimmedMeanCents,
      queriesPerDollar: stats.queriesPerDollar,
      queriesFor8Dollars: stats.queriesFor8Dollars,
      calculatedAt: stats.calculatedAt,
      sampleSize: stats.queriesUsed,
      // Include raw data for transparency
      _meta: {
        totalQueriesAnalyzed: stats.totalQueries,
        trimmedPercent: 15,
        cacheRefreshHours: 6,
      },
    })
  } catch (error) {
    console.error('[Stats API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
