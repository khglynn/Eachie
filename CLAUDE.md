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
| **Canny** | Feature requests | Planned |

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
