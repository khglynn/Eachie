/**
 * Database Client
 *
 * Neon serverless Postgres connection using @neondatabase/serverless.
 * Uses connection pooling optimized for serverless environments.
 *
 * Created: December 2024
 *
 * @module server/db
 */

import { neon } from '@neondatabase/serverless'

/**
 * Get a database client for executing queries.
 *
 * Uses Neon's HTTP-based serverless driver which is optimized for
 * edge/serverless environments (no persistent connections needed).
 *
 * @throws Error if DATABASE_URL is not set
 *
 * @example
 * const sql = getDb()
 * const users = await sql`SELECT * FROM users WHERE id = ${userId}`
 */
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL not set. Run `npx neonctl init` or add it to .env.local'
    )
  }

  return neon(databaseUrl)
}

/**
 * Type helper for query results.
 * Neon returns arrays of objects matching your SELECT columns.
 */
export type QueryResult<T> = T[]
