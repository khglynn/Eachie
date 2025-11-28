# AI Research Agent

Multi-model AI research tool with web search, model selection, and downloadable results.

## Live URL

https://reachbot.vercel.app

## Features

- **Model Selection** - Choose up to 5 from 13 AI models
- **Web Search** - All models have internet access via `:online` suffix
- **Quick & Deep Modes** - 3-7 models depending on depth needed
- **Follow-up Research** - Continue conversations with auto-compacted context
- **Mobile-Friendly** - Responsive design, works great on phones
- **Dark Mode** - Automatic via system preferences
- **Download Results** - Export as Obsidian-formatted zip

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Environment Variables

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

Get your API key from https://openrouter.ai

## Deploy

Push to `main` branch - Vercel auto-deploys.

## Architecture

- **Next.js 15** with App Router
- **OpenRouter** for unified model access (400+ models)
- **Vercel AI SDK** for streaming and structured outputs
- **TailwindCSS** with dark mode support

## Model Categories

| Category | Models | Use Case |
|----------|--------|----------|
| 🏆 **Flagship** | Claude Sonnet/Opus, GPT-5.1, Gemini 3 Pro | Best all-around, thorough analysis |
| ⚡ **Fast** | Claude Haiku, Gemini Flash, Llama 4 | Quick answers, daily use |
| 🧠 **Reasoning** | DeepSeek R1, Kimi K2, Perplexity Deep | Complex problem-solving |
| 🎯 **Grounding** | GPT-5.1 Codex, Grok 4.1 | Precise instruction-following |
| 🔍 **Search** | Perplexity Sonar Pro | Native web search with citations |

## Cost

~$0.16 for quick research (3 models), ~$2.14 for deep (7 models) including web search.

## License

MIT
