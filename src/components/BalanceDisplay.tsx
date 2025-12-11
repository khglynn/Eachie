'use client'

/**
 * Balance Display
 *
 * Shows user's credit balance. Only visible when signed in with credits.
 * Clicking opens the upgrade modal to buy more credits.
 *
 * Created: December 2024
 */

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { formatCents } from '@/lib/stripe'

interface BalanceDisplayProps {
  onBuyCredits: () => void
}

export function BalanceDisplay({ onBuyCredits }: BalanceDisplayProps) {
  const { user, isLoaded } = useUser()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false)
      return
    }

    // Fetch balance from API
    fetch('/api/user/balance')
      .then((res) => res.json())
      .then((data) => {
        setBalance(data.credits_cents ?? 0)
      })
      .catch((err) => {
        console.warn('[BalanceDisplay] Failed to fetch balance:', err)
        setBalance(0)
      })
      .finally(() => setLoading(false))
  }, [user, isLoaded])

  // Don't show anything if not signed in
  if (!isLoaded || !user) {
    return null
  }

  // Show loading state briefly
  if (loading) {
    return (
      <span className="text-paper-muted text-sm animate-pulse">
        Loading...
      </span>
    )
  }

  // Don't show if balance is null (error state)
  if (balance === null) {
    return null
  }

  return (
    <button
      onClick={onBuyCredits}
      className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper-accent transition-colors"
      title="Click to buy more credits"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
      <span>{formatCents(balance)}</span>
    </button>
  )
}
