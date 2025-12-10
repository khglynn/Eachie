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
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Research queries:</strong> Your queries are sent to third-party AI providers
                (via OpenRouter) to generate responses. We do not permanently store the content of
                your queries or AI responses on our servers.
              </li>
              <li>
                <strong>Attachments:</strong> Files you upload (images, PDFs, text) are processed
                in-memory and sent to AI providers. They are not stored after your session.
              </li>
            </ul>

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
                <strong>Usage data:</strong> Retained while your account is active, or until you
                request deletion.
              </li>
              <li>
                <strong>Query content:</strong> Not retained beyond your active session.
              </li>
              <li>
                <strong>Payment records:</strong> Retained as required by law (typically 7 years).
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
