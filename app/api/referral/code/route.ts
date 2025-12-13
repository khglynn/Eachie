/**
 * Referral Code API
 *
 * GET: Get or create the user's referral code
 * POST: Regenerate code with new emojis (old code stops working)
 *
 * Requires authentication.
 *
 * Created: December 2024
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUser } from '@/server/queries/users'
import {
  getOrCreateReferralCode,
  regenerateReferralCode,
  getReferralStats,
} from '@/server/queries/referrals'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user for their name (to generate initials)
    const user = await getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Account setup in progress', code: 'SETUP_PENDING' },
        { status: 202 }
      )
    }

    // Get or create their referral code
    const code = await getOrCreateReferralCode(userId, user.name)

    // Get full stats
    const stats = await getReferralStats(userId)

    return NextResponse.json({
      code,
      usesRemaining: stats.usesRemaining,
      totalUses: stats.totalUses,
      shareUrl: stats.shareUrl,
    })
  } catch (error) {
    console.error('[Referral Code API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get referral code' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Only allow regenerate action
    if (!body.regenerate) {
      return NextResponse.json(
        { error: 'Invalid action. Use { regenerate: true } to get a new code.' },
        { status: 400 }
      )
    }

    // Get user for their name
    const user = await getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Account setup in progress', code: 'SETUP_PENDING' },
        { status: 202 }
      )
    }

    // Regenerate with new emojis
    const code = await regenerateReferralCode(userId, user.name)

    // Get updated stats
    const stats = await getReferralStats(userId)

    console.log(`[Referral Code API] User ${userId} regenerated code to ${code}`)

    return NextResponse.json({
      code,
      usesRemaining: stats.usesRemaining,
      totalUses: stats.totalUses,
      shareUrl: stats.shareUrl,
    })
  } catch (error) {
    console.error('[Referral Code API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate referral code' },
      { status: 500 }
    )
  }
}
