/**
 * Clerk Middleware
 *
 * Handles authentication state for all routes.
 * IMPORTANT: Most routes are PUBLIC - anonymous users get free tier access.
 * Auth is optional, not required.
 *
 * Created: December 2024
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Routes that require authentication.
 * Everything else is public (anonymous users welcome).
 */
const isProtectedRoute = createRouteMatcher([
  '/settings(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Only protect routes that explicitly need auth
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  // All other routes: auth is checked but not required
  // API routes can check auth state and decide what to do
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
