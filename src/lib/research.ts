/**
 * Research Library - Core logic for multi-model AI research
 * 
 * Handles parallel model queries, synthesis, and cost tracking.
 * Supports BYOK mode where server keys are disabled.
 */

import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

// ============ Types ============

export interface ResearchImage {
  base64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export interface ResearchRequest {
  query: string
  images?: ResearchImage[]
  modelIds?: string[]
  orchestratorId?: string
  apiKey?: string
  byokMode?: boolean // When true, requires user API key
}

export interface ModelResponse {
  model: string
  modelId: string
  content: string
  success: boolean
  error?: string
  durationMs?: number
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  cost?: number
}

export interface ResearchResult {
  query: string
  responses: ModelResponse[]
  synthesis: string
  totalDurationMs: number
  modelCount: number
  successCount: number
  totalCost?: number
  timestamp?: string
  orchestrator?: string
}

// ============ Model Configuration ============

interface ModelConfig {
  id: string
  name: string
  description: string
  provider: string
  supportsVision: boolean
  cost: number // 0-5 relative cost indicator
  reasoning?: 'low' | 'high' | 'enabled' // Optional reasoning configuration
}

/**
 * All available models with thinking level variants.
 * Models with reasoning support have separate low/high entries.
 */
export const ALL_MODELS: ModelConfig[] = [
  // Anthropic
  { id: 'anthropic/claude-opus-4.5:online', name: 'Claude Opus 4.5', description: 'Top reasoning & writing', provider: 'Anthropic', supportsVision: true, cost: 5 },
  { id: 'anthropic/claude-sonnet-4.5:online', name: 'Claude Sonnet 4.5', description: 'Best all-rounder', provider: 'Anthropic', supportsVision: true, cost: 3 },
  { id: 'anthropic/claude-haiku-4.5:online', name: 'Claude Haiku 4.5', description: 'Fast & economical', provider: 'Anthropic', supportsVision: true, cost: 1 },
  
  // OpenAI - GPT-5.1 (single entry, high reasoning default)
  { id: 'openai/gpt-5.1:online', name: 'GPT-5.1', description: 'High reasoning depth', provider: 'OpenAI', supportsVision: true, cost: 4, reasoning: 'high' },
  
  // OpenAI - o3 variants
  { id: 'openai/o3:online', name: 'o3 (high)', description: 'Top reasoning model', provider: 'OpenAI', supportsVision: false, cost: 5, reasoning: 'high' },
  { id: 'openai/o3-mini:online', name: 'o3-mini (low)', description: 'STEM-focused, efficient', provider: 'OpenAI', supportsVision: false, cost: 2, reasoning: 'low' },
  
  // Google
  { id: 'google/gemini-3-pro-preview:online', name: 'Gemini 3 Pro', description: 'Top multimodal', provider: 'Google', supportsVision: true, cost: 3 },
  { id: 'google/gemini-2.5-pro:online', name: 'Gemini 2.5 Pro', description: 'High-end creative', provider: 'Google', supportsVision: true, cost: 3 },
  { id: 'google/gemini-2.5-flash:online', name: 'Gemini 2.5 Flash', description: 'Built-in thinking', provider: 'Google', supportsVision: true, cost: 1 },
  { id: 'google/gemini-2.0-flash:online', name: 'Gemini 2.0 Flash', description: 'Fastest & cheapest', provider: 'Google', supportsVision: true, cost: 0 },
  
  // Perplexity
  { id: 'perplexity/sonar-deep-research', name: 'Perplexity Deep', description: 'Exhaustive research', provider: 'Perplexity', supportsVision: false, cost: 3 },
  { id: 'perplexity/sonar-pro', name: 'Perplexity Sonar', description: 'Fast search-native', provider: 'Perplexity', supportsVision: false, cost: 2 },
  
  // X.AI - Grok Fast with reasoning enabled
  { id: 'x-ai/grok-4:online', name: 'Grok 4', description: 'Creative real-time', provider: 'X.AI', supportsVision: true, cost: 2 },
  { id: 'x-ai/grok-4.1-fast:online', name: 'Grok Fast (thinking)', description: 'Fast with reasoning', provider: 'X.AI', supportsVision: true, cost: 2, reasoning: 'enabled' },
  
  // Others
  { id: 'deepseek/deepseek-r1:online', name: 'DeepSeek R1', description: 'Open reasoning champ', provider: 'DeepSeek', supportsVision: false, cost: 1 },
  { id: 'qwen/qwen3-235b-a22b:online', name: 'Qwen3-Max', description: 'Multilingual creative', provider: 'Alibaba', supportsVision: false, cost: 2 },
  { id: 'moonshotai/kimi-k2:online', name: 'Kimi K2', description: 'Long-context master', provider: 'Moonshot', supportsVision: false, cost: 2 },
  { id: 'meta-llama/llama-4-maverick:online', name: 'Llama 4 Maverick', description: 'Open multimodal', provider: 'Meta', supportsVision: true, cost: 0 },
  { id: 'minimax/minimax-m1-80k:online', name: 'MiniMax M1', description: 'Extended context', provider: 'MiniMax', supportsVision: false, cost: 2 },
]

/** Default model selection for new users */
export const DEFAULT_MODELS = [
  'anthropic/claude-haiku-4.5:online',
  'google/gemini-2.5-flash:online',
  'deepseek/deepseek-r1:online',
]

/** Available orchestrator models for synthesis */
export const ORCHESTRATOR_MODELS = [
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Balanced & reliable' },
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', description: 'Maximum quality' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', description: 'Deep reasoning' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Multimodal synthesis' },
]

export const DEFAULT_ORCHESTRATOR = 'anthropic/claude-sonnet-4.5'

// ============ Pricing ============

/** Pricing per million tokens (input/output) - Nov 2025 rates */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-opus-4.5:online': { input: 15, output: 75 },
  'anthropic/claude-sonnet-4.5:online': { input: 3, output: 15 },
  'anthropic/claude-haiku-4.5:online': { input: 0.25, output: 1.25 },
  'openai/gpt-5.1:online': { input: 1.25, output: 10 },
  'openai/o3:online': { input: 10, output: 40 },
  'openai/o3-mini:online': { input: 0.75, output: 6 },
  'google/gemini-3-pro-preview:online': { input: 2.5, output: 10 },
  'google/gemini-2.5-pro:online': { input: 1.25, output: 5 },
  'google/gemini-2.5-flash:online': { input: 0.15, output: 0.60 },
  'google/gemini-2.0-flash:online': { input: 0.075, output: 0.30 },
  'perplexity/sonar-deep-research': { input: 3, output: 15 },
  'perplexity/sonar-pro': { input: 1, output: 5 },
  'x-ai/grok-4:online': { input: 1, output: 5 },
  'x-ai/grok-4.1-fast:online': { input: 0.5, output: 2 },
  'deepseek/deepseek-r1:online': { input: 0.20, output: 4.50 },
  'qwen/qwen3-235b-a22b:online': { input: 0.30, output: 1.49 },
  'moonshotai/kimi-k2:online': { input: 1, output: 5 },
  'meta-llama/llama-4-maverick:online': { input: 0, output: 0 },
  'minimax/minimax-m1-80k:online': { input: 0.50, output: 2 },
}

function calculateCost(modelId: string, usage?: ModelResponse['usage']): number {
  if (!usage) return 0
  const pricing = MODEL_PRICING[modelId]
  if (!pricing) return 0
  return (usage.promptTokens / 1_000_000) * pricing.input + 
         (usage.completionTokens / 1_000_000) * pricing.output
}

// ============ System Prompts ============

const RESEARCH_SYSTEM_PROMPT = `You are an expert research assistant with built-in web search.

GUIDELINES:
- Search the web for current information when relevant
- Provide thorough, well-reasoned answers with citations
- Be direct and confident - ground your response in facts
- Structure responses clearly

FORMAT:
- 400-600 words
- Use markdown: ## headers, **bold**, bullets
- Cite web sources when using current data
- End with practical takeaways`

// ============ Main Research Function ============

/**
 * Runs parallel research across multiple AI models and synthesizes results.
 * 
 * @param request - Research configuration including query, models, and API key
 * @returns Combined results from all models with synthesis
 */
export async function runResearch(request: ResearchRequest): Promise<ResearchResult> {
  const startTime = Date.now()
  
  // Validate API key in BYOK mode
  const apiKey = request.apiKey || (request.byokMode ? undefined : process.env.OPENROUTER_API_KEY)
  if (!apiKey) {
    throw new Error('API key required. Please add your OpenRouter key in Settings.')
  }
  
  const openrouter = createOpenRouter({ apiKey })
  const orchestratorId = request.orchestratorId || DEFAULT_ORCHESTRATOR
  const hasImages = request.images && request.images.length > 0
  
  // Get models to query
  const modelIds = request.modelIds?.length ? request.modelIds : DEFAULT_MODELS
  const models = modelIds
    .map(id => ALL_MODELS.find(m => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined)

  if (models.length === 0) {
    throw new Error('No valid models selected')
  }

  // Build messages for a model
  const buildMessages = (model: ModelConfig) => {
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

  // Query all models in parallel
  const responses = await Promise.all(
    models.map(async (model): Promise<ModelResponse> => {
      const modelStart = Date.now()
      try {
        const options: any = {
          model: openrouter(model.id),
          messages: buildMessages(model),
          maxTokens: 2500,
        }
        
        // Add reasoning configuration based on model type
        if (model.reasoning === 'enabled') {
          // Grok Fast: enable reasoning
          options.experimental_providerMetadata = {
            openrouter: { reasoning: { enabled: true } }
          }
        } else if (model.reasoning === 'low' || model.reasoning === 'high') {
          // OpenAI reasoning models: set effort level
          options.experimental_providerMetadata = {
            openrouter: { reasoning: { effort: model.reasoning } }
          }
        }

        const result = await generateText(options)
        
        const usage = result.usage ? {
          promptTokens: result.usage.promptTokens || 0,
          completionTokens: result.usage.completionTokens || 0,
          totalTokens: result.usage.totalTokens || 0,
        } : undefined
        
        return {
          model: model.name,
          modelId: model.id,
          content: result.text,
          success: true,
          durationMs: Date.now() - modelStart,
          usage,
          cost: calculateCost(model.id, usage)
        }
      } catch (error) {
        return {
          model: model.name,
          modelId: model.id,
          content: '',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - modelStart
        }
      }
    })
  )

  const successful = responses.filter(r => r.success)

  // Handle complete failure
  if (successful.length === 0) {
    return {
      query: request.query,
      responses,
      synthesis: 'All models failed to respond. Please check your API key and try again.',
      totalDurationMs: Date.now() - startTime,
      modelCount: models.length,
      successCount: 0,
      timestamp: new Date().toISOString(),
      orchestrator: orchestratorId
    }
  }

  // Synthesize successful responses
  const synthesisPrompt = `Synthesize these AI model responses to: "${request.query.slice(0, 200)}"

${successful.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

Create a synthesis that:
1. Identifies key consensus points
2. Highlights disagreements or unique insights  
3. Provides actionable takeaways

Guidelines:
- 300-500 words, use markdown formatting
- Be substantive and specific`

  const orchestratorOptions: any = {
    model: openrouter(orchestratorId),
    messages: [{ role: 'user', content: synthesisPrompt }],
    maxTokens: 1500,
  }

  const synthesisResult = await generateText(orchestratorOptions)
  const orchestratorName = ORCHESTRATOR_MODELS.find(o => o.id === orchestratorId)?.name || orchestratorId
  
  return {
    query: request.query,
    responses,
    synthesis: synthesisResult.text,
    totalDurationMs: Date.now() - startTime,
    modelCount: models.length,
    successCount: successful.length,
    totalCost: responses.reduce((sum, r) => sum + (r.cost || 0), 0),
    timestamp: new Date().toISOString(),
    orchestrator: orchestratorName
  }
}
