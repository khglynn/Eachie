'use client'

/**
 * App Providers
 *
 * Wraps app with ClerkProvider and PostHogProvider.
 * Syncs Clerk user to PostHog for user identification.
 *
 * Created: December 2024
 */

import { ClerkProvider, useUser } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

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
    colorPrimary: '#91AAF2',
    colorBackground: '#021373',
    colorText: '#F2F2F2',
    colorTextSecondary: '#8BA3E6',
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

export function Providers({ children, clerkEnabled }: ProvidersProps) {
  // Wrap everything in PostHogProvider
  const content = (
    <PostHogProvider client={posthog}>
      {clerkEnabled && <PostHogUserIdentifier />}
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
