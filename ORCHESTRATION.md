# Eachie Orchestration Reference

How the research flow works, what each model sees, and the exact prompts used.

**Keep this updated** as the system evolves.

---

## Flow Diagram

```
User Query + Attachments
        │
        ▼
┌─────────────────────────────────────┐
│  CLARIFYING QUESTIONS (optional)    │
│  Model: Haiku 4.5                   │
│  Sees: Raw query only               │
│  Returns: 0-4 questions             │
└─────────────────────────────────────┘
        │
        ▼ (if user answers, appended to query)
        │
┌─────────────────────────────────────┐
│  PARALLEL RESEARCH (isolated)       │
│  Models: User's selection (max 8)   │
│  Each sees: Query + attachments     │
│  No awareness of other models       │
└─────────────────────────────────────┘
   │       │       │       │
   ▼       ▼       ▼       ▼
 Model1  Model2  Model3  Model4...
   │       │       │       │
   └───────┴───────┴───────┘
           │
           ▼
┌─────────────────────────────────────┐
│  ORCHESTRATOR SYNTHESIS             │
│  Model: User's choice (Sonnet, etc) │
│  Sees: ALL model responses          │
│  Creates: Unified synthesis         │
└─────────────────────────────────────┘
           │
           ▼
      Results to User
           │
           ▼ (if follow-up)
           │
┌─────────────────────────────────────┐
│  FOLLOW-UP RESEARCH                 │
│  Models see: Last 2 syntheses only  │
│  (NOT individual model responses)   │
│  + New follow-up question           │
└─────────────────────────────────────┘
```

---

## Exact Prompts

### Research Models (System Prompt)

All research models get this identical system prompt:

```
You are an expert research assistant with built-in web search.

GUIDELINES:
- Search the web for current information when relevant
- Provide thorough, well-reasoned answers with citations
- Be direct and confident - ground your response in facts
- Structure responses clearly

FORMAT:
- 400-600 words
- Use markdown: ## headers, **bold**, bullets
- Cite web sources when using current data
- End with practical takeaways
```

**Source:** `/src/lib/research.ts` lines 84-96

---

### Clarifying Questions (System Prompt)

Haiku 4.5 gets this prompt to generate clarifying questions:

```
You analyze research questions and generate 2-4 SPECIFIC clarifying questions that would significantly improve the research quality.

RULES:
1. Questions must be SPECIFIC to this exact query - no generic "what industry?" type questions
2. Focus on ambiguities, scope decisions, or important context missing from the query
3. If the query is already very clear and specific, return just 1-2 questions or empty array
4. Each question under 20 words
5. Ask about things that would change what information is relevant

EXAMPLES:

Query: "Best laptop for me"
Questions: ["Are you prioritizing portability or performance?", "What's your budget range?", "Any specific software you need to run?"]

Query: "How does photosynthesis work?"
Questions: [] (already specific, no clarification needed)

Query: "Compare React and Vue for my project"
Questions: ["Is this a new project or migrating existing code?", "What's your team's current experience with JS frameworks?"]

Query: "I need a tart, dairy free dessert for thanksgiving"
Questions: ["How many people are you serving?", "Any nut allergies to consider?", "Do you have a preferred level of difficulty?"]

Respond ONLY with a JSON array of question strings. Empty array if no clarification needed.
```

**Source:** `/app/api/clarify/route.ts` lines 29-52

---

### Orchestrator Synthesis (User Prompt Only - No System Prompt)

The orchestrator receives NO system prompt, just this user message:

```
Synthesize these AI model responses to: "[First 200 chars of query]"

### [Model 1 Name]
[Model 1 Full Response]

---

### [Model 2 Name]
[Model 2 Full Response]

---

[...all successful models...]

[Custom prompt OR default prompt below]
```

**Default Synthesis Prompt** (can be customized in Settings):
```
Create a synthesis that:
1. Identifies key consensus points
2. Highlights disagreements or unique insights
3. Provides actionable takeaways

Guidelines:
- 300-500 words, use markdown formatting
- Be substantive and specific
```

**Source:** `/src/lib/research.ts` lines 291-299, `/src/config/models.ts` DEFAULT_ORCHESTRATOR_PROMPT

---

### Follow-up Context (Prepended to User Query)

When user asks a follow-up, this context is prepended:

```
Context:
Research 1: "[Query 1, first 80 chars]"
Findings: [Synthesis 1, truncated to ~400 words]

---

Research 2: "[Query 2, first 80 chars]"
Findings: [Synthesis 2, truncated to ~400 words]

New question: [user's follow-up query]
```

**Key details:**
- Only last 2 research rounds included
- Only syntheses shown (not individual model responses)
- Truncated to ~400 words each

**Source:** `/app/page.tsx` lines 178-187, 260-261

---

## What Each Model Sees

| Stage | Model | Sees | Doesn't See |
|-------|-------|------|-------------|
| Clarifying | Haiku only | Raw query | Attachments, that it's for research |
| Research | Each model | Query + attachments, system prompt | Other models, ensemble context |
| Synthesis | Orchestrator | All model responses, truncated query | Clarifying Q&A, failed responses, metadata |
| Follow-up | Each model | Previous syntheses + new query | Previous individual responses, other models |

---

## Attachment Handling

| Type | Vision Models | Non-Vision Models |
|------|---------------|-------------------|
| Images | Base64 in content array | Note added: "[X image(s) attached but not visible]" |
| PDFs | Base64 file format | Base64 file format (OpenRouter handles) |
| Text files | Appended to query text | Appended to query text |

**Limits:**
- Max 4 attachments
- 20MB per file
- Max 12 models can be selected at once

---

## Model Configuration

### Reasoning Models

Some models have "thinking" capabilities with different config:

| Model | Reasoning Config |
|-------|------------------|
| Grok Fast | `reasoning: { enabled: true }` |
| o3 | `reasoning: { effort: 'high' }` |
| o3-mini | `reasoning: { effort: 'low' }` |

**Source:** `/src/lib/research.ts` lines 230-240

### Token Limits

| Stage | Max Tokens |
|-------|------------|
| Research models | 2500 |
| Orchestrator | 1500 |
| Clarifying | 400 |

---

## Key Files

| File | What It Does |
|------|--------------|
| `/src/lib/research.ts` | Core research logic, prompts, cost calculation |
| `/app/api/research/route.ts` | API endpoint, calls `runResearch()` |
| `/app/api/clarify/route.ts` | Clarifying questions endpoint |
| `/app/page.tsx` | UI, follow-up context building |
| `/src/config/models.ts` | Model definitions, defaults |
