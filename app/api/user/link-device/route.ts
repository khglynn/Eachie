/**
 * Link Device to User API
 *
 * Called after sign-up to associate the user's device_id with their account.
 * This enables:
 * 1. Migrating anonymous sessions to the user
 * 2. Retroactively querying all user activity (pre + post signup)
 *
 * Created: December 2024
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { linkDeviceToUser, getUser } from '@/server/queries/users'

export async function POST(request: NextRequest) {
  // Require authentication
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { deviceId } = await request.json()

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }

    // Check if user already has a device linked
    const user = await getUser(userId)
    if (user?.device_id) {
      // Already linked - don't overwrite (could be different device)
      return NextResponse.json({
        success: true,
        linked: false,
        reason: 'already_linked',
      })
    }

    // Link the device
    await linkDeviceToUser(userId, deviceId)

    return NextResponse.json({
      success: true,
      linked: true,
    })
  } catch (error) {
    console.error('[Link Device] Error:', error)
    return NextResponse.json(
      { error: 'Failed to link device' },
      { status: 500 }
    )
  }
}
