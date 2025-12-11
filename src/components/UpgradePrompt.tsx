'use client'

/**
 * Upgrade Prompt / Buy Credits Modal
 *
 * Shows credit packages for purchase. Opens Stripe Checkout when selected.
 * Can be triggered by:
 * - Clicking the balance display
 * - Hitting the free tier limit
 * - Running out of credits
 *
 * Created: December 2024
 */

import { useState } from 'react'
import {
  CREDIT_PACKAGES,
  formatCents,
  getBonusPercent,
  type CreditPackage,
} from '@/lib/stripe'
import { ChalkX } from './ChalkIcons'

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'buy_more' | 'free_limit' | 'no_credits'
}

export function UpgradePrompt({ isOpen, onClose, reason = 'buy_more' }: UpgradePromptProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePurchase = async (pkg: CreditPackage) => {
    setLoading(pkg.id)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  const getTitle = () => {
    switch (reason) {
      case 'free_limit':
        return "You've used your free credits"
      case 'no_credits':
        return 'Out of credits'
      default:
        return 'Buy Credits'
    }
  }

  const getSubtitle = () => {
    switch (reason) {
      case 'free_limit':
        return 'Purchase credits to continue researching with Eachie.'
      case 'no_credits':
        return 'Add credits to your account to continue.'
      default:
        return 'Get bonus credits with every purchase.'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-paper-card border border-paper-accent/30 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-paper-muted hover:text-paper-text transition-colors"
        >
          <ChalkX size={20} />
        </button>

        {/* Header */}
        <h2 className="text-xl font-medium text-paper-text mb-2">
          {getTitle()}
        </h2>
        <p className="text-paper-muted text-sm mb-6">
          {getSubtitle()}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-paper-error/10 border border-paper-error/30 text-paper-error text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {/* Credit packages grid */}
        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => handlePurchase(pkg)}
              disabled={loading !== null}
              className={`
                relative p-4 rounded-lg border transition-all text-left
                ${pkg.popular
                  ? 'border-paper-accent bg-paper-surface/50'
                  : 'border-paper-divider bg-paper-bg/50 hover:border-paper-accent/50'}
                ${loading === pkg.id ? 'opacity-70' : ''}
                disabled:cursor-not-allowed
              `}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <span className="absolute -top-2 left-3 bg-paper-accent text-paper-bg text-xs px-2 py-0.5 rounded-full font-medium">
                  Popular
                </span>
              )}

              {/* Package name */}
              <div className="font-medium text-paper-text mb-1">
                {pkg.name}
              </div>

              {/* Price */}
              <div className="text-xl font-semibold text-paper-accent">
                {formatCents(pkg.price_cents)}
              </div>

              {/* Credits received */}
              <div className="text-sm text-paper-muted mt-1">
                {formatCents(pkg.credits_cents)} in credits
              </div>

              {/* Bonus badge */}
              <div className="text-xs text-green-400 mt-1">
                +{getBonusPercent(pkg)}% bonus
              </div>

              {/* Loading indicator */}
              {loading === pkg.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-paper-card/80 rounded-lg">
                  <div className="animate-spin h-5 w-5 border-2 border-paper-accent border-t-transparent rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-paper-muted text-xs text-center mt-4">
          Secure payment via Stripe. Credits never expire.
        </p>
      </div>
    </div>
  )
}
