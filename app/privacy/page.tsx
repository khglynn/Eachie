/**
 * Privacy Policy Page
 *
 * Privacy policy for Eachie covering data collection, storage, and third parties.
 * GDPR-aware for European users.
 */

import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - Eachie',
  description: 'Privacy Policy for Eachie, a multi-model AI research orchestrator.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper-bg">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-paper-accent hover:underline text-sm">
            &larr; Back to Eachie
          </Link>
          <h1 className="text-3xl font-bold text-paper-text mt-4">Privacy Policy</h1>
          <p className="text-paper-muted text-sm mt-2">Last updated: December 2024</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-paper-text/90">
          <section>
            <h2 className="text-xl font-semibold text-paper-text">What We Collect</h2>

            <h3 className="text-lg font-medium text-paper-text mt-4">Usage Data</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Anonymous usage tracking:</strong> We track aggregate usage (queries made,
                costs incurred) to enforce free tier limits. This is linked to a device identifier,
                not your identity.
              </li>
              <li>
                <strong>Account data:</strong> If you create an account, we store your email and
                basic profile information from your authentication provider.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-paper-text mt-4">Query Data</h3>
            <p className="mb-2">
              Your queries are sent to third-party AI providers (via OpenRouter) to generate
              responses. What we store on our servers depends on how you use Eachie:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Free tier users:</strong> We store your queries, AI responses, and usage
                analytics. We subsidize your usage, so we retain this data to improve our service.
              </li>
              <li>
                <strong>Paid users (using our API credits):</strong> By default, we store your
                queries and responses to provide chat history and sync across devices. You can opt
                out in settings to store only anonymous analytics (no query text).
              </li>
              <li>
                <strong>BYOK users (your own API key):</strong> We store only anonymous analytics
                (query length, model usage, costs) but not the text of your queries or responses.
                Your queries go directly to providers without being stored. To sync chat history,
                upgrade to paid.
              </li>
              <li>
                <strong>Attachments:</strong> Files you upload (images, PDFs, text) are processed
                in-memory and sent to AI providers. Attachment metadata (file types, counts) is
                stored for analytics; file contents are not stored.
              </li>
            </ul>
            <p className="mt-2 text-paper-muted text-sm">
              All users can opt to &quot;Errors Only&quot; mode in settings, which disables all analytics
              except error tracking needed to keep Eachie working.
            </p>

            <h3 className="text-lg font-medium text-paper-text mt-4">API Keys (BYOK Mode)</h3>
            <p>
              If you use your own OpenRouter API key, it&apos;s stored locally in your browser
              (localStorage). We never transmit or store your API key on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Third-Party Services</h2>
            <p>Eachie uses the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>OpenRouter:</strong> Routes queries to AI providers. See{' '}
                <a
                  href="https://openrouter.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper-accent hover:underline"
                >
                  OpenRouter&apos;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>AI Providers:</strong> Your queries reach Anthropic, OpenAI, Google, and
                other providers. Each has their own data handling policies.
              </li>
              <li>
                <strong>Vercel:</strong> Hosts our application. See{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper-accent hover:underline"
                >
                  Vercel&apos;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Stripe:</strong> Processes payments. See{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper-accent hover:underline"
                >
                  Stripe&apos;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>PostHog:</strong> Analytics and session recording (for users with full
                tracking). See{' '}
                <a
                  href="https://posthog.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper-accent hover:underline"
                >
                  PostHog&apos;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Sentry:</strong> Error tracking to identify and fix bugs. Query content is
                scrubbed from error reports. See{' '}
                <a
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper-accent hover:underline"
                >
                  Sentry&apos;s privacy policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Cookies and Local Storage</h2>
            <p>We use browser storage for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Settings:</strong> Your preferences (selected models, orchestrator choice)
                are stored in localStorage.
              </li>
              <li>
                <strong>Device ID:</strong> A random identifier for anonymous usage tracking.
              </li>
              <li>
                <strong>Authentication:</strong> Session cookies if you create an account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Your Rights (GDPR)</h2>
            <p>If you&apos;re in the European Economic Area, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email us at{' '}
              <a
                href="mailto:help@kevinhg.com"
                className="text-paper-accent hover:underline"
              >
                help@kevinhg.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Data Retention</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Usage analytics:</strong> Aggregated monthly after 6 months. Detailed data
                is available for recent queries; older data is summarized.
              </li>
              <li>
                <strong>Query content (if stored):</strong> Retained according to your preference:
                6 months (default), 1 year, 5 years, or forever. You can change this in settings.
              </li>
              <li>
                <strong>Payment records:</strong> Retained as required by law (typically 7 years).
              </li>
              <li>
                <strong>Account data:</strong> Retained until you delete your account. You can
                request full data deletion at any time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Security</h2>
            <p>
              We use HTTPS for all connections. Your data in transit is encrypted. We follow
              security best practices, but no system is 100% secure. Use strong passwords and
              protect your API keys.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Children</h2>
            <p>
              Eachie is not intended for users under 13. We don&apos;t knowingly collect data from
              children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Changes</h2>
            <p>
              We may update this policy. Significant changes will be announced via the app. Your
              continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">Contact</h2>
            <p>
              Privacy questions? Email us at{' '}
              <a
                href="mailto:help@kevinhg.com"
                className="text-paper-accent hover:underline"
              >
                help@kevinhg.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-paper-divider text-xs text-paper-muted">
          <Link href="/terms" className="hover:text-paper-accent">
            Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  )
}
