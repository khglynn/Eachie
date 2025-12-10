# Plan: Code Review & Cleanup Before Complex Features

## Overview

Comprehensive code review completed. The codebase is **production-ready** and well-architected. A few cleanup items before adding user accounts, database, and payments.

---

## Code Review Summary

### Overall Assessment: **A** (Excellent)

| Area | Grade | Notes |
|------|-------|-------|
| Component Organization | A | 11 focused components, well-separated |
| Design System | A- | Paper colors consistent; 1 missing icon |
| Type Safety | A+ | Comprehensive TypeScript, no `any` abuse |
| API Layer | B+ | Works well; pricing duplicated in 3 places |
| Hooks | A | Clean abstractions, no bugs found |
| Performance | A- | Good patterns, no bottlenecks |
| Documentation | A | Excellent JSDoc throughout |

---

## Issues Found

### Critical (Fix Before Ship)

**1. Missing ChalkSpider Icon**
- **Location:** `src/components/HelpModal.tsx:14,67`
- **Problem:** Imports and uses `ChalkSpider` but it doesn't exist in ChalkIcons.tsx
- **Impact:** Runtime error when opening Help modal
- **Fix:** Add ChalkSpider SVG to ChalkIcons.tsx

### High Priority (Fix This Session)

**2. Pricing Data Duplicated 3x**
- **Locations:**
  - `src/config/models.ts` (display cost)
  - `src/lib/research.ts:35-55` (cost calculation)
  - `app/api/research/stream/route.ts:27-47` (same calculation)
- **Problem:** Change pricing = update 3 files
- **Fix:** Create `src/lib/pricing.ts` as single source of truth

**3. Type Duplication in Download Route**
- **Location:** `app/api/download/route.ts:6-34`
- **Problem:** Redefines `ModelResponse` and `ResearchResult` instead of importing from `@/types`
- **Fix:** Replace with imports

### Medium Priority (Should Fix)

**4. Hard-coded Color in ChalkProgressBar**
- **Location:** `src/components/ChalkProgressBar.tsx:32`
- **Problem:** `strokeColor: '#91AAF2'` instead of using theme
- **Fix:** Accept as prop or use CSS variable

**5. Missing Input Validation**
- **Location:** All API routes
- **Problem:** Manual validation, no schema
- **Recommendation:** Add Zod schemas (can defer to auth implementation)

**6. Settings Corruption Risk**
- **Location:** `src/hooks/useSettings.ts:37`
- **Problem:** Corrupted localStorage could cause runtime errors
- **Fix:** Add Zod validation before merge

### Low Priority (Nice to Have)

**7. Emoji Icons in Attachments**
- **Location:** `src/lib/attachments.ts:254-265`
- **Problem:** Uses emoji (🖼️📄📝) instead of chalk icons
- **Impact:** Minor visual inconsistency
- **Status:** Works well, can defer

**8. Query Ref Pattern Undocumented**
- **Location:** `app/page.tsx:50-59`
- **Problem:** `queryRef` + `setQuery` dual pattern needs explanation
- **Fix:** Add JSDoc comment explaining useTransition batching

---

## What's Working Well

### Architecture Wins
- Clean separation: components → hooks → lib → config → types
- SSE streaming for real-time progress (smart choice)
- OpenRouter as single gateway (simplifies BYOK)
- localStorage for settings (easy migration to DB later)

### Design System
- Paper color palette complete and consistent
- All components use `paper-*` classes
- Chalk icons comprehensive (30+ icons)
- Chalk frame classes applied consistently

### Readiness for Complex Features
- **User accounts:** Just add middleware + API checks
- **Database:** Add `src/server/` folder, hooks stay same
- **Payments:** Cost calculation exists, add credits tracking

---

## Cleanup Tasks (Prioritized)

### Must Do (Before Wrapping Up)

1. **Add ChalkSpider icon** to ChalkIcons.tsx
2. **Consolidate pricing** → Create `src/lib/pricing.ts`
3. **Fix download route imports** → Use `@/types`
4. **Document query ref pattern** → Add JSDoc to page.tsx

### Should Do (If Time Permits)

5. **Extract ChalkProgressBar color** → Accept prop or CSS var
6. **Add settings validation** → Zod schema in useSettings

### Can Defer

7. Replace attachment emojis with chalk icons
8. Add rate limiting middleware
9. Split main page (do when adding accounts)

---

## Customization Guide

### Where Things Live (for Future Changes)

| What | Where | How to Change |
|------|-------|---------------|
| **Colors** | `tailwind.config.js:10-42` | Edit `paper.*` values |
| **Icons** | `src/components/ChalkIcons.tsx` | Add/edit SVG functions |
| **Chalk Filter** | `app/layout.tsx:30-38` | Modify SVG filter params |
| **Logo/Favicon** | `public/` folder | Replace PNG files |
| **Model List** | `src/config/models.ts` | Add to `MODEL_OPTIONS` |
| **Orchestrators** | `src/config/models.ts` | Add to `ORCHESTRATOR_OPTIONS` |
| **Default Models** | `src/config/models.ts:282-291` | Edit `DEFAULT_SELECTED_*` |

### Color Palette Reference

```javascript
// tailwind.config.js
paper: {
  bg: '#020F59',           // Darkest - page background
  card: '#021373',         // Cards, inputs
  surface: '#03178C',      // Elevated surfaces
  accent: '#91AAF2',       // Brand color, interactive
  text: '#F2F2F2',         // Primary text (cream)
  muted: '#8BA3E6',        // Secondary text
  success: '#4ADE80',      // Green
  error: '#F87171',        // Red
  warning: '#FBBF24',      // Amber
  hover/active/divider     // State colors
}
```

### Adding a New Icon

```typescript
// src/components/ChalkIcons.tsx
export function ChalkNewIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="..." stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Export in barrel (same file, near bottom)
export { ChalkNewIcon }
```

---

## Files to Modify

### This Session

| File | Action |
|------|--------|
| `src/components/ChalkIcons.tsx` | Add ChalkSpider |
| `src/lib/pricing.ts` | **CREATE** - Single source for pricing |
| `src/lib/research.ts` | Import from pricing.ts |
| `app/api/research/stream/route.ts` | Import from pricing.ts |
| `app/api/download/route.ts` | Fix type imports |
| `app/page.tsx` | Add JSDoc to query ref pattern |

### Optional

| File | Action |
|------|--------|
| `src/components/ChalkProgressBar.tsx` | Extract color to prop |
| `src/hooks/useSettings.ts` | Add Zod validation |

---

## Next Steps Document

Create `NEXT-STEPS.md` in project root with:

1. **Neon Database Setup**
   - Run `npx neonctl@latest init`
   - Create schema (users, sessions, conversation_rounds)
   - Add cost tracking per round

2. **Clerk Authentication**
   - Install `@clerk/nextjs`
   - Add middleware for protected routes
   - Migrate settings from localStorage to DB

3. **Cost-Based Free Tier**
   - $12 free usage (track actual costs)
   - Device fingerprint for anonymous tracking
   - Upgrade prompt when limit reached

4. **Friend Credits**
   - Invite codes ($12, $24, $36 tiers)
   - One code per account, max $72 off

5. **Legal Pages**
   - Terms of Service
   - Privacy Policy
   - Refund Policy

---

## Implementation Order

### Phase 1: Critical Fixes (15 min)
1. Add ChalkSpider icon
2. Fix download route type imports
3. Add JSDoc to query ref pattern

### Phase 2: Pricing Consolidation (20 min)
4. Create `src/lib/pricing.ts`
5. Update research.ts imports
6. Update stream/route.ts imports
7. Verify costs still calculate correctly

### Phase 3: Documentation (10 min)
8. Create `NEXT-STEPS.md` in project root
9. Update project CLAUDE.md with customization guide

### Phase 4: Optional Polish (if time)
10. Extract ChalkProgressBar color
11. Add settings validation

---

## Summary

**Bottom line:** The codebase is in excellent shape. Just 4 critical/high items to fix:
1. Missing ChalkSpider icon (breaks Help modal)
2. Pricing duplicated 3x (maintenance burden)
3. Type imports in download route
4. Document query ref pattern

After these fixes, the code is ready for database, auth, and payments.
