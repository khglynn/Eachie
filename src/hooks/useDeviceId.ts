/**
 * useDeviceId Hook
 *
 * React hook for device fingerprinting. Provides the device ID
 * for anonymous usage tracking.
 *
 * Features:
 * - Lazy loads fingerprint on first access
 * - Caches result in state
 * - Falls back to localStorage UUID if fingerprinting fails
 * - Provides confidence score for abuse detection
 *
 * @module hooks/useDeviceId
 * Created: December 2024
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getDeviceId,
  getFingerprintConfidence,
  isBot,
} from '@/lib/fingerprint'

interface DeviceIdState {
  /** The device ID (fingerprint or fallback UUID) */
  deviceId: string | null
  /** Fingerprint confidence score (0-1), null if using fallback */
  confidence: number | null
  /** Whether this device appears to be a bot */
  isBot: boolean | null
  /** Loading state */
  isLoading: boolean
  /** Error message if fingerprinting failed */
  error: string | null
}

/**
 * Hook to get device fingerprint for anonymous usage tracking.
 *
 * @example
 * const { deviceId, confidence, isLoading } = useDeviceId()
 *
 * // Use in API calls
 * fetch('/api/research/stream', {
 *   headers: {
 *     'X-Device-ID': deviceId ?? '',
 *   },
 * })
 */
export function useDeviceId() {
  const [state, setState] = useState<DeviceIdState>({
    deviceId: null,
    confidence: null,
    isBot: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    async function loadDeviceId() {
      try {
        const [id, conf, bot] = await Promise.all([
          getDeviceId(),
          getFingerprintConfidence(),
          isBot(),
        ])

        if (mounted) {
          setState({
            deviceId: id,
            confidence: conf,
            isBot: bot,
            isLoading: false,
            error: null,
          })
        }
      } catch (err) {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to get device ID',
          }))
        }
      }
    }

    loadDeviceId()

    return () => {
      mounted = false
    }
  }, [])

  /**
   * Refresh the device ID (clears cache and re-fetches)
   * Useful for testing or if user clears browser data
   */
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Clear the cache first
      const { clearFingerprintCache } = await import('@/lib/fingerprint')
      clearFingerprintCache()

      const [id, conf, bot] = await Promise.all([
        getDeviceId(),
        getFingerprintConfidence(),
        isBot(),
      ])

      setState({
        deviceId: id,
        confidence: conf,
        isBot: bot,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to refresh device ID',
      }))
    }
  }, [])

  return {
    ...state,
    refresh,
    /**
     * Whether the fingerprint is trustworthy enough for usage tracking.
     * Returns false if confidence is below 0.5 or if bot detected.
     */
    isTrustworthy:
      state.confidence !== null &&
      state.confidence >= 0.5 &&
      state.isBot === false,
  }
}

/**
 * Get device ID header for fetch requests
 *
 * @example
 * const headers = await getDeviceIdHeaders()
 * fetch('/api/research/stream', { headers })
 */
export async function getDeviceIdHeaders(): Promise<HeadersInit> {
  const deviceId = await getDeviceId()
  const confidence = await getFingerprintConfidence()

  return {
    'X-Device-ID': deviceId,
    ...(confidence !== null && {
      'X-Device-Confidence': confidence.toString(),
    }),
  }
}
