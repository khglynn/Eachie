# AI Research Agent

Multi-model AI research tool that queries several LLMs in parallel with web search, synthesizes responses, and provides downloadable results.

## Features

- **Multi-model parallel queries** - Query 3-7 AI models simultaneously
- **Built-in web search** - All models have internet access via OpenRouter's `:online` suffix
- **Model selection** - Choose which models to include (up to 5)
- **Quick & Deep modes** - Fast answers or thorough research
- **Follow-up research** - Continue conversations with context compaction
- **Download results** - Export as Obsidian-formatted zip

## Live URL

https://reachbot.vercel.app

## Local Development

```bash
npm install
npm run dev
```

## Environment Variables

```
OPENROUTER_API_KEY=sk-or-v1-...
```

## Deploy

Push to main branch - Vercel auto-deploys.

## Models Available

### Flagships
- Claude Sonnet 4, Claude Opus 4.5
- GPT-5.1, GPT-5.1-Codex
- Gemini 3 Pro

### Fast & Economical  
- Claude Haiku 4.5
- Gemini 2.5 Flash
- Llama 4 Maverick

### Reasoning Specialists
- DeepSeek R1
- Kimi K2 Thinking
- Perplexity Deep Research

### Grounding/Instruction-Following
- GPT-5.1-Codex (optimized for steerability)
- Grok 4.1
