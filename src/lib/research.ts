import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

// Vision-capable models for research
export const RESEARCH_MODELS = [
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', supportsVision: true },
  { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', supportsVision: true },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', supportsVision: false },
]

export const ORCHESTRATOR_MODEL = 'anthropic/claude-4-sonnet-20250522'
export const FOLLOWUP_MODEL = 'anthropic/claude-haiku-4.5'

export interface ResearchImage {
  base64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export interface ResearchRequest {
  query: string
  images?: ResearchImage[]
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
  webSources?: string[]
}

// Tavily web search
async function searchWeb(query: string): Promise<{ context: string; sources: string[] }> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.log('No TAVILY_API_KEY - skipping web search')
    return { context: '', sources: [] }
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    })

    if (!response.ok) {
      console.error('Tavily search failed:', response.status)
      return { context: '', sources: [] }
    }

    const data = await response.json()
    
    // Build context from results
    const sources: string[] = []
    let context = ''
    
    if (data.answer) {
      context += `Web Search Summary:\n${data.answer}\n\n`
    }
    
    if (data.results && data.results.length > 0) {
      context += 'Relevant Web Sources:\n'
      for (const result of data.results.slice(0, 5)) {
        context += `\n**${result.title}** (${result.url})\n${result.content}\n`
        sources.push(result.url)
      }
    }
    
    return { context, sources }
  } catch (error) {
    console.error('Tavily search error:', error)
    return { context: '', sources: [] }
  }
}

// System prompt with web search context
function buildSystemPrompt(webContext: string): string {
  const basePrompt = `You are an expert research assistant with deep knowledge across many domains.

GUIDELINES:
- Provide thorough, well-reasoned answers
- Be direct and confident - share what you know without excessive hedging
- Structure responses clearly with key points, examples, and reasoning
- Use markdown: ## headers, **bold** for key terms, bullet points

RESPONSE FORMAT:
- 400-600 words
- Lead with the most important information
- End with practical takeaways`

  if (webContext) {
    return `${basePrompt}

IMPORTANT: You have been provided with CURRENT WEB SEARCH RESULTS below. Use this real-time information to inform your response. Cite sources when relevant.

---
${webContext}
---

Integrate the above web research into your response where relevant.`
  }

  return basePrompt
}

export async function runResearch(request: ResearchRequest): Promise<ResearchResult> {
  const startTime = Date.now()
  const hasImages = request.images && request.images.length > 0

  // First, do web search to get current information
  const { context: webContext, sources: webSources } = await searchWeb(request.query)

  // Build messages based on whether we have images
  const buildMessages = (model: typeof RESEARCH_MODELS[0]) => {
    const systemPrompt = buildSystemPrompt(webContext)
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    if (hasImages && model.supportsVision) {
      const content: any[] = [
        { type: 'text', text: request.query }
      ]
      
      for (const img of request.images!) {
        content.push({
          type: 'image',
          image: `data:${img.mimeType};base64,${img.base64}`
        })
      }
      
      messages.push({ role: 'user', content })
    } else {
      let text = request.query
      if (hasImages && !model.supportsVision) {
        text = `[Note: This query includes ${request.images!.length} image(s) that this model cannot process.]\n\n${request.query}`
      }
      messages.push({ role: 'user', content: text })
    }

    return messages
  }

  // Query all models in parallel
  const responses = await Promise.all(
    RESEARCH_MODELS.map(async (model) => {
      const modelStart = Date.now()
      try {
        const result = await generateText({
          model: openrouter(model.id),
          messages: buildMessages(model),
          maxTokens: 2000,
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
      modelCount: RESEARCH_MODELS.length,
      successCount: 0,
      webSources
    }
  }

  // Synthesize responses
  const synthesisPrompt = `Synthesize these AI model responses to: "${request.query}"

${webContext ? `Web Search Context:\n${webContext}\n\n---\n\n` : ''}

${successful.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

Create a unified synthesis that:
1. Identifies key consensus points across models
2. Highlights notable disagreements or unique insights
3. Provides actionable takeaways
${webSources.length > 0 ? '4. Cites web sources where relevant' : ''}

Guidelines:
- Write 300-500 words
- Use markdown formatting
- Start directly with the synthesis
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
    modelCount: RESEARCH_MODELS.length,
    successCount: successful.length,
    webSources
  }
}

export async function runFollowUp(query: string, context?: string): Promise<string> {
  // Quick follow-ups can also benefit from web search
  const { context: webContext } = await searchWeb(query)
  
  const systemPrompt = webContext 
    ? `You are a helpful research assistant. Give concise, substantive answers.\n\nCurrent web info:\n${webContext}`
    : 'You are a helpful research assistant. Give concise, substantive answers.'

  const messages: any[] = [
    { role: 'system', content: systemPrompt }
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
