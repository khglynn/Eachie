/**
 * User Settings API
 *
 * GET: Returns user settings (balance, auto top-up, account info)
 * PATCH: Updates auto top-up settings
 *
 * Requires authentication.
 *
 * Created: December 2024
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUser, getUserSettings, updateAutoTopupSettings } from '@/server/queries/users'
import type { UserSettings } from '@/types'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user from database (includes email, name from Clerk webhook sync)
    const user = await getUser(userId)

    if (!user) {
      // User exists in Clerk but not in our database yet (webhook pending)
      return NextResponse.json(
        { error: 'Account setup in progress', code: 'SETUP_PENDING' },
        { status: 202 }
      )
    }

    // Get extended settings
    const settings = await getUserSettings(userId)

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      )
    }

    const response: UserSettings = {
      email: user.email,
      name: user.name,
      createdAt: user.created_at.toISOString(),
      creditsCents: settings.creditsCents,
      totalSpentCents: settings.totalSpentCents,
      hasStripeCustomer: settings.hasStripeCustomer,
      hasPaymentMethod: settings.hasPaymentMethod,
      autoTopup: settings.autoTopup,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Settings API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate auto top-up settings
    const { autoTopup } = body

    if (autoTopup) {
      const { enabled, thresholdCents, amountCents } = autoTopup

      // Validate types
      if (enabled !== undefined && typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'autoTopup.enabled must be a boolean' },
          { status: 400 }
        )
      }

      if (thresholdCents !== undefined) {
        if (typeof thresholdCents !== 'number' || thresholdCents < 0) {
          return NextResponse.json(
            { error: 'autoTopup.thresholdCents must be a positive number' },
            { status: 400 }
          )
        }
      }

      if (amountCents !== undefined) {
        if (typeof amountCents !== 'number' || amountCents < 100) {
          return NextResponse.json(
            { error: 'autoTopup.amountCents must be at least 100 ($1)' },
            { status: 400 }
          )
        }
      }

      // Update settings
      await updateAutoTopupSettings(userId, {
        enabled,
        thresholdCents,
        amountCents,
      })
    }

    // Return updated settings
    const settings = await getUserSettings(userId)
    const user = await getUser(userId)

    if (!settings || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const response: UserSettings = {
      email: user.email,
      name: user.name,
      createdAt: user.created_at.toISOString(),
      creditsCents: settings.creditsCents,
      totalSpentCents: settings.totalSpentCents,
      hasStripeCustomer: settings.hasStripeCustomer,
      hasPaymentMethod: settings.hasPaymentMethod,
      autoTopup: settings.autoTopup,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Settings API] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
