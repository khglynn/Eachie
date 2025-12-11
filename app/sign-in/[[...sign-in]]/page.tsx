/**
 * Sign In Page
 *
 * Uses Clerk's pre-built SignIn component.
 * Styled to match Eachie's paper theme.
 */

import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-paper-bg flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Link href="/" className="text-paper-accent hover:underline text-sm">
          &larr; Back to Eachie
        </Link>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-paper-card border border-paper-accent/20',
          },
        }}
      />
    </main>
  )
}
