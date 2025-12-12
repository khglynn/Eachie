/**
 * Billing Portal API
 *
 * Creates a Stripe Billing Portal session for the user to manage
 * their payment methods and billing info.
 *
 * Requires authentication and a Stripe customer ID.
 *
 * Created: December 2024
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUser } from '@/server/queries/users'
import { getStripe } from '@/lib/stripe'

export async function POST() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No payment method on file', code: 'NO_CUSTOMER' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Billing Portal API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
