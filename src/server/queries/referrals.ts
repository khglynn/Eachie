/**
 * Referral Queries
 *
 * Database operations for friend referral codes.
 * Both referrer and new user get $8 (800 cents) when code is redeemed.
 *
 * Code format: EACHIE-WITH-ME-{initials}{emoji1}{emoji2}{emoji3}
 * Example: EACHIE-WITH-ME-KG🕷️🎯📚
 *
 * Created: December 2024
 *
 * @module server/queries/referrals
 */

import { getDb } from '../db'
import { addCredits } from './users'

// ============================================================
// EMOJI POOL (38 emojis = 54,000+ three-emoji combos)
// ============================================================

const REFERRAL_EMOJIS = [
  // Insects (spider is hero)
  '🕷️', '🕸️', '🐝', '🦋', '🐛', '🐞', '🪲', '🦗', '🐜', '🪳', '🪰',
  // Academic/Knowledge
  '📚', '📖', '🎓', '📜', '🧠', '💡', '🦉', '🔬', '📐', '✏️',
  // Search/Discovery
  '🔍', '🔎', '🧭', '🗺️', '🎯',
  // Art/Writing
  '🎨', '🖌️', '✍️', '📝', '🖊️', '✒️', '📓',
  // Lists/Organization
  '📋', '📑', '🗒️', '✅', '📌',
]

// Credit amount: $8 each (base 8 for spider theme - 8 legs!)
const REFERRAL_CREDITS_CENTS = 800

// ============================================================
// TYPES
// ============================================================

interface ReferralCode {
  code: string
  user_id: string
  uses_remaining: number
  total_uses: number
  created_at: Date
}

interface ReferralStats {
  code: string | null
  usesRemaining: number
  totalUses: number
  shareUrl: string | null
}

interface RedeemResult {
  success: boolean
  error?: string
  creditsAdded?: number
  referrerUserId?: string
}

export type { ReferralCode, ReferralStats, RedeemResult }

// ============================================================
// HELPERS
// ============================================================

/**
 * Get initials from a name.
 * Falls back to "XX" if no name or name is too short.
 */
function getInitials(name?: string | null): string {
  if (!name || name.trim().length === 0) return 'XX'

  const parts = name.trim().split(/\s+/)

  if (parts.length === 1) {
    // Single name: take first two letters
    return parts[0].slice(0, 2).toUpperCase()
  }

  // Multiple names: first letter of first and last
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Pick N random emojis from the pool without repeats.
 */
function pickRandomEmojis(count: number): string[] {
  const available = [...REFERRAL_EMOJIS]
  const selected: string[] = []

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = Math.floor(Math.random() * available.length)
    selected.push(available[index])
    available.splice(index, 1)
  }

  return selected
}

/**
 * Generate a referral code with initials and 3 random emojis.
 */
function generateCode(initials: string): string {
  const emojis = pickRandomEmojis(3)
  return `EACHIE-WITH-ME-${initials}${emojis.join('')}`
}

// ============================================================
// QUERY FUNCTIONS
// ============================================================

/**
 * Get or create a referral code for a user.
 * Each user has exactly one active code at a time.
 *
 * @param userId - Clerk user ID
 * @param userName - User's name for generating initials
 * @returns The user's referral code
 */
export async function getOrCreateReferralCode(
  userId: string,
  userName?: string | null
): Promise<string> {
  const sql = getDb()

  // Check for existing code
  const existing = await sql`
    SELECT code FROM referral_codes
    WHERE user_id = ${userId}
  ` as { code: string }[]

  if (existing.length > 0) {
    return existing[0].code
  }

  // Generate new code
  const initials = getInitials(userName)
  let code = generateCode(initials)
  let attempts = 0
  const maxAttempts = 10

  // Handle collisions (very unlikely with 54k+ combos)
  while (attempts < maxAttempts) {
    try {
      await sql`
        INSERT INTO referral_codes (code, user_id)
        VALUES (${code}, ${userId})
      `
      return code
    } catch (error) {
      // Check if it's a duplicate key error
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        // Generate a new code and retry
        code = generateCode(initials)
        attempts++
      } else {
        throw error
      }
    }
  }

  throw new Error('Could not generate unique referral code after multiple attempts')
}

/**
 * Regenerate a user's referral code with new emojis.
 * The old code is deleted (stops working).
 *
 * @param userId - Clerk user ID
 * @param userName - User's name for generating initials
 * @returns The new referral code
 */
export async function regenerateReferralCode(
  userId: string,
  userName?: string | null
): Promise<string> {
  const sql = getDb()

  // Delete existing code (CASCADE will remove any redemptions reference,
  // but redemptions store referrer_user_id separately so history is preserved)
  await sql`
    DELETE FROM referral_codes
    WHERE user_id = ${userId}
  `

  // Generate new code
  const initials = getInitials(userName)
  let code = generateCode(initials)
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    try {
      await sql`
        INSERT INTO referral_codes (code, user_id)
        VALUES (${code}, ${userId})
      `
      return code
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        code = generateCode(initials)
        attempts++
      } else {
        throw error
      }
    }
  }

  throw new Error('Could not generate unique referral code after multiple attempts')
}

/**
 * Redeem a referral code for a new user.
 * Both parties get 800 cents ($8).
 *
 * @param code - The referral code to redeem
 * @param newUserId - The new user redeeming the code
 * @returns Result with success status or error message
 */
export async function redeemReferralCode(
  code: string,
  newUserId: string
): Promise<RedeemResult> {
  const sql = getDb()

  // Check if this user has already redeemed ANY code
  const existingRedemption = await sql`
    SELECT id FROM referral_redemptions
    WHERE redeemed_by = ${newUserId}
  ` as { id: string }[]

  if (existingRedemption.length > 0) {
    return {
      success: false,
      error: "You've already used a friend code",
    }
  }

  // Get the referral code details
  const codeResult = await sql`
    SELECT code, user_id, uses_remaining
    FROM referral_codes
    WHERE code = ${code}
  ` as ReferralCode[]

  if (codeResult.length === 0) {
    return {
      success: false,
      error: 'Invalid code',
    }
  }

  const referralCode = codeResult[0]

  // Check if it's a self-referral
  if (referralCode.user_id === newUserId) {
    return {
      success: false,
      error: "You can't use your own code",
    }
  }

  // Check if code has uses remaining
  if (referralCode.uses_remaining <= 0) {
    return {
      success: false,
      error: 'This code has no more uses',
    }
  }

  // Create redemption record
  try {
    await sql`
      INSERT INTO referral_redemptions (
        code, redeemed_by, referrer_user_id, credits_cents
      ) VALUES (
        ${code}, ${newUserId}, ${referralCode.user_id}, ${REFERRAL_CREDITS_CENTS}
      )
    `
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
      return {
        success: false,
        error: "You've already used a friend code",
      }
    }
    throw error
  }

  // Decrement uses remaining and increment total uses
  await sql`
    UPDATE referral_codes
    SET
      uses_remaining = uses_remaining - 1,
      total_uses = total_uses + 1
    WHERE code = ${code}
  `

  // Add credits to both users
  await addCredits(newUserId, REFERRAL_CREDITS_CENTS)
  await addCredits(referralCode.user_id, REFERRAL_CREDITS_CENTS)

  return {
    success: true,
    creditsAdded: REFERRAL_CREDITS_CENTS,
    referrerUserId: referralCode.user_id,
  }
}

/**
 * Get referral stats for a user (for settings page).
 *
 * @param userId - Clerk user ID
 * @returns Stats including code, uses remaining, and share URL
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const sql = getDb()

  const result = await sql`
    SELECT code, uses_remaining, total_uses
    FROM referral_codes
    WHERE user_id = ${userId}
  ` as ReferralCode[]

  if (result.length === 0) {
    return {
      code: null,
      usesRemaining: 8,
      totalUses: 0,
      shareUrl: null,
    }
  }

  const code = result[0]

  return {
    code: code.code,
    usesRemaining: code.uses_remaining,
    totalUses: code.total_uses,
    shareUrl: `https://eachie.ai?ref=${encodeURIComponent(code.code)}`,
  }
}

/**
 * Check if a referral code exists and is valid.
 * Used for quick validation without attempting redemption.
 *
 * @param code - The referral code to check
 * @returns Whether the code exists and has uses remaining
 */
export async function isValidReferralCode(code: string): Promise<boolean> {
  const sql = getDb()

  const result = await sql`
    SELECT uses_remaining
    FROM referral_codes
    WHERE code = ${code}
  ` as { uses_remaining: number }[]

  return result.length > 0 && result[0].uses_remaining > 0
}

/**
 * Check if a user has already redeemed any referral code.
 *
 * @param userId - Clerk user ID
 * @returns Whether the user has already redeemed a code
 */
export async function hasRedeemedReferralCode(userId: string): Promise<boolean> {
  const sql = getDb()

  const result = await sql`
    SELECT id FROM referral_redemptions
    WHERE redeemed_by = ${userId}
    LIMIT 1
  ` as { id: string }[]

  return result.length > 0
}
