import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

// Model configurations
const QUICK_MODELS = [
  { id: 'anthropic/claude-haiku-4.5:online', name: 'Claude Haiku 4.5', supportsVision: true },
  { id: 'google/gemini-2.5-flash-preview-05-20:online', name: 'Gemini 2.5 Flash', supportsVision: true },
  { id: 'deepseek/deepseek-r1:online', name: 'DeepSeek R1', supportsVision: false },
]

const DEEP_MODELS = [
  { id: 'anthropic/claude-opus-4.5:online', name: 'Claude Opus 4.5', supportsVision: true },
  { id: 'anthropic/claude-4-sonnet-20250522:online', name: 'Claude Sonnet 4', supportsVision: true },
  { id: 'openai/gpt-5.1:online', name: 'GPT-5.1', supportsVision: true },
  { id: 'google/gemini-3-pro-preview:online', name: 'Gemini 3 Pro', supportsVision: true },
  { id: 'moonshotai/kimi-k2-thinking:online', name: 'Kimi K2', supportsVision: false },
  { id: 'perplexity/sonar-deep-research', name: 'Perplexity Deep', supportsVision: false },
  { id: 'deepseek/deepseek-r1:online', name: 'DeepSeek R1', supportsVision: false },
]

export const ORCHESTRATOR_MODEL = 'anthropic/claude-4-sonnet-20250522'
export const FOLLOWUP_MODEL = 'anthropic/claude-haiku-4.5:online'

export interface ResearchImage {
  base64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export interface ResearchRequest {
  query: string
  images?: ResearchImage[]
  mode?: 'quick' | 'deep'
}

export interface ModelResponse {
  model: string
  content: string
  success: boolean
  error?: string
  durationMs?: number
}

export interface ResearchResult {
  query: string
  responses: ModelResponse[]
  synthesis: string
  totalDurationMs: number
  modelCount: number
  successCount: number
}

const RESEARCH_SYSTEM_PROMPT = `You are an expert research assistant with built-in web search.

GUIDELINES:
- Search the web for current information when relevant
- Provide thorough, well-reasoned answers with citations
- Be direct and confident
- Structure responses clearly

FORMAT:
- 400-600 words
- Use markdown: ## headers, **bold**, bullets
- Cite sources when using web data
- End with practical takeaways`

export async function runResearch(request: ResearchRequest): Promise<ResearchResult> {
  const startTime = Date.now()
  const hasImages = request.images && request.images.length > 0
  const models = request.mode === 'deep' ? DEEP_MODELS : QUICK_MODELS

  const buildMessages = (model: typeof models[0]) => {
    const messages: any[] = [{ role: 'system', content: RESEARCH_SYSTEM_PROMPT }]

    if (hasImages && model.supportsVision) {
      const content: any[] = [{ type: 'text', text: request.query }]
      for (const img of request.images!) {
        content.push({ type: 'image', image: `data:${img.mimeType};base64,${img.base64}` })
      }
      messages.push({ role: 'user', content })
    } else {
      let text = request.query
      if (hasImages && !model.supportsVision) {
        text = `[Note: ${request.images!.length} image(s) attached but not visible to this model]\n\n${request.query}`
      }
      messages.push({ role: 'user', content: text })
    }
    return messages
  }

  const responses = await Promise.all(
    models.map(async (model) => {
      const modelStart = Date.now()
      try {
        const result = await generateText({
          model: openrouter(model.id),
          messages: buildMessages(model),
          maxTokens: request.mode === 'deep' ? 3000 : 2000,
        })
        return {
          model: model.name,
          content: result.text,
          success: true,
          durationMs: Date.now() - modelStart
        }
      } catch (error) {
        return {
          model: model.name,
          content: '',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - modelStart
        }
      }
    })
  )

  const successful = responses.filter(r => r.success)

  if (successful.length === 0) {
    return {
      query: request.query,
      responses,
      synthesis: 'All models failed to respond. Please try again.',
      totalDurationMs: Date.now() - startTime,
      modelCount: models.length,
      successCount: 0
    }
  }

  const synthesisPrompt = `Synthesize these AI model responses to: "${request.query.slice(0, 200)}"

${successful.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

Create a synthesis that:
1. Identifies key consensus points
2. Highlights disagreements or unique insights
3. Provides actionable takeaways

Guidelines:
- 300-500 words
- Use markdown formatting
- Be substantive and specific`

  const synthesisResult = await generateText({
    model: openrouter(ORCHESTRATOR_MODEL),
    messages: [{ role: 'user', content: synthesisPrompt }],
    maxTokens: 1500,
  })

  return {
    query: request.query,
    responses,
    synthesis: synthesisResult.text,
    totalDurationMs: Date.now() - startTime,
    modelCount: models.length,
    successCount: successful.length
  }
}

export async function runFollowUp(query: string, context?: string): Promise<string> {
  const messages: any[] = [
    { role: 'system', content: 'You are a helpful research assistant with web search. Give concise, substantive answers.' }
  ]
  if (context) {
    messages.push({ role: 'assistant', content: context })
  }
  messages.push({ role: 'user', content: query })

  const result = await generateText({
    model: openrouter(FOLLOWUP_MODEL),
    messages,
    maxTokens: 1000,
  })

  return result.text
}

// Export for UI display
export const RESEARCH_MODELS = QUICK_MODELS
