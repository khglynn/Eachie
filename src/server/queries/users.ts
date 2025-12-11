/**
 * User Queries
 *
 * Database operations for user management.
 * Users are created via Clerk webhook when they sign up.
 *
 * Created: December 2024
 *
 * @module server/queries/users
 */

import { getDb } from '../db'

interface User {
  id: string
  email: string
  name: string
  credits_cents: number
  total_spent_cents: number
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  auto_topup_enabled: boolean
  auto_topup_threshold_cents: number
  auto_topup_amount_cents: number
  redeemed_code: string | null
  device_id: string | null
  created_at: Date
}

export type { User }

/**
 * Create a new user from Clerk webhook data.
 * Called when user.created webhook fires.
 *
 * @param params - User data from Clerk
 * @returns Created user
 */
export async function createUser(params: {
  id: string
  email: string
  name?: string
}): Promise<User> {
  const sql = getDb()

  const result = await sql`
    INSERT INTO users (id, email, name)
    VALUES (${params.id}, ${params.email}, ${params.name ?? null})
    ON CONFLICT (id) DO UPDATE SET
      email = ${params.email},
      name = COALESCE(${params.name ?? null}, users.name)
    RETURNING *
  ` as User[]

  return result[0]
}

/**
 * Get user by ID.
 */
export async function getUser(userId: string): Promise<User | null> {
  const sql = getDb()

  const result = await sql`
    SELECT * FROM users WHERE id = ${userId}
  ` as User[]

  return result[0] ?? null
}

/**
 * Get user by email.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = getDb()

  const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  ` as User[]

  return result[0] ?? null
}

/**
 * Update user's Stripe customer ID.
 * Called after first Stripe checkout.
 */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  const sql = getDb()

  await sql`
    UPDATE users
    SET stripe_customer_id = ${stripeCustomerId}
    WHERE id = ${userId}
  `
}

/**
 * Link anonymous device usage to a user account.
 * Call this when an anonymous user signs up to migrate their free tier usage.
 */
export async function linkDeviceToUser(
  userId: string,
  deviceId: string
): Promise<void> {
  const sql = getDb()

  // Store device_id on user for reference
  await sql`
    UPDATE users
    SET device_id = ${deviceId}
    WHERE id = ${userId}
  `

  // Optionally: migrate any anonymous sessions to the user
  await sql`
    UPDATE sessions
    SET user_id = ${userId}
    WHERE device_id = ${deviceId} AND user_id IS NULL
  `
}

/**
 * Delete user and their data.
 * For GDPR deletion requests.
 */
export async function deleteUser(userId: string): Promise<void> {
  const sql = getDb()

  // CASCADE will handle sessions and conversation_rounds
  await sql`DELETE FROM users WHERE id = ${userId}`
}

// ============================================================
// CREDIT MANAGEMENT
// ============================================================

/**
 * Add credits to a user's account.
 * Called by Stripe webhook after successful payment.
 *
 * @param userId - Clerk user ID
 * @param creditsCents - Amount to add in cents
 * @returns Updated credit balance
 */
export async function addCredits(
  userId: string,
  creditsCents: number
): Promise<number> {
  const sql = getDb()

  const result = await sql`
    UPDATE users
    SET credits_cents = credits_cents + ${creditsCents}
    WHERE id = ${userId}
    RETURNING credits_cents
  ` as { credits_cents: number }[]

  return result[0]?.credits_cents ?? 0
}

/**
 * Deduct credits from a user's account.
 * Called after each research query for paid users.
 *
 * @param userId - Clerk user ID
 * @param costCents - Amount to deduct in cents
 * @returns Updated credit balance, or null if insufficient funds
 */
export async function deductCredits(
  userId: string,
  costCents: number
): Promise<number | null> {
  const sql = getDb()

  // Only deduct if user has enough credits
  const result = await sql`
    UPDATE users
    SET
      credits_cents = credits_cents - ${costCents},
      total_spent_cents = total_spent_cents + ${costCents}
    WHERE id = ${userId}
      AND credits_cents >= ${costCents}
    RETURNING credits_cents
  ` as { credits_cents: number }[]

  // If no rows updated, user didn't have enough credits
  if (result.length === 0) {
    return null
  }

  return result[0].credits_cents
}

/**
 * Get a user's current credit balance.
 */
export async function getCredits(userId: string): Promise<number> {
  const sql = getDb()

  const result = await sql`
    SELECT credits_cents FROM users WHERE id = ${userId}
  ` as { credits_cents: number }[]

  return result[0]?.credits_cents ?? 0
}

/**
 * Check if user has enough credits for a purchase.
 *
 * @param userId - Clerk user ID
 * @param costCents - Required amount in cents
 * @returns true if user has enough credits
 */
export async function hasCredits(
  userId: string,
  costCents: number
): Promise<boolean> {
  const credits = await getCredits(userId)
  return credits >= costCents
}

// ============================================================
// AUTO TOP-UP MANAGEMENT
// ============================================================

/**
 * Save a payment method ID for auto top-up.
 * Called after SetupIntent succeeds.
 */
export async function setPaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<void> {
  const sql = getDb()

  await sql`
    UPDATE users
    SET stripe_payment_method_id = ${paymentMethodId}
    WHERE id = ${userId}
  `
}

/**
 * Update auto top-up settings.
 */
export async function updateAutoTopupSettings(
  userId: string,
  settings: {
    enabled?: boolean
    thresholdCents?: number
    amountCents?: number
  }
): Promise<void> {
  const sql = getDb()

  await sql`
    UPDATE users
    SET
      auto_topup_enabled = COALESCE(${settings.enabled ?? null}, auto_topup_enabled),
      auto_topup_threshold_cents = COALESCE(${settings.thresholdCents ?? null}, auto_topup_threshold_cents),
      auto_topup_amount_cents = COALESCE(${settings.amountCents ?? null}, auto_topup_amount_cents)
    WHERE id = ${userId}
  `
}

/**
 * Check if user needs auto top-up and has it enabled.
 * Returns the amount to charge, or null if no top-up needed.
 */
export async function checkAutoTopup(userId: string): Promise<{
  shouldTopup: boolean
  amountCents: number
  paymentMethodId: string | null
  customerId: string | null
} | null> {
  const sql = getDb()

  const result = await sql`
    SELECT
      credits_cents,
      auto_topup_enabled,
      auto_topup_threshold_cents,
      auto_topup_amount_cents,
      stripe_payment_method_id,
      stripe_customer_id
    FROM users
    WHERE id = ${userId}
  ` as {
    credits_cents: number
    auto_topup_enabled: boolean
    auto_topup_threshold_cents: number
    auto_topup_amount_cents: number
    stripe_payment_method_id: string | null
    stripe_customer_id: string | null
  }[]

  if (result.length === 0) return null

  const user = result[0]

  // Check if auto top-up should trigger
  const shouldTopup =
    user.auto_topup_enabled &&
    user.credits_cents < user.auto_topup_threshold_cents &&
    user.stripe_payment_method_id !== null &&
    user.stripe_customer_id !== null

  return {
    shouldTopup,
    amountCents: user.auto_topup_amount_cents,
    paymentMethodId: user.stripe_payment_method_id,
    customerId: user.stripe_customer_id,
  }
}
