# Eachie - Agent Instructions

*Inherits from ~/DevKevin/CLAUDE.md*

## What This Is

A multi-model research orchestrator. Queries multiple AI models in parallel, then synthesizes their responses into unified insights. BYOK mode lets friends use it with their own API keys.

**Character:** Eachie is a friendly academic spider, drawn with chalk. She casts a wide net - weaving together responses from across the web into something more useful than any single source.

## The Vibe

Approachable academic. Eachie helps people do wide-ranging research by connecting points across different models and approaches. Not a power-user tool - a helpful research companion.

## Copy Style

Warm, clear, curious. Educational without being condescending. Eachie genuinely wants to help you find what you're looking for.

## Tech Stack
- Next.js 15 / React 19 / TypeScript
- Vercel AI SDK + OpenRouter (single API for all models)
- TailwindCSS
- Vercel Fluid Compute (long timeouts for deep research)

## Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **OpenRouter** | API gateway for all AI models | Active |
| **Claude Code** | All dev work, debugging | Active |
| **Clerk** | Account management, auth | Planned |
| **Stripe** | Payment processing | Planned |
| **Neon** | Database (Postgres) | Planned |
| **PostHog** | Session tracking, testing, errors | Planned |
| **Canny** | Feature requests | Active (eachie.canny.io) |

## Key Files

| File | Purpose |
|------|---------|
| `/app/page.tsx` | Main app flow |
| `/src/config/models.ts` | Model configuration |
| `/src/lib/research.ts` | Query + synthesis logic |
| `/src/types/index.ts` | TypeScript interfaces |
| **`ORCHESTRATION.md`** | How the research flow works (keep updated!) |

## Orchestration Reference

See `ORCHESTRATION.md` for the full breakdown of:
- What each model sees at each stage
- Exact prompts (research, clarifying, synthesis)
- Follow-up context handling
- Attachment handling

**Update ORCHESTRATION.md whenever prompts or flow changes.**

## Git Workflow

Solo project - no PRs needed. Work on `dev`, merge to `main` when ready:

```bash
# Day-to-day work
git checkout dev
# ... make changes, commit, push ...
# → deploys to test.eachie.ai

# Deploy to production
git checkout main && git merge dev && git push
# → deploys to eachie.ai
git checkout dev  # back to working
```

## Legal & Compliance

Public-facing app with free tier that generates revenue. Based in Texas, distributed globally.

**Keep in mind:**
- GDPR (European users) - cookie consent, data handling, right to deletion
- Privacy policy and terms of service required
- Payment disclosures (Stripe)
- API key handling (BYOK mode stores keys in localStorage, not on server)

## Project-Specific Notes
- OpenRouter is the gateway for all models
- Some models have "thinking" variants (o3, Grok Fast)
- Cost tracking happens per-model in research.ts

## Design System: Chalk Aesthetic

Eachie blends a chalk/hand-drawn look with modern web app usability. **Don't go too far in either direction.**

### UX Design Philosophy
Be a thoughtful UX designer balancing function with creative flair:
- **Function first** - UI must be usable, accessible, clear
- **Selective flair** - Chalk effects add personality without hurting usability
- **Enabled appearance** - Use cream (#F2F2F2 / `paper-text`) strategically so elements look enabled, not blue-on-blue disabled
- **Visual hierarchy** - Darker backgrounds push forward, lighter elements draw attention

### Where Chalk Effects Apply
| Element | Chalk Effect? | Notes |
|---------|--------------|-------|
| Main container borders | Yes | `.chalk-frame` class in globals.css |
| Divider lines | Yes (subtle) | Use `border-paper-divider` |
| Progress bar | Yes | `ChalkProgressBar` component |
| Blinking cursor | Yes | If implemented |
| **Icons** | No | Clean SVG icons, no filter |
| **Text** | No | Normal font rendering |
| **Button outlines** | No | Clean borders |
| **Form inputs** | No | Clean, usable |

### Color Palette (`paper-*`)
All colors defined in `tailwind.config.js` under `paper.*`:
- `paper-bg` - Primary background (deepest navy #020F59)
- `paper-card` - Card backgrounds (deep navy #021373)
- `paper-surface` - Elevated surfaces, highlights (#03178C)
- `paper-accent` - Borders, links, interactive elements (#91AAF2)
- `paper-text` - Primary text / cream (#F2F2F2) - use for "enabled" look
- `paper-muted` - Secondary text (#8BA3E6)
- `paper-divider` - Subtle lines (accent at 20% opacity)
- `paper-error/warning/success` - Semantic colors

### Chalk Animation Reference
See `/docs/design/` for advanced chalk effects:
- `chalk-animation-technique.md` - SVG stroke animation + chalk filter
- `chalk-loader-combined.html` - Interactive demo

### CSS Classes
```css
.chalk-frame           /* Border only, no filter (use for most containers) */
.chalk-frame-filtered  /* With SVG filter - affects ALL content inside! */
.chalk-frame-light     /* Subtle variant for nested elements */
```

### Important Notes
- SVG `filter: url(#chalk)` affects the entire element including children
- Only use `-filtered` variant on elements where wobbly content is OK
- Icons in `ChalkIcons.tsx` are clean (no filter) for readability
