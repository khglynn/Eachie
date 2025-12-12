# Model Customization + Public Model Table

**Created:** December 12, 2024
**Roadmap Item:** #6

---

## Goal

Let users customize their model selection while also publishing an enriched model comparison table as a free SEO/AEO resource.

---

## Part 1: Enriched Model Data

### Data Sources

| Source | What We Get |
|--------|-------------|
| **OpenRouter API** | id, name, description, context_length, pricing, modalities, supported_parameters |
| **Our `model_calls` table** | Avg latency, success rate, tokens/response (from real usage) |
| **Manual curation** | Category tags, use-case fit, quality notes |

### Enriched Schema

Extend `dim_models` or create `enriched_models` view:

```sql
-- New columns to add
ALTER TABLE dim_models ADD COLUMN IF NOT EXISTS
  avg_latency_ms INTEGER,           -- From our model_calls
  success_rate DECIMAL(5,2),        -- From our model_calls
  context_length INTEGER,           -- From OpenRouter
  input_modalities TEXT[],          -- ['text', 'image', 'file']
  output_modalities TEXT[],         -- ['text']
  supported_features TEXT[],        -- ['tools', 'reasoning', 'structured_outputs']
  category VARCHAR(50),             -- 'general', 'coding', 'creative', 'fast', 'reasoning'
  use_cases TEXT[],                 -- ['research', 'chat', 'analysis']
  quality_tier VARCHAR(20),         -- 'frontier', 'strong', 'fast', 'budget'
  last_enriched_at TIMESTAMP;
```

### Sync Jobs

1. **OpenRouter Sync** (daily) - Pull latest model data
2. **Usage Stats Sync** (hourly) - Update latency/success from `model_calls`
3. **Manual Enrichment** - Admin UI or CSV import for curation

---

## Part 2: Public Model Table (SEO/AEO)

### Page: `/models`

Public, SEO-optimized page showing all models with:

**Features:**
- Filterable/sortable table
- Compare mode (select 2-4 models)
- Individual model detail pages (`/models/[id]`)
- Pricing calculator
- Real usage stats badge ("Based on X,XXX queries")

**SEO Elements:**
- Schema.org structured data (Product/SoftwareApplication)
- Meta descriptions per model
- Canonical URLs
- Sitemap inclusion

**AEO (Answer Engine Optimization):**
- FAQ sections ("Which model is best for coding?")
- Comparison snippets
- "Best for X" quick answers
- Stats that AI can cite

### API: `/api/models`

Public endpoint for programmatic access:

```typescript
GET /api/models
// Returns all enriched model data

GET /api/models/[id]
// Returns single model with full details

GET /api/models/compare?ids=model1,model2
// Side-by-side comparison data
```

---

## Part 3: User Customization

### Settings Integration

In user settings:
- Browse all models (links to `/models`)
- Add/remove from personal selection
- Set default models
- Set default orchestrator
- Save to account (synced) or localStorage (BYOK)

### UI Components

| Component | Purpose |
|-----------|---------|
| `ModelBrowser.tsx` | Full model listing with filters |
| `ModelCard.tsx` | Individual model display |
| `ModelSelector.tsx` | Compact picker for settings |
| `ModelComparison.tsx` | Side-by-side view |

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/models/page.tsx` | Public model table |
| `app/models/[id]/page.tsx` | Model detail page |
| `app/api/models/route.ts` | Public models API |
| `app/api/models/[id]/route.ts` | Single model API |
| `app/api/cron/sync-models/route.ts` | OpenRouter sync job |
| `app/api/cron/enrich-stats/route.ts` | Usage stats enrichment |
| `src/components/models/ModelBrowser.tsx` | Model browser |
| `src/components/models/ModelCard.tsx` | Model card |
| `src/components/models/ModelComparison.tsx` | Comparison view |
| `src/server/queries/models.ts` | Model data queries |

---

## Execution Order

1. Extend `dim_models` schema with enrichment columns
2. Create OpenRouter sync job
3. Create usage stats enrichment job
4. Build `/api/models` endpoints
5. Build `/models` public page with SEO
6. Add model browser to settings
7. Add compare mode
8. Add individual model pages

---

## SEO Targets

| Query Pattern | Target Page |
|---------------|-------------|
| "best ai models for research" | `/models` with filter |
| "claude vs gpt comparison" | `/models/compare?...` |
| "openrouter model list" | `/models` |
| "[model name] pricing" | `/models/[id]` |
| "cheapest ai model for [use case]" | `/models` sorted by price |

---

## Success Metrics

- Organic traffic to `/models`
- API usage (developers using our enriched data)
- Model customization adoption (% of users who modify defaults)
- Backlinks from "best AI models" articles
