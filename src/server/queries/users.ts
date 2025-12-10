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
  redeemed_code: string | null
  device_id: string | null
  created_at: Date
}

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
