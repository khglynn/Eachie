/**
 * Stripe Payment Setup API
 *
 * Handles payment method setup for the auto top-up flow.
 *
 * Two modes:
 * 1. "setup" - First-time: Creates SetupIntent to save a card
 * 2. "charge" - Has saved card: Creates PaymentIntent to charge
 *
 * This is NOT a traditional checkout - we save the card once,
 * then auto-charge when balance drops below threshold.
 *
 * Created: December 2024
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  isStripeConfigured,
  createCustomer,
  createSetupIntent,
  chargeInitialTopup,
  AUTO_TOPUP_DEFAULTS,
  MIN_TOPUP_CENTS,
  MAX_TOPUP_CENTS,
} from '@/lib/stripe'
import { getUser, setStripeCustomerId } from '@/server/queries/users'

export async function POST(request: NextRequest) {
  // Check Stripe configuration
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Payments not configured' },
      { status: 503 }
    )
  }

  // Require authentication
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { mode, amountCents } = body

    // Get user from database
    const user = await getUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await createCustomer({
        email: user.email,
        name: user.name ?? undefined,
        clerkUserId: userId,
      })
      customerId = customer.id

      // Save to database
      await setStripeCustomerId(userId, customerId)
    }

    // Mode 1: Setup - Create SetupIntent to save card
    if (mode === 'setup' || !user.stripe_payment_method_id) {
      const setupIntent = await createSetupIntent(customerId)

      return NextResponse.json({
        mode: 'setup',
        clientSecret: setupIntent.client_secret,
        customerId,
      })
    }

    // Mode 2: Charge - User has saved card, charge immediately
    if (mode === 'charge') {
      // Validate amount
      const amount = amountCents || AUTO_TOPUP_DEFAULTS.amountCents

      if (amount < MIN_TOPUP_CENTS) {
        return NextResponse.json(
          { error: `Minimum top-up is $${MIN_TOPUP_CENTS / 100}` },
          { status: 400 }
        )
      }

      if (amount > MAX_TOPUP_CENTS) {
        return NextResponse.json(
          { error: `Maximum top-up is $${MAX_TOPUP_CENTS / 100}` },
          { status: 400 }
        )
      }

      // Charge saved payment method
      const paymentIntent = await chargeInitialTopup({
        customerId,
        paymentMethodId: user.stripe_payment_method_id,
        amountCents: amount,
        clerkUserId: userId,
      })

      return NextResponse.json({
        mode: 'charge',
        status: paymentIntent.status,
        amountCents: amount,
      })
    }

    // Default: Return setup mode if we don't know what to do
    const setupIntent = await createSetupIntent(customerId)
    return NextResponse.json({
      mode: 'setup',
      clientSecret: setupIntent.client_secret,
      customerId,
    })
  } catch (error) {
    console.error('[Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment request' },
      { status: 500 }
    )
  }
}
