# 🔬 Research Agent

A multi-model AI research assistant that lives in Slack. Ask a question, get synthesized insights from Claude, GPT, and Gemini.

## Features

- **Multi-model queries**: Asks Claude Sonnet 4, GPT-4o, and Gemini 2.0 Flash in parallel
- **Smart synthesis**: Claude synthesizes all responses into actionable insights  
- **Follow-up conversations**: Reply in threads for quick follow-ups (uses Haiku for speed)
- **Durable workflows**: Uses Vercel Workflow DevKit for reliability

## Setup

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From an app manifest**
3. Select your workspace
4. Paste the contents of `SLACK-APP-MANIFEST.yaml`
5. Click **Create**
6. Go to **Install App** and install to your workspace

### 2. Get Slack Credentials

After creating the app, collect these values:

- **Bot Token**: Settings → Install App → Bot User OAuth Token (`xoxb-...`)
- **Signing Secret**: Settings → Basic Information → Signing Secret
- **App Token**: Settings → Basic Information → App-Level Tokens → Create one with `connections:write` scope (`xapp-...`)

### 3. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/research-agent)

Or via CLI:
```bash
vercel
```

### 4. Set Environment Variables

In Vercel dashboard (or `.env.local` for local dev):

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key
```

### 5. Update Slack App URLs

After deploying, go back to your Slack app settings:
1. **Event Subscriptions** → Update Request URL to `https://your-app.vercel.app/api/slack`
2. **Interactivity** → Update Request URL to same

## Usage

In Slack:
```
@ResearchBot What are the tradeoffs between REST and GraphQL APIs?
```

Reply in the thread for follow-up questions.

## Local Development

```bash
npm install
npm run dev
```

Use ngrok to expose localhost for Slack webhooks:
```bash
ngrok http 3000
```

Update Slack app URLs to ngrok URL.
