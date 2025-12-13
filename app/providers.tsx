'use client'

/**
 * App Providers
 *
 * Wraps app with ClerkProvider and PostHogProvider.
 * Syncs Clerk user to PostHog for user identification.
 * Links device_id to user account for analytics continuity.
 * Redeems friend codes from ?ref= URL parameter.
 *
 * Created: December 2024
 */

import { ClerkProvider, useUser } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDeviceId } from '@/hooks/useDeviceId'
import { MESSAGES } from '@/config/messages'

interface ProvidersProps {
  children: React.ReactNode
  clerkEnabled: boolean
}

// Note: PostHog is initialized in sentry.client.config.ts (before Sentry)
// so the Sentry integration can link errors to session recordings.
// The PostHogProvider below just wraps the existing instance.

/**
 * Clerk theme matching Eachie's paper color palette.
 */
const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#9F7AEA',      // paper-accent (muted violet)
    colorBackground: '#1A0533',   // paper-card (rich purple)
    colorText: '#F2F2F2',         // paper-text (cream)
    colorTextSecondary: '#A78BFA', // paper-muted (soft purple)
  },
}

/**
 * Syncs Clerk user to PostHog for user identification.
 */
function PostHogUserIdentifier() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    if (user) {
      // Identify user in PostHog when logged in
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        created_at: user.createdAt?.toISOString(),
      })
    } else {
      // Reset PostHog when user logs out
      posthog.reset()
    }
  }, [user, isLoaded])

  return null
}

/**
 * Links device_id to user account after sign-up.
 * This enables retroactive querying of pre-signup activity.
 * Only runs once per session to avoid unnecessary API calls.
 */
function DeviceLinker() {
  const { user, isLoaded } = useUser()
  const deviceId = useDeviceId()
  const hasLinked = useRef(false)

  useEffect(() => {
    // Only run when user is loaded, logged in, and we have a device ID
    if (!isLoaded || !user || !deviceId || hasLinked.current) return

    // Mark as linked to prevent duplicate calls
    hasLinked.current = true

    // Call API to link device to user
    fetch('/api/user/link-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    }).catch((err) => {
      console.warn('[DeviceLinker] Failed to link device:', err)
      // Reset so it can retry next time
      hasLinked.current = false
    })
  }, [user, isLoaded, deviceId])

  return null
}

/**
 * Redeems friend referral codes from URL parameter.
 * Checks for ?ref=EACHIE-WITH-ME-XX... and calls the redeem API.
 * Both parties get $8 credit.
 * Shows a celebration banner on success.
 */
function ReferralRedeemer({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const hasAttempted = useRef(false)

  useEffect(() => {
    // Only run once per session
    if (hasAttempted.current) return

    // Wait for user to be loaded and logged in
    if (!isLoaded || !user) return

    // Check for referral code in URL
    const refCode = searchParams.get('ref')
    if (!refCode || !refCode.startsWith('EACHIE-WITH-ME-')) return

    // Check sessionStorage to avoid duplicate attempts
    const attemptedKey = `referral_attempted_${user.id}`
    if (sessionStorage.getItem(attemptedKey)) return

    hasAttempted.current = true
    sessionStorage.setItem(attemptedKey, 'true')

    // Attempt redemption
    fetch('/api/referral/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: refCode }),
    })
      .then(async (res) => {
        const data = await res.json()

        if (res.ok && data.success) {
          // Store success for banner display
          sessionStorage.setItem('referral_success', 'true')
          onSuccess(MESSAGES.referralSuccess.title)

          // Track in PostHog
          posthog.capture('referral_redeemed', {
            credits_added: data.creditsAdded,
          })

          // Clean URL by removing ref param
          const url = new URL(window.location.href)
          url.searchParams.delete('ref')
          window.history.replaceState({}, '', url.toString())
        } else if (data.error) {
          console.log('[ReferralRedeemer] Redemption failed:', data.error)
        }
      })
      .catch((err) => {
        console.warn('[ReferralRedeemer] API error:', err)
      })
  }, [user, isLoaded, searchParams, onSuccess])

  return null
}

/**
 * Celebration banner shown after successful referral redemption.
 */
function ReferralBanner({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  if (!message) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 px-4 flex items-center justify-center gap-3 shadow-lg">
      <span className="text-lg font-medium">
        {message} Your friend got $8 too!
      </span>
      <button
        onClick={onDismiss}
        className="ml-2 text-white/80 hover:text-white text-xl"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}

export function Providers({ children, clerkEnabled }: ProvidersProps) {
  const [referralMessage, setReferralMessage] = useState<string | null>(null)

  const handleReferralSuccess = useCallback((msg: string) => {
    setReferralMessage(msg)
  }, [])

  const handleDismissReferral = useCallback(() => {
    setReferralMessage(null)
    sessionStorage.removeItem('referral_success')
  }, [])

  // Wrap everything in PostHogProvider
  const content = (
    <PostHogProvider client={posthog}>
      {clerkEnabled && <PostHogUserIdentifier />}
      {clerkEnabled && <DeviceLinker />}
      {clerkEnabled && (
        <Suspense fallback={null}>
          <ReferralRedeemer onSuccess={handleReferralSuccess} />
        </Suspense>
      )}
      <ReferralBanner message={referralMessage} onDismiss={handleDismissReferral} />
      {children}
    </PostHogProvider>
  )

  // If Clerk isn't configured, just render with PostHog
  if (!clerkEnabled) {
    return content
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      {content}
    </ClerkProvider>
  )
}
