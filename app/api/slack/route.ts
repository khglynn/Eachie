import { NextRequest, NextResponse } from 'next/server'
import { slack, verifySlackRequest } from '@/lib/slack'
import { runResearch, runFollowUp, ResearchImage, RESEARCH_MODELS } from '@/lib/research'

export const maxDuration = 60

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
      processFollowUp(event).catch(console.error)
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

async function processAppMention(event: any) {
  const text = event.text.replace(/<@[A-Z0-9]+>/gi, '').trim()
  const channel = event.channel
  const threadTs = event.ts

  if (!text && (!event.files || event.files.length === 0)) {
    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: "Hi! Ask me a research question and I'll query multiple AI models.\n\nExamples:\n• `@ResearchBot What are the pros and cons of serverless?`\n• Upload an image and ask me to analyze it!"
    })
    return
  }

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

  await slack.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `🔬 Researching: "${queryText.substring(0, 80)}${queryText.length > 80 ? '...' : ''}"${hasImages ? ` (with ${images.length} image${images.length > 1 ? 's' : ''})` : ''}\n\nQuerying ${RESEARCH_MODELS.length} models in parallel...`
  })

  try {
    const result = await runResearch({
      query: queryText,
      images: hasImages ? images : undefined
    })

    const duration = (result.totalDurationMs / 1000).toFixed(1)
    const modelsUsed = result.responses.filter(r => r.success).map(r => r.model).join(', ')
    
    // Build context elements without spread to avoid TS error
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

async function processFollowUp(event: any) {
  const channel = event.channel
  const threadTs = event.thread_ts

  try {
    const result = await runFollowUp(event.text)

    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: result
    })
  } catch (error) {
    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}
