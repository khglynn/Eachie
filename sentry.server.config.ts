// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Determine environment: preview for test.eachie.ai, production for main branch
const environment = process.env.VERCEL_ENV || 'development'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Scrub request bodies to avoid storing user query content in error reports
  // This ensures BYOK/privacy-mode users don't have their queries leaked to Sentry
  beforeSend(event) {
    if (event.request?.data) {
      event.request.data = '[REDACTED]'
    }
    return event
  },
});
