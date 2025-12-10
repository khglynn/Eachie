/**
 * Device Fingerprinting
 *
 * Uses FingerprintJS to generate a stable device identifier for anonymous
 * usage tracking. Falls back to localStorage UUID if fingerprinting fails.
 *
 * Free tier: 20,000 lookups/month
 * If exceeded: ~$99/mo for 100k lookups
 *
 * @module lib/fingerprint
 * Created: December 2024
 */

import FingerprintJS, { type GetResult } from '@fingerprintjs/fingerprintjs'

// Singleton promise for the FingerprintJS agent
let agentPromise: ReturnType<typeof FingerprintJS.load> | null = null

// Cache the result to avoid repeated calls
let cachedResult: GetResult | null = null

/**
 * Get the FingerprintJS agent (lazy loaded singleton)
 */
async function getAgent() {
  if (!agentPromise) {
    agentPromise = FingerprintJS.load()
  }
  return agentPromise
}

/**
 * Generate a random UUID for fallback
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Storage key for fallback device ID
 */
const FALLBACK_STORAGE_KEY = 'eachie_device_id'

/**
 * Get or create a fallback device ID from localStorage
 */
function getFallbackDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-side'
  }

  let deviceId = localStorage.getItem(FALLBACK_STORAGE_KEY)
  if (!deviceId) {
    deviceId = `fallback_${generateUUID()}`
    localStorage.setItem(FALLBACK_STORAGE_KEY, deviceId)
  }
  return deviceId
}

/**
 * Get the device fingerprint result
 *
 * Returns the full FingerprintJS result including:
 * - visitorId: Stable device identifier
 * - confidence: How confident FingerprintJS is (0-1)
 * - components: Raw fingerprint components
 *
 * @returns FingerprintJS result or null if failed
 */
export async function getFingerprint(): Promise<GetResult | null> {
  // Return cached result if available
  if (cachedResult) {
    return cachedResult
  }

  // Can't run on server
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const agent = await getAgent()
    cachedResult = await agent.get()
    return cachedResult
  } catch (error) {
    console.error('[Fingerprint] Error getting fingerprint:', error)
    return null
  }
}

/**
 * Get the device ID (visitor ID from fingerprint, or fallback UUID)
 *
 * This is the primary function to use for device identification.
 * Always returns a string - uses fallback if fingerprinting fails.
 *
 * @returns Device ID string
 */
export async function getDeviceId(): Promise<string> {
  const result = await getFingerprint()
  if (result?.visitorId) {
    return result.visitorId
  }
  return getFallbackDeviceId()
}

/**
 * Get the fingerprint confidence score
 *
 * @returns Confidence score 0-1, or null if fingerprinting failed
 */
export async function getFingerprintConfidence(): Promise<number | null> {
  const result = await getFingerprint()
  return result?.confidence?.score ?? null
}

/**
 * Check if this appears to be a bot
 *
 * Note: Full bot detection requires FingerprintJS Pro.
 * This basic check looks at confidence score as a proxy.
 * Returns true if likely bot, false if likely human, null if unknown.
 */
export async function isBot(): Promise<boolean | null> {
  const result = await getFingerprint()
  if (!result) {
    return null
  }

  // Very low confidence scores often indicate automation
  // Real browsers typically have confidence > 0.5
  const confidence = result.confidence?.score
  if (confidence !== undefined && confidence < 0.3) {
    return true // Likely automated
  }

  return false
}

/**
 * Clear the cached fingerprint result
 *
 * Useful for testing or when you need to re-fetch
 */
export function clearFingerprintCache(): void {
  cachedResult = null
}
