'use client'

/**
 * App Providers
 *
 * Wraps app with ClerkProvider when auth is configured.
 * Falls back to rendering children directly if Clerk keys aren't set.
 *
 * Created: December 2024
 */

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

interface ProvidersProps {
  children: React.ReactNode
  clerkEnabled: boolean
}

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

export function Providers({ children, clerkEnabled }: ProvidersProps) {
  // If Clerk isn't configured, just render children directly
  if (!clerkEnabled) {
    return <>{children}</>
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  )
}
