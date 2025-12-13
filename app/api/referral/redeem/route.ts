/**
 * Referral Redemption API
 *
 * POST: Redeem a friend code during signup
 *       Both parties get $8 (800 cents)
 *
 * Requires authentication. Called by ReferralRedeemer component
 * after user signs up with a ?ref= URL parameter.
 *
 * Created: December 2024
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUser } from '@/server/queries/users'
import { redeemReferralCode, hasRedeemedReferralCode } from '@/server/queries/referrals'

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid code' },
        { status: 400 }
      )
    }

    // Validate code format
    if (!code.startsWith('EACHIE-WITH-ME-')) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      )
    }

    // Check if user exists in our database
    const user = await getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Account setup in progress', code: 'SETUP_PENDING' },
        { status: 202 }
      )
    }

    // Quick check if already redeemed (for better UX)
    const alreadyRedeemed = await hasRedeemedReferralCode(userId)
    if (alreadyRedeemed) {
      return NextResponse.json(
        { error: "You've already used a friend code" },
        { status: 400 }
      )
    }

    // Attempt redemption
    const result = await redeemReferralCode(code, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    console.log(
      `[Referral Redeem API] User ${userId} redeemed code, ` +
      `both parties credited $${(result.creditsAdded ?? 0) / 100}`
    )

    return NextResponse.json({
      success: true,
      creditsAdded: result.creditsAdded,
    })
  } catch (error) {
    console.error('[Referral Redeem API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to redeem code' },
      { status: 500 }
    )
  }
}
