'use client'

/**
 * Auth Button
 *
 * Shows sign-in when logged out, user menu when logged in.
 * Uses Clerk's pre-built components with paper theme.
 *
 * Created: December 2024
 */

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export function AuthButton() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-paper-muted hover:text-paper-accent transition-colors">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-6 h-6',
            },
          }}
        />
      </SignedIn>
    </>
  )
}
