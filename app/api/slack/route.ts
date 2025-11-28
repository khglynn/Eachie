import { NextRequest, NextResponse } from 'next/server'
import { slack, verifySlackRequest } from '@/lib/slack'
import { runResearch, runFollowUp, ResearchImage, RESEARCH_MODELS } from '@/lib/research'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const maxDuration = 60

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

// Simple in-memory store for pending clarifications (keyed by thread_ts)
// In production, use Redis or similar
const pendingClarifications = new Map<string, {
  query: string
  images: ResearchImage[]
  questions: string[]
  channel: string
  expiresAt: number
}>()

// Clean up old entries periodically
function cleanupPending() {
  const now = Date.now()
  for (const [key, value] of pendingClarifications.entries()) {
    if (value.expiresAt < now) pendingClarifications.delete(key)
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-slack-signature')
  const timestamp = request.headers.get('x-slack-request-timestamp')

  if (process.env.NODE_ENV === 'production') {
    if (!verifySlackRequest(signature, timestamp, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const payload = JSON.parse(body)

  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  if (payload.type === 'event_callback') {
    const event = payload.event

    if (event.bot_id) {
      return NextResponse.json({ ok: true })
    }

    if (event.type === 'app_mention') {
      processAppMention(event).catch(console.error)
      return NextResponse.json({ ok: true })
    }

    if (event.type === 'message' && event.thread_ts && !event.bot_id) {
      processThreadReply(event).catch(console.error)
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ ok: true })
}

async function downloadSlackImage(file: any): Promise<ResearchImage | null> {
  try {
    const response = await fetch(file.url_private_download || file.url_private, {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    })
    
    if (!response.ok) {
      console.error('Failed to download image:', response.status)
      return null
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    
    let mimeType: ResearchImage['mimeType'] = 'image/jpeg'
    if (file.mimetype === 'image/png') mimeType = 'image/png'
    else if (file.mimetype === 'image/gif') mimeType = 'image/gif'
    else if (file.mimetype === 'image/webp') mimeType = 'image/webp'

    return { base64, mimeType }
  } catch (error) {
    console.error('Error downloading Slack image:', error)
    return null
  }
}

async function getClarifyingQuestions(query: string): Promise<string[]> {
  try {
    const result = await generateText({
      model: openrouter('anthropic/claude-haiku-4.5'),
      messages: [
        {
          role: 'system',
          content: `Generate 2-3 SHORT clarifying questions for this research query. Questions should be under 12 words each. Focus on scope, timeframe, or specific aspects. Return ONLY a JSON array of strings.`
        },
        { role: 'user', content: query }
      ],
      maxTokens: 200,
    })

    const match = result.text.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0]).slice(0, 3)
    }
    return []
  } catch {
    return []
  }
}

async function processAppMention(event: any) {
  cleanupPending()
  
  const text = event.text.replace(/<@[A-Z0-9]+>/gi, '').trim()
  const channel = event.channel
  const threadTs = event.ts

  if (!text && (!event.files || event.files.length === 0)) {
    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: "Hi! Ask me a research question and I'll query multiple AI models with web search.\n\nExamples:\n• `@ResearchBot What are the pros and cons of serverless?`\n• Upload an image and ask me to analyze it!"
    })
    return
  }

  // Download images if present
  const images: ResearchImage[] = []
  if (event.files && event.files.length > 0) {
    const imageFiles = event.files.filter((f: any) => 
      f.mimetype?.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.mimetype)
    )
    
    for (const file of imageFiles.slice(0, 4)) {
      const img = await downloadSlackImage(file)
      if (img) images.push(img)
    }
  }

  const hasImages = images.length > 0
  const queryText = text || (hasImages ? 'What is in this image? Describe and analyze it.' : '')

  // Get clarifying questions
  const questions = await getClarifyingQuestions(queryText)

  if (questions.length > 0) {
    // Store pending clarification
    pendingClarifications.set(threadTs, {
      query: queryText,
      images,
      questions,
      channel,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    })

    // Send clarifying questions
    const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `💬 A few quick questions to help focus the research:\n\n${questionList}\n\n_Reply in this thread with any context, or say "skip" to proceed without._`
    })
    return
  }

  // No clarifying questions needed, proceed directly
  await runAndPostResearch(channel, threadTs, queryText, images)
}

async function processThreadReply(event: any) {
  const threadTs = event.thread_ts
  const pending = pendingClarifications.get(threadTs)

  if (pending) {
    // This is a reply to clarifying questions
    const userAnswer = event.text.toLowerCase()
    
    if (userAnswer === 'skip' || userAnswer === 'skip questions') {
      // Proceed without additional context
      pendingClarifications.delete(threadTs)
      await runAndPostResearch(pending.channel, threadTs, pending.query, pending.images)
      return
    }

    // Enhance query with user's context
    const enhancedQuery = `${pending.query}\n\n---\nAdditional context: ${event.text}`
    pendingClarifications.delete(threadTs)
    
    await slack.chat.postMessage({
      channel: pending.channel,
      thread_ts: threadTs,
      text: `👍 Thanks! Starting research with your context...`
    })
    
    await runAndPostResearch(pending.channel, threadTs, enhancedQuery, pending.images)
    return
  }

  // Regular follow-up in a research thread
  try {
    const result = await runFollowUp(event.text)
    await slack.chat.postMessage({
      channel: event.channel,
      thread_ts: threadTs,
      text: result
    })
  } catch (error) {
    await slack.chat.postMessage({
      channel: event.channel,
      thread_ts: threadTs,
      text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

async function runAndPostResearch(channel: string, threadTs: string, query: string, images: ResearchImage[]) {
  const hasImages = images.length > 0

  await slack.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `🔬 Researching: "${query.substring(0, 80)}${query.length > 80 ? '...' : ''}"${hasImages ? ` (with ${images.length} image${images.length > 1 ? 's' : ''})` : ''}\n\nQuerying ${RESEARCH_MODELS.length} models with web search...`
  })

  try {
    const result = await runResearch({
      query,
      images: hasImages ? images : undefined
    })

    const duration = (result.totalDurationMs / 1000).toFixed(1)
    const modelsUsed = result.responses.filter(r => r.success).map(r => r.model).join(', ')
    
    const contextElements: Array<{ type: 'mrkdwn'; text: string }> = [
      { type: 'mrkdwn', text: `*Models:* ${modelsUsed}` },
      { type: 'mrkdwn', text: `*Time:* ${duration}s` }
    ]
    
    if (hasImages) {
      contextElements.push({ type: 'mrkdwn', text: `*Images:* ${images.length}` })
    }

    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: result.synthesis,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '🔬 Research Complete', emoji: true } },
        { type: 'section', text: { type: 'mrkdwn', text: result.synthesis.substring(0, 2900) } },
        { type: 'divider' },
        { type: 'context', elements: contextElements }
      ]
    })
  } catch (error) {
    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `❌ Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}
