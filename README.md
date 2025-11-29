# Eachie 🔬

Multi-model AI research orchestrator. Query multiple AI models simultaneously, get synthesized insights with web search capabilities.

## Features

- **19 AI Models** - Claude, GPT, o3, Gemini, Perplexity, Grok, DeepSeek, and more
- **Thinking Level Control** - GPT-5.1, o3, and Grok Fast with configurable reasoning depth
- **Web Search** - All models have built-in search via Exa
- **Voice Input** - Transcribe queries with OpenAI/Deepgram/Groq Whisper
- **Image Support** - Up to 4 images for visual context
- **Cost Tracking** - Real-time cost monitoring per model and session
- **Markdown Export** - Download as ZIP with Obsidian-ready markdown files
- **BYOK Mode** - Share with friends using `?byok=true` parameter

## Getting Started

### Requirements

- OpenRouter API key (required)
- Optional: OpenAI/Deepgram/Groq for voice transcription
- Vercel Pro for extended timeouts (800s for deep research)

### Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-...  # Required for all models
OPENAI_API_KEY=sk-...         # Optional, for voice
DEEPGRAM_API_KEY=...          # Optional, for voice
GROQ_API_KEY=gsk_...          # Optional, for voice
```

### Development

```bash
npm install
npm run dev
```

### Deployment

Deployed on Vercel with Fluid Compute enabled.

**For personal use:** Deploy with environment variables configured.
**For sharing:** Share `your-url.vercel.app?byok=true` - requires users to add their own API keys.

## Model Selection

Models organized by provider with cost indicators ($-$$$$):
- **Anthropic** - Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
- **OpenAI** - GPT-5.1 (high), o3 (high), o3-mini (low)
- **Google** - Gemini 3 Pro, 2.5 Pro, 2.5 Flash, 2.0 Flash
- **Perplexity** - Deep Research, Sonar Pro
- **X.AI** - Grok 4, Grok Fast (thinking)
- **Others** - DeepSeek R1, Qwen3-Max, Kimi K2, Llama 4, MiniMax M1

Select up to 8 models per query.

## Architecture

- **Frontend:** Next.js 15, React 19, TailwindCSS
- **Backend:** Vercel Serverless Functions with Fluid Compute
- **AI SDK:** Vercel AI SDK with OpenRouter provider
- **Storage:** localStorage for settings, ZIP downloads for exports

## License

MIT
