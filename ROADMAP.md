# Eachie Roadmap

**Last Updated:** December 10, 2024
**Current Phase:** Post-Launch Foundation

---

## Completed

| Phase | Status | Plan File |
|-------|--------|-----------|
| Core App | ✅ Done | - |
| Code Review & Cleanup | ✅ Done | `claude-plans/2025-12-09-code-review-cleanup.md` |
| Stripe, Auth & Usage (Plan 1) | ✅ Done | `claude-plans/2024-12-10-plan1-stripe-auth-usage.md` |

---

## Next Up (In Order)

### 1. Settings Page
**Status:** Not started
**What:** User settings UI - account info, payment method, data preferences, referral section
**Why first:** Foundation for all user-facing features below
**Files to create:**
- `app/settings/page.tsx`
- `src/components/SettingsSection.tsx`

---

### 2. Legal Compliance
**Status:** Not started
**Plan:** `claude-plans/2024-12-10-chat-history-legal-friends.md` (Part 2)
**What:**
- Update privacy policy with data storage disclosure
- Update terms of service
- Add "Delete My Data" endpoint and UI
- GDPR/CCPA compliance (right to access, delete, retention limits)

**Why second:** Must exist BEFORE we store user data (chat history)

**Files to create/modify:**
- `app/privacy/page.tsx` - Update
- `app/terms/page.tsx` - Update
- `app/api/user/delete-data/route.ts` - New

---

### 3. Chat History
**Status:** Not started
**Plan:** `claude-plans/2024-12-10-chat-history-legal-friends.md` (Part 1)
**What:**
- Server-side session storage for paid users
- BYOK sessions stay client-side only
- Auto-save after research completion
- History sidebar/modal to load previous sessions
- Retention settings (6mo default, 5yr max)

**Files to create:**
- `app/api/sessions/route.ts`
- `app/api/sessions/[id]/route.ts`
- `src/components/ChatHistory.tsx`
- `src/components/SessionCard.tsx`

---

### 4. Analytics Schema
**Status:** Not started
**Plan:** `claude-plans/2024-12-10-analytics-schema.md`
**What:**
- New tables: `research_queries`, `model_calls`, `dim_models`, `dim_dates`
- Write to analytics tables from research API
- PostHog events for behavioral tracking
- Model sync cron job

**Files to create:**
- `src/server/queries/analytics.ts`
- `src/server/queries/models.ts`
- `app/api/cron/sync-models/route.ts`

---

### 5. Friend Codes
**Status:** Not started
**Plan:** `claude-plans/2024-12-10-chat-history-legal-friends.md` (Part 3)
**What:**
- Both parties get $6 when code redeemed
- 6 invites per user max
- Free tier balance carries over on signup
- UI in settings page

**Files to create:**
- `app/api/referral/code/route.ts`
- `app/api/referral/redeem/route.ts`
- `src/components/ReferralSection.tsx`
- `src/components/RedeemCode.tsx`

---

## Future (After Core Features)

| Feature | Plan File |
|---------|-----------|
| Storybook Component Library | `claude-plans/2024-12-10-storybook-component-library.md` |

---

## How to Use This File

1. **Starting a session:** Check "Next Up" to see what's next
2. **Finishing a feature:** Move it to "Completed" and update the date
3. **Plans have details:** Each plan file has implementation steps, files to modify, etc.

---

## Quick Links

| What | Where |
|------|-------|
| All plans | `claude-plans/` folder |
| Project instructions | `CLAUDE.md` |
| Orchestration flow | `ORCHESTRATION.md` |
| Database schema | `src/server/schema.sql` |
