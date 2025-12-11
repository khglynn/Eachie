# Plan 1: Stripe, Auth & Usage Tracking

**Created:** December 2024
**Status:** ✅ COMPLETE (Dec 10, 2024)

---

## Overview

Three-part implementation for monetization and user management.

---

## Part 1: Anonymous Usage Tracking ✅ COMPLETE

| Item | Status | File |
|------|--------|------|
| FingerprintJS setup | ✅ Done | `src/lib/fingerprint.ts` |
| useDeviceId hook | ✅ Done | `src/hooks/useDeviceId.ts` |
| $12 free tier tracking | ✅ Done | `src/server/queries/usage.ts` |
| Rate limiting (20/hr, 100/day) | ✅ Done | `src/server/queries/usage.ts` |
| Abuse flags table | ✅ Done | `src/server/schema.sql` |
| System circuit breaker | ✅ Done | `src/server/schema.sql` |
| Centralized messages | ✅ Done | `src/config/messages.ts` |
| Draft preservation | ✅ Done | `src/hooks/useDraftPreservation.ts` |
| beforeunload warning | ✅ Done | `app/page.tsx` |

---

## Part 2: Clerk Authentication ✅ COMPLETE

| Item | Status | File |
|------|--------|------|
| Install @clerk/nextjs | ✅ Done | package.json |
| Add ClerkProvider | ✅ Done | app/providers.tsx |
| Auth middleware | ✅ Done | middleware.ts |
| Sign in/up pages | ✅ Done | app/sign-in/, app/sign-up/ |
| User webhook sync | ✅ Done | app/api/webhooks/clerk/route.ts |
| Link device to user | ✅ Done | app/api/user/link-device/route.ts |
| AuthButton component | ✅ Done | src/components/AuthButton.tsx |
| DeviceLinker component | ✅ Done | app/providers.tsx |

---

## Part 3: Stripe Payments ✅ COMPLETE

| Item | Status | File |
|------|--------|------|
| Install stripe package | ✅ Done | package.json |
| Stripe client wrapper | ✅ Done | src/lib/stripe.ts |
| Credit packages config | ✅ Done | src/lib/stripe.ts |
| Checkout API | ✅ Done | app/api/checkout/route.ts |
| Stripe webhook | ✅ Done | app/api/webhooks/stripe/route.ts |
| Balance API | ✅ Done | app/api/user/balance/route.ts |
| Credit functions | ✅ Done | src/server/queries/users.ts |
| BalanceDisplay component | ✅ Done | src/components/BalanceDisplay.tsx |
| UpgradePrompt component | ✅ Done | src/components/UpgradePrompt.tsx |

### Credit Packages

| Package | Pay | Get | Bonus |
|---------|-----|-----|-------|
| Starter | $10 | $12 | 20% |
| Popular | $25 | $30 | 20% |
| Power | $50 | $65 | 30% |
| Pro | $100 | $150 | 50% |

### Stripe Dashboard Setup Required

1. Create "Eachie Credits" product with 4 prices
2. Add env vars to `.env.local`
3. Configure webhook endpoint

---

## Next Steps

With Plan 1 complete, proceed to:
- **Plan 2**: Chat History, Legal Pages, Friend Codes
- **Plan 3**: Storybook Component Library (future)
