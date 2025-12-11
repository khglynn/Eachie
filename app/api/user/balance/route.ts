/**
 * User Balance API
 *
 * Returns the current user's credit balance.
 * Requires authentication.
 *
 * Created: December 2024
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCredits } from '@/server/queries/users'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const credits_cents = await getCredits(userId)
    return NextResponse.json({ credits_cents })
  } catch (error) {
    console.error('[Balance API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get balance' },
      { status: 500 }
    )
  }
}
