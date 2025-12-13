# Plan: Friend Codes

**Created:** December 12, 2024
**Ref:** `claude-plans/2024-12-10-chat-history-legal-friends.md` (Part 3)

---

## Goal

Growth feature - both parties get $8 when a friend code is redeemed at signup.

## Design Decisions

| Decision | Choice |
|----------|--------|
| **Credit amount** | $8 each (800 cents) - base 8 for spider theme |
| **Code format** | `EACHIE-WITH-ME-KG🕷️🎯📚` (initials + 3 random emojis) |
| **Redemption timing** | Signup only (via URL param) |
| **Max invites** | 8 per user (base 8!) |
| **Schema** | New `referral_codes` table (separate from promo codes) |

---

## Database Schema

### New Table: `referral_codes`

```sql
CREATE TABLE referral_codes (
  code VARCHAR(64) PRIMARY KEY,           -- EACHIE-WITH-ME-KG🕷️🎯
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uses_remaining INTEGER DEFAULT 8,       -- 8 invites per user
  total_uses INTEGER DEFAULT 0,           -- Track successful redemptions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
```

### New Table: `referral_redemptions`

```sql
CREATE TABLE referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL REFERENCES referral_codes(code) ON DELETE CASCADE,
  redeemed_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id VARCHAR(64) NOT NULL,  -- Denormalized for easy lookup
  credits_cents INTEGER DEFAULT 800,       -- $8 each
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(redeemed_by)                      -- One redemption per user
);
```

---

## Code Generation

**Format:** `EACHIE-WITH-ME-{initials}{emoji1}{emoji2}{emoji3}`

**Emoji pool** (38 emojis, 54,000+ three-emoji combos):
```typescript
const REFERRAL_EMOJIS = [
  // Insects (spider is hero)
  '🕷️', '🕸️', '🐝', '🦋', '🐛', '🐞', '🪲', '🦗', '🐜', '🪳', '🪰',
  // Academic/Knowledge
  '📚', '📖', '🎓', '📜', '🧠', '💡', '🦉', '🔬', '📐', '✏️',
  // Search/Discovery
  '🔍', '🔎', '🧭', '🗺️', '🎯',
  // Art/Writing
  '🎨', '🖌️', '✍️', '📝', '🖊️', '✒️', '📓',
  // Lists/Organization
  '📋', '📑', '🗒️', '✅', '📌',
]
```

**Example codes:**
- `EACHIE-WITH-ME-KG🕷️🎯📚`
- `EACHIE-WITH-ME-JD🦋🧠🦉`
- `EACHIE-WITH-ME-AB🔍🐝📋`

**Collision handling:** If code exists, regenerate with different emojis.

**Refresh feature:** Users can regenerate their code for new emojis. Old code stops working (they re-share the new one). One code per user at a time.

---

## Implementation

### 1. Database Migration

**File:** Run in Neon console

Add the two new tables (referral_codes, referral_redemptions).

### 2. Query Functions

**File:** `src/server/queries/referrals.ts` (new)

```typescript
// Generate or get existing code for user
export async function getOrCreateReferralCode(userId: string, userName?: string): Promise<string>

// Validate and redeem a code (returns { success, error?, referrerUserId? })
export async function redeemReferralCode(code: string, newUserId: string): Promise<RedeemResult>

// Get referral stats for user (uses remaining, total redemptions)
export async function getReferralStats(userId: string): Promise<ReferralStats>
```

### 3. API Endpoints

**File:** `app/api/referral/code/route.ts`

```typescript
// GET - Get or create user's referral code
// Returns: { code, usesRemaining, totalUses, shareUrl }

// POST - Regenerate code with new emojis
// Body: { regenerate: true }
// Returns: { code, usesRemaining, totalUses, shareUrl }
```

**File:** `app/api/referral/redeem/route.ts`

```typescript
// POST - Redeem a code during signup
// Body: { code }
// Returns: { success, creditsAdded } or { error }
// Adds 800 cents to BOTH users
```

### 4. Signup Flow Integration

**File:** `app/providers.tsx` - Add `ReferralRedeemer` component

After user signs up and DeviceLinker runs:
1. Check for `?ref=EACHIE-WITH-ME-XX🕷️🎯📚` in URL
2. If present and user hasn't redeemed, call `/api/referral/redeem`
3. Show toast: "You got $8! Your friend got $8 too 🕷️"

**Share URLs:** `https://eachie.ai?ref=EACHIE-WITH-ME-KG🕷️🎯📚`
(Emojis URL-encode automatically)

### 5. Settings UI

**File:** `src/components/settings/ReferralsSection.tsx` (replace placeholder)

Shows:
- Your code with copy button
- Refresh button (🔄) with confirmation: "This will invalidate your current code and any links you've shared. Continue?"
- Share links (Twitter, email, copy URL)
- Stats: "X of 8 invites used"
- If 8 used: "Request more invites" link (mailto:kevin@)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/server/queries/referrals.ts` | Create - query functions |
| `app/api/referral/code/route.ts` | Create - GET endpoint |
| `app/api/referral/redeem/route.ts` | Create - POST endpoint |
| `app/providers.tsx` | Modify - add ReferralRedeemer |
| `src/components/settings/ReferralsSection.tsx` | Replace placeholder |
| `src/server/schema.sql` | Add new tables (doc only) |
| `CLAUDE.md` | Add note about base-8 preference |

---

## Flow Diagrams

### Sharing Flow
```
User A → Settings → See code "EACHIE-WITH-ME-KG🕷️🎯📚"
       → Copy share URL → Send to friend
```

### Redemption Flow
```
Friend clicks → eachie.ai?ref=EACHIE-WITH-ME-KG🕷️🎯📚
       → Signs up via Clerk
       → Webhook creates user in DB
       → ReferralRedeemer detects ?ref param
       → POST /api/referral/redeem
       → Both users get +800 cents
       → Toast: "You got $8!"
```

---

## Abuse Prevention

| Protection | Implementation |
|------------|----------------|
| **One redemption per user** | `UNIQUE(redeemed_by)` constraint - can only redeem one code ever |
| **No self-referral** | Check referrer_user_id ≠ redeemed_by before crediting |
| **8 invites max** | `uses_remaining` decremented on each redemption |
| **Signup-only redemption** | Code only works for new accounts (via ?ref= URL param) |
| **Refresh warning** | UI shows: "⚠️ Refreshing will invalidate your current code and any links you've shared" |

---

## Edge Cases

1. **User already redeemed a code** - Return error "You've already used a friend code"
2. **Code doesn't exist** - Return error "Invalid code"
3. **No uses remaining** - Return error "This code has no more uses"
4. **Referrer tries to redeem own code** - Return error "You can't use your own code"
5. **User refreshes code** - Old links stop working, show confirmation dialog first
6. **Emoji encoding in URLs** - Works automatically, browsers handle it
7. **User has no name** - Use "XX" as default initials

---

## Not In Scope (Future)

- Request more invites UI (just mailto: for now)
- Referral leaderboard
- Variable reward amounts
- Tiered rewards (more invites = bigger bonus)
