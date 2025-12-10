// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

// Initialize PostHog first (needed for Sentry integration)
// This runs before React, so we init here and the provider just wraps it
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });
}

// Build integrations array
const integrations = [
  Sentry.replayIntegration({
    maskAllText: true,
    blockAllMedia: true,
  }),
];

// Add PostHog integration if both are configured
// This links Sentry errors to PostHog session recordings
if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  integrations.push(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new posthog.SentryIntegration(
      posthog,
      "khg-y1",           // Sentry org slug
      4510511964225536    // Sentry project ID (from DSN)
    ) as any
  );
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  replaysSessionSampleRate: 0.1,

  // If you don't want to use Session Replay, just remove the next line:
  replaysOnErrorSampleRate: 1.0,

  integrations,
});
