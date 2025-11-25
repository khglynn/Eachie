import { workflow } from '@vercel/workflow'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

interface ResearchInput {
  question: string
  channelId: string
  threadTs: string
  userId: string
}

interface ModelResponse {
  model: string
  content: string
  duration: number
  error?: string
}

interface ResearchResult {
  id: string
  question: string
  responses: ModelResponse[]
  synthesis: string
  models: string[]
  duration: number
}

// Define the models to query
const RESEARCH_MODELS = [
  { id: 'claude', provider: anthropic, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'gpt', provider: openai, model: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gemini', provider: google, model: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
]

export const startResearchWorkflow = workflow<ResearchInput, ResearchResult>(
  'research-workflow',
  async (input) => {
    "use workflow"
    
    const startTime = Date.now()
    
    // Query all models in parallel
    const responses = await Promise.all(
      RESEARCH_MODELS.map(async (modelConfig) => {
        const modelStart = Date.now()
        try {
          const result = await generateText({
            model: modelConfig.provider(modelConfig.model),
            messages: [
              {
                role: 'system',
                content: `You are an expert research assistant. Provide a thorough, well-reasoned answer to the question. 
Include relevant facts, multiple perspectives where applicable, and cite any important caveats.
Be concise but comprehensive. Use markdown formatting.`
              },
              { role: 'user', content: input.question }
            ],
            maxTokens: 2000,
            temperature: 0.7,
          })
          
          return {
            model: modelConfig.name,
            content: result.text,
            duration: (Date.now() - modelStart) / 1000,
          }
        } catch (error) {
          return {
            model: modelConfig.name,
            content: '',
            duration: (Date.now() - modelStart) / 1000,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    // Filter successful responses
    const successfulResponses = responses.filter(r => !r.error && r.content)
    
    if (successfulResponses.length === 0) {
      throw new Error('All models failed to respond')
    }

    // Synthesize responses using Claude
    const synthesisPrompt = `You are synthesizing research from multiple AI models.

QUESTION: ${input.question}

RESPONSES:
${successfulResponses.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

Create a unified synthesis that:
1. Identifies key themes and consensus points
2. Notes any significant disagreements between models
3. Highlights the most actionable insights
4. Is concise (max 500 words) but comprehensive

Format with markdown. Start with the synthesis directly, no preamble.`

    const synthesis = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: [{ role: 'user', content: synthesisPrompt }],
      maxTokens: 1500,
      temperature: 0.5,
    })

    return {
      id: `research-${Date.now()}`,
      question: input.question,
      responses: successfulResponses,
      synthesis: synthesis.text,
      models: successfulResponses.map(r => r.model),
      duration: (Date.now() - startTime) / 1000,
    }
  }
)
