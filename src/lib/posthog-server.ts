// Server-side PostHog client for API routes and server components
import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Flush events immediately in serverless environments
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return posthogClient
}

// Helper to capture server-side events
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient()
  if (!client) return

  client.capture({
    distinctId,
    event,
    properties,
  })
}

// Ensure events are flushed before response ends
export async function flushPostHog() {
  const client = getPostHogClient()
  if (client) {
    await client.shutdown()
    posthogClient = null // Reset for next request in serverless
  }
}
