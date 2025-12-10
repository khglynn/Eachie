/**
 * Custom 404 Page
 *
 * Matches Eachie's paper color palette.
 */

import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper-bg flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-paper-text mb-4">404</h1>
        <p className="text-paper-muted text-lg mb-6">
          Page not found
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-paper-surface text-paper-text rounded-lg hover:bg-paper-accent/20 transition-colors"
        >
          Back to Eachie
        </Link>
      </div>
    </main>
  )
}
