/**
 * Stripe Webhook Handler - Auto Top-Up Flow
 *
 * Processes Stripe events for the auto top-up billing system:
 * - setup_intent.succeeded: User saved their card → store payment method ID
 * - payment_intent.succeeded: Charge went through → add credits
 * - payment_intent.payment_failed: Charge failed → log for debugging
 *
 * This is NOT a checkout flow. Users save their card once, then we
 * auto-charge when their balance drops below threshold.
 *
 * Created: December 2024
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe, setDefaultPaymentMethod } from '@/lib/stripe'
import { addCredits, setPaymentMethod, updateAutoTopupSettings } from '@/server/queries/users'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    // ============================================================
    // SETUP INTENT: User saved their card for the first time
    // ============================================================
    case 'setup_intent.succeeded': {
      const setupIntent = event.data.object as Stripe.SetupIntent

      const customerId = setupIntent.customer as string
      const paymentMethodId = setupIntent.payment_method as string

      if (!customerId || !paymentMethodId) {
        console.error('[Stripe Webhook] SetupIntent missing data:', {
          customerId,
          paymentMethodId,
        })
        break
      }

      try {
        // Set as default payment method on Stripe customer
        await setDefaultPaymentMethod(customerId, paymentMethodId)

        // Get user ID from customer metadata
        const stripe = getStripe()
        const customer = await stripe.customers.retrieve(customerId)

        if (customer.deleted) {
          console.error('[Stripe Webhook] Customer was deleted:', customerId)
          break
        }

        const userId = customer.metadata?.clerkUserId
        if (!userId) {
          console.error('[Stripe Webhook] Customer missing clerkUserId:', customerId)
          break
        }

        // Save payment method to our database
        await setPaymentMethod(userId, paymentMethodId)

        // Enable auto top-up now that they have a payment method
        await updateAutoTopupSettings(userId, { enabled: true })

        console.log(
          `[Stripe Webhook] Saved payment method ${paymentMethodId} for user ${userId}`
        )
      } catch (error) {
        console.error('[Stripe Webhook] Failed to save payment method:', error)
        return NextResponse.json(
          { error: 'Failed to save payment method' },
          { status: 500 }
        )
      }

      break
    }

    // ============================================================
    // PAYMENT INTENT SUCCEEDED: Charge went through
    // ============================================================
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      // Extract metadata we set when creating the PaymentIntent
      const userId = paymentIntent.metadata?.clerkUserId
      const creditsCents = parseInt(paymentIntent.metadata?.creditsCents || '0', 10)
      const type = paymentIntent.metadata?.type // 'auto_topup' or 'initial_topup'

      if (!userId || !creditsCents) {
        // This might be a payment not related to credits (e.g., from another product)
        console.log('[Stripe Webhook] PaymentIntent without credit metadata:', {
          id: paymentIntent.id,
          metadata: paymentIntent.metadata,
        })
        break
      }

      // Add credits to user account
      try {
        const newBalance = await addCredits(userId, creditsCents)
        console.log(
          `[Stripe Webhook] ${type}: Added ${creditsCents} cents to user ${userId}. New balance: ${newBalance}`
        )
      } catch (error) {
        console.error('[Stripe Webhook] Failed to add credits:', error)
        return NextResponse.json(
          { error: 'Failed to add credits' },
          { status: 500 }
        )
      }

      break
    }

    // ============================================================
    // PAYMENT INTENT FAILED: Charge was declined
    // ============================================================
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      const userId = paymentIntent.metadata?.clerkUserId
      const type = paymentIntent.metadata?.type
      const errorMessage = paymentIntent.last_payment_error?.message

      console.warn('[Stripe Webhook] Payment failed:', {
        id: paymentIntent.id,
        userId,
        type,
        error: errorMessage,
        code: paymentIntent.last_payment_error?.code,
      })

      // TODO: If this is an auto_topup failure, we should:
      // 1. Notify the user their card was declined
      // 2. Maybe disable auto_topup until they update their card
      // For now, just log it

      break
    }

    default:
      // Log unexpected events for debugging
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
