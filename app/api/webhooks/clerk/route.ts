/**
 * Clerk Webhook Handler
 *
 * Syncs user data from Clerk to our Neon database.
 * Configure in Clerk Dashboard → Webhooks → Add Endpoint
 *
 * Events handled:
 * - user.created: Create user in our database
 * - user.updated: Update user info
 * - user.deleted: Delete user (GDPR)
 *
 * Created: December 2024
 */

import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createUser, deleteUser, getUser } from '@/server/queries/users'
import { getDb } from '@/server/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Get headers for verification
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle events
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data
        const email = email_addresses?.[0]?.email_address
        const name = [first_name, last_name].filter(Boolean).join(' ') || undefined

        if (!email) {
          console.error('User created without email:', id)
          return new Response('User has no email', { status: 400 })
        }

        await createUser({ id, email, name })
        console.log('Created user:', id, email)
        break
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data
        const email = email_addresses?.[0]?.email_address
        const name = [first_name, last_name].filter(Boolean).join(' ') || undefined

        // Update user if they exist
        const existing = await getUser(id)
        if (existing && email) {
          const sql = getDb()
          await sql`
            UPDATE users
            SET email = ${email}, name = ${name ?? existing.name}
            WHERE id = ${id}
          `
          console.log('Updated user:', id)
        }
        break
      }

      case 'user.deleted': {
        const { id } = evt.data
        if (id) {
          await deleteUser(id)
          console.log('Deleted user:', id)
        }
        break
      }

      default:
        // Ignore other events
        console.log('Unhandled webhook event:', eventType)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response('Internal error', { status: 500 })
  }
}
