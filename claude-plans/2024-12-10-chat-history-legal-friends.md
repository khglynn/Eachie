# Plan 2: Chat History, Legal Compliance & Friend Codes

**Created:** December 10, 2024
**Status:** Phase 2 (after Stripe/usage tracking)
**Depends on:** Plan 1 completion (Stripe, usage tracking, Clerk auth)

---

## Overview

Implement server-side chat history storage with proper legal compliance, user data controls, and friend referral codes.

---

## Part 1: Chat History Storage

### What We Store (for paid users only)

| Data | Stored | Notes |
|------|--------|-------|
| User queries | Yes | Could contain PII |
| Model responses | Yes | Unlikely to have PII |
| Attachments | Metadata only | File names, not content |
| Cost data | Yes | Per-round costs |
| BYOK sessions | **No** | Their API key, not our data |

**Key decision:** BYOK users' sessions are NOT stored server-side. This is a paid feature benefit and reduces our liability.

### Database Schema (exists in schema.sql)

```sql
-- sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64),
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- conversation_rounds table
CREATE TABLE conversation_rounds (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  synthesis TEXT,
  model_responses JSONB,
  cost_cents INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Retention Policy

| Setting | Default | Options |
|---------|---------|---------|
| Retention period | 6 months rolling | 6mo, 1yr, "Forever" |
| "Forever" max | 5 years | Hard cap, then auto-delete |
| Inactive account | 5 years | Account + data deleted |

**Settings location:** User settings page (to be created)

### Files to Create

| File | Purpose |
|------|---------|
| `app/api/sessions/route.ts` | List user's sessions |
| `app/api/sessions/[id]/route.ts` | Get/delete specific session |
| `src/components/ChatHistory.tsx` | History sidebar/modal |
| `src/components/SessionCard.tsx` | Individual session preview |
| `app/settings/page.tsx` | User settings (retention, etc.) |

### Auto-Save Flow

After each research completion:
1. Check if user is authenticated (Clerk)
2. Check if NOT in BYOK mode
3. If both true → save session + rounds to DB
4. Generate title from first query (truncated)

---

## Part 2: Legal Compliance

### GDPR Requirements (European users)

| Requirement | Implementation |
|-------------|----------------|
| **Disclosure** | Privacy policy states what we store |
| **Consent** | Implicit via account creation (paid feature) |
| **Right to access** | Export feature (already have download) |
| **Right to delete** | "Delete My Data" button |
| **Data minimization** | Only store what's needed |
| **Retention limits** | 6mo default, 5yr max |

### CCPA Requirements (California users)

| Requirement | Implementation |
|-------------|----------------|
| **Disclosure** | Privacy policy |
| **Right to know** | Export feature |
| **Right to delete** | "Delete My Data" button |
| **No discrimination** | Same service regardless |

### Privacy Policy Updates

Add to `/privacy`:

```markdown
## Data We Collect

### For Paid Users
- Research queries and AI responses (stored server-side)
- Usage and cost data
- Account information (via Clerk)

### For BYOK Users
- Queries are sent directly to OpenRouter via your API key
- We do NOT store your queries or responses server-side
- Only usage metadata is tracked for rate limiting

## Data Retention
- Default: 6 months rolling
- You can extend to "Forever" in settings (max 5 years)
- Inactive accounts deleted after 5 years

## Your Rights
- **Export:** Download your data anytime (Download button)
- **Delete:** Settings → Delete My Data
- **Modify retention:** Settings → Data Retention
```

### Delete My Data Feature

**File:** `app/api/user/delete-data/route.ts`

**What it deletes:**
1. All `conversation_rounds` (via CASCADE)
2. All `sessions`
3. `anonymous_usage` linked to their devices
4. `stripe_customers` record (but NOT Stripe customer - they might want refund)

**What it does NOT delete:**
- Clerk account (they do that separately)
- Stripe customer (for refund/billing history)

**Flow:**
1. User clicks "Delete My Data" in settings
2. Confirmation modal with warning
3. POST to `/api/user/delete-data`
4. Delete all user data
5. Show confirmation, redirect to home

---

## Part 3: Friend Codes

### How It Works

- **Both parties get $6** when a friend code is redeemed
- **6 invites max** per user (can request more manually)
- Bonus adds to existing balance (no reset)

### Free Tier Carryover

When an anonymous user signs up:
- Their device fingerprint gets linked to their user account
- Their remaining free tier balance carries over (not reset)
- Friend code bonus ($6) is added ON TOP of remaining balance

**Example:**
1. Anonymous user uses $8 of their $12 free tier
2. They sign up with friend code `EACHIE-ABC123`
3. Their balance: $4 remaining + $6 friend bonus = $10 total
4. Referrer also gets +$6 added to their balance

### Database

```sql
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(16) UNIQUE NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  uses_remaining INTEGER DEFAULT 6,  -- each user gets 6 invites
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE referral_redemptions (
  id SERIAL PRIMARY KEY,
  code_id INTEGER REFERENCES referral_codes(id),
  redeemed_by_user_id VARCHAR(64) NOT NULL,
  referrer_credited BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP DEFAULT NOW()
);
```

### Files to Create

| File | Purpose |
|------|---------|
| `app/api/referral/code/route.ts` | Generate/get user's code |
| `app/api/referral/redeem/route.ts` | Redeem a friend code |
| `src/components/ReferralSection.tsx` | Share code UI |
| `src/components/RedeemCode.tsx` | Enter code UI |

### Flow

**Generating a code:**
1. User goes to settings or account page
2. If no code exists, generate one (e.g., `EACHIE-A1B2C3`)
3. Display code with copy button and share links
4. Show remaining invites (X of 6 used)

**Redeeming a code:**
1. New user signs up OR existing user enters code
2. POST to `/api/referral/redeem` with code
3. Add $6 to friend's account
4. Add $6 to referrer's account
5. Decrement uses_remaining

**Requesting more invites:**
- After 6 used, show "Request more invites" link
- Links to email or support form
- Kevin manually approves and increases uses_remaining

---

## Part 4: Settings Page

### What's on the Settings Page

| Section | Settings |
|---------|----------|
| **Account** | Email (from Clerk), sign out |
| **Payment** | View/update payment method, auto top-up settings |
| **Data** | Retention period, export data, delete all data |
| **Referrals** | Your code, invites used/remaining |

### File

`app/settings/page.tsx`

---

## Implementation Order

### Step 1: Legal Foundation
1. Update privacy policy with data storage disclosure
2. Add terms of service (if not exists)
3. Create Delete My Data endpoint

### Step 2: Chat History
1. Wire up session creation after research (for paid users)
2. Create sessions list endpoint
3. Build ChatHistory UI component
4. Add "Load Previous Session" flow

### Step 3: Settings Page
1. Create settings page layout
2. Add retention period selector
3. Add Delete My Data button with confirmation
4. Add payment method management (Stripe)

### Step 4: Friend Codes
1. Create referral tables
2. Build code generation endpoint
3. Build redemption endpoint (credits both parties $6)
4. Add ReferralSection to settings
5. Add RedeemCode to signup flow

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `app/api/sessions/route.ts` | List sessions |
| `app/api/sessions/[id]/route.ts` | Session CRUD |
| `app/api/user/delete-data/route.ts` | GDPR deletion |
| `app/api/referral/code/route.ts` | Generate codes |
| `app/api/referral/redeem/route.ts` | Redeem codes |
| `app/settings/page.tsx` | Settings page |
| `src/components/ChatHistory.tsx` | History UI |
| `src/components/ReferralSection.tsx` | Share codes |

### Modify
| File | Change |
|------|--------|
| `app/privacy/page.tsx` | Add data storage disclosure |
| `src/server/schema.sql` | Add referral tables |
| `app/api/research/stream/route.ts` | Auto-save sessions |

---

## Open Questions

1. **History UI:** Sidebar (always visible) or modal (on-demand)?
2. **Code format:** `EACHIE-XXXXX` or just random `XXXXX`?
3. **Redemption timing:** At signup only, or anytime before first purchase?
