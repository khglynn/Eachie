/**
 * Usage Queries
 *
 * Database operations for tracking anonymous and authenticated usage.
 * Costs are stored in cents for precision (no floating point issues).
 *
 * Created: December 2024
 *
 * @module server/queries/usage
 */

import { getDb } from '../db'

/** Free tier limit in cents ($12.00) */
export const FREE_TIER_LIMIT_CENTS = 1200

// ============================================================
// ANONYMOUS USAGE (Device-based tracking)
// ============================================================

interface AnonymousUsage {
  device_id: string
  total_cost_cents: number
  first_seen: Date
  last_seen: Date
}

/**
 * Get or create anonymous usage record for a device.
 * Returns current usage in cents and whether free tier is exhausted.
 */
export async function getAnonymousUsage(deviceId: string): Promise<{
  totalCostCents: number
  remaining: number
  isExhausted: boolean
}> {
  const sql = getDb()

  // Upsert: create if not exists, update last_seen if exists
  const result = await sql`
    INSERT INTO anonymous_usage (device_id, total_cost_cents, first_seen, last_seen)
    VALUES (${deviceId}, 0, NOW(), NOW())
    ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
    RETURNING total_cost_cents
  ` as AnonymousUsage[]

  const totalCostCents = result[0]?.total_cost_cents ?? 0
  const remaining = Math.max(0, FREE_TIER_LIMIT_CENTS - totalCostCents)

  return {
    totalCostCents,
    remaining,
    isExhausted: totalCostCents >= FREE_TIER_LIMIT_CENTS,
  }
}

/**
 * Add cost to anonymous usage after a research query.
 * Call this after research completes with the actual cost.
 *
 * @param deviceId - FingerprintJS visitor ID
 * @param costCents - Cost in cents (e.g., $0.05 = 5)
 * @returns Updated total and whether limit is now exhausted
 */
export async function addAnonymousUsage(
  deviceId: string,
  costCents: number
): Promise<{
  totalCostCents: number
  remaining: number
  isExhausted: boolean
}> {
  const sql = getDb()

  const result = await sql`
    INSERT INTO anonymous_usage (device_id, total_cost_cents, first_seen, last_seen)
    VALUES (${deviceId}, ${costCents}, NOW(), NOW())
    ON CONFLICT (device_id) DO UPDATE SET
      total_cost_cents = anonymous_usage.total_cost_cents + ${costCents},
      last_seen = NOW()
    RETURNING total_cost_cents
  ` as AnonymousUsage[]

  const totalCostCents = result[0]?.total_cost_cents ?? costCents
  const remaining = Math.max(0, FREE_TIER_LIMIT_CENTS - totalCostCents)

  return {
    totalCostCents,
    remaining,
    isExhausted: totalCostCents >= FREE_TIER_LIMIT_CENTS,
  }
}

// ============================================================
// AUTHENTICATED USER USAGE
// ============================================================

interface User {
  id: string
  email: string
  name: string
  credits_cents: number
  total_spent_cents: number
}

/**
 * Get user's credit balance.
 * Returns null if user doesn't exist.
 */
export async function getUserCredits(userId: string): Promise<{
  creditsCents: number
  totalSpentCents: number
} | null> {
  const sql = getDb()

  const result = await sql`
    SELECT credits_cents, total_spent_cents
    FROM users
    WHERE id = ${userId}
  ` as User[]

  if (result.length === 0) return null

  return {
    creditsCents: result[0].credits_cents,
    totalSpentCents: result[0].total_spent_cents,
  }
}

/**
 * Deduct credits from user after a research query.
 * Returns false if insufficient credits.
 *
 * @param userId - Clerk user ID
 * @param costCents - Cost in cents
 * @returns Success boolean and updated balance
 */
export async function deductUserCredits(
  userId: string,
  costCents: number
): Promise<{
  success: boolean
  creditsCents: number
  message?: string
}> {
  const sql = getDb()

  // Check current balance first
  const current = await getUserCredits(userId)
  if (!current) {
    return { success: false, creditsCents: 0, message: 'User not found' }
  }

  if (current.creditsCents < costCents) {
    return {
      success: false,
      creditsCents: current.creditsCents,
      message: 'Insufficient credits',
    }
  }

  // Deduct credits and add to total spent
  const result = await sql`
    UPDATE users
    SET
      credits_cents = credits_cents - ${costCents},
      total_spent_cents = total_spent_cents + ${costCents}
    WHERE id = ${userId} AND credits_cents >= ${costCents}
    RETURNING credits_cents
  ` as User[]

  if (result.length === 0) {
    // Race condition: balance changed between check and update
    return {
      success: false,
      creditsCents: current.creditsCents,
      message: 'Insufficient credits',
    }
  }

  return {
    success: true,
    creditsCents: result[0].credits_cents,
  }
}

/**
 * Add credits to user (from purchase or invite code).
 */
export async function addUserCredits(
  userId: string,
  creditsCents: number
): Promise<{ creditsCents: number }> {
  const sql = getDb()

  const result = await sql`
    UPDATE users
    SET credits_cents = credits_cents + ${creditsCents}
    WHERE id = ${userId}
    RETURNING credits_cents
  ` as User[]

  return { creditsCents: result[0]?.credits_cents ?? 0 }
}

// ============================================================
// USAGE CHECK (Pre-query validation)
// ============================================================

export type UsageCheckResult =
  | { allowed: true; source: 'byok' }
  | { allowed: true; source: 'anonymous'; remaining: number }
  | { allowed: true; source: 'credits'; remaining: number }
  | { allowed: false; reason: 'free_tier_exhausted' }
  | { allowed: false; reason: 'insufficient_credits'; balance: number }

/**
 * Check if a query is allowed based on auth state and usage.
 *
 * Priority:
 * 1. BYOK mode - always allowed (user's own key)
 * 2. Authenticated with credits - check balance
 * 3. Anonymous - check free tier
 *
 * @param params - Auth state and identifiers
 * @returns Whether query is allowed and why/why not
 */
export async function checkUsageAllowed(params: {
  byokMode: boolean
  userId?: string
  deviceId?: string
}): Promise<UsageCheckResult> {
  const { byokMode, userId, deviceId } = params

  // BYOK always allowed
  if (byokMode) {
    return { allowed: true, source: 'byok' }
  }

  // Authenticated user - check credits
  if (userId) {
    const credits = await getUserCredits(userId)
    if (!credits || credits.creditsCents <= 0) {
      return {
        allowed: false,
        reason: 'insufficient_credits',
        balance: credits?.creditsCents ?? 0,
      }
    }
    return { allowed: true, source: 'credits', remaining: credits.creditsCents }
  }

  // Anonymous - check free tier
  if (deviceId) {
    const usage = await getAnonymousUsage(deviceId)
    if (usage.isExhausted) {
      return { allowed: false, reason: 'free_tier_exhausted' }
    }
    return { allowed: true, source: 'anonymous', remaining: usage.remaining }
  }

  // No device ID - shouldn't happen, but deny
  return { allowed: false, reason: 'free_tier_exhausted' }
}
