/**
 * Terms of Service Page
 *
 * Basic terms for Eachie - a multi-model AI research tool.
 * Covers API usage, user responsibilities, and liability limits.
 */

import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - Eachie',
  description: 'Terms of Service for Eachie, a multi-model AI research orchestrator.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper-bg">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-paper-accent hover:underline text-sm">
            &larr; Back to Eachie
          </Link>
          <h1 className="text-3xl font-bold text-paper-text mt-4">Terms of Service</h1>
          <p className="text-paper-muted text-sm mt-2">Last updated: December 2024</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-paper-text/90">
          <section>
            <h2 className="text-xl font-semibold text-paper-text">1. What Eachie Is</h2>
            <p>
              Eachie is a research tool that queries multiple AI models in parallel and synthesizes
              their responses. We route your queries through OpenRouter to various AI providers
              (Anthropic, OpenAI, Google, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">2. Your Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Appropriate Use:</strong> Don&apos;t use Eachie for illegal activities,
                generating harmful content, or violating the terms of the underlying AI providers.
              </li>
              <li>
                <strong>API Keys:</strong> If using BYOK (Bring Your Own Key) mode, you&apos;re
                responsible for your OpenRouter API key and any charges incurred.
              </li>
              <li>
                <strong>Accuracy:</strong> AI responses may contain errors. Verify important
                information before relying on it.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">3. Credits and Payments</h2>
            <p>
              Eachie offers a free tier with limited usage. Additional usage requires purchasing
              credits. Credits are non-refundable except as required by law. We may change pricing
              with notice.
            </p>
            <p className="mt-3">
              <strong>Cost Estimates:</strong> When exact usage data is unavailable from model
              providers, we estimate costs based on average token usage. Estimated costs are marked
              with a ~ prefix in the interface. Actual charges may vary slightly from estimates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">4. Data and Privacy</h2>
            <p>
              Your queries are sent to third-party AI providers. What we store depends on your
              usage tier and privacy settings. Free tier users&apos; data is stored to improve our
              service. BYOK users get enhanced privacy (no query text stored). All users can opt
              into &quot;Errors Only&quot; mode for minimal tracking. See our{' '}
              <Link href="/privacy" className="text-paper-accent hover:underline">
                Privacy Policy
              </Link>{' '}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">5. Service Availability</h2>
            <p>
              We aim for high uptime but can&apos;t guarantee uninterrupted service. AI providers
              may change their APIs, pricing, or availability. We&apos;ll do our best to adapt, but
              some features may become unavailable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">6. Limitation of Liability</h2>
            <p>
              Eachie is provided &quot;as is&quot; without warranties. We&apos;re not liable for any
              damages arising from your use of the service, including but not limited to decisions
              made based on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">7. Changes to Terms</h2>
            <p>
              We may update these terms. Continued use after changes constitutes acceptance. For
              significant changes, we&apos;ll provide notice via the app or email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">8. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Texas, USA. Any disputes will be
              resolved in Travis County, Texas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-paper-text">9. Contact</h2>
            <p>
              Questions about these terms? Email us at{' '}
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
          <Link href="/privacy" className="hover:text-paper-accent">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </main>
  )
}
