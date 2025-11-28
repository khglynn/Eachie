import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const result = await generateText({
      model: openrouter('anthropic/claude-haiku-4.5'),
      messages: [
        {
          role: 'system',
          content: `You generate clarifying questions to help improve research queries.

Given a research query, generate 2-4 brief clarifying questions that would help narrow down or improve the research.

IMPORTANT:
- Only ask questions if they would genuinely improve the research quality
- Focus on: scope, timeframe, specific aspects, use case, context
- Keep questions SHORT (under 15 words each)
- If the query is already clear and specific, return fewer questions (or even just 1)

Respond with a JSON array of question strings, nothing else.
Example: ["What industry or domain?", "Are you looking for free or paid options?", "What's your timeline?"]`
        },
        {
          role: 'user',
          content: query
        }
      ],
      maxTokens: 300,
    })

    // Parse the JSON array from the response
    let questions: string[] = []
    try {
      // Try to extract JSON array from the response
      const match = result.text.match(/\[[\s\S]*\]/)
      if (match) {
        questions = JSON.parse(match[0])
      }
    } catch {
      // If parsing fails, split by newlines and clean up
      questions = result.text
        .split('\n')
        .map(line => line.replace(/^[\d\.\-\*]+\s*/, '').trim())
        .filter(line => line.length > 0 && line.endsWith('?'))
        .slice(0, 4)
    }

    // Ensure we have at least 2 questions, max 4
    if (questions.length < 2) {
      questions = [
        "What specific aspect are you most interested in?",
        "Is there a particular use case or context?"
      ]
    }

    return NextResponse.json({ questions: questions.slice(0, 4) })
  } catch (error) {
    console.error('Clarify API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate clarifying questions' },
      { status: 500 }
    )
  }
}
