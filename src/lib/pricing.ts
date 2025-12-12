/**
 * Pricing Configuration - Single Source of Truth
 *
 * Consolidates all model pricing data. Import this file wherever
 * cost calculation is needed instead of duplicating the pricing map.
 *
 * @module lib/pricing
 */

// ============================================================
// BUSINESS MODEL
// Eachie charges a 1.5% margin on API costs for paid users.
// BYOK users pay OpenRouter directly (no margin for us).
// ============================================================

export const EACHIE_MARGIN = 0.015 // 1.5%

/**
 * Calculate what we charge the user (raw cost + our margin).
 * Use this for paid users only. BYOK users don't pay us.
 */
export function calculateUserCharge(rawCost: number): number {
  return rawCost * (1 + EACHIE_MARGIN)
}

// ============================================================
// PRICING DATA
// Rates per million tokens (input/output) - Dec 2024
// Update this single file when pricing changes.
// ============================================================

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'anthropic/claude-opus-4.5:online': { input: 15, output: 75 },
  'anthropic/claude-sonnet-4.5:online': { input: 3, output: 15 },
  'anthropic/claude-haiku-4.5:online': { input: 0.25, output: 1.25 },

  // OpenAI
  'openai/gpt-5.1:online': { input: 1.25, output: 10 },
  'openai/o3:online': { input: 10, output: 40 },
  'openai/o3-mini:online': { input: 0.75, output: 6 },

  // Google
  'google/gemini-3-pro-preview:online': { input: 2.5, output: 10 },
  'google/gemini-2.5-pro:online': { input: 1.25, output: 5 },
  'google/gemini-2.5-flash:online': { input: 0.15, output: 0.6 },
  'google/gemini-2.0-flash:online': { input: 0.075, output: 0.3 },

  // Perplexity
  'perplexity/sonar-deep-research': { input: 3, output: 15 },
  'perplexity/sonar-pro': { input: 1, output: 5 },

  // xAI
  'x-ai/grok-4:online': { input: 1, output: 5 },
  'x-ai/grok-4.1-fast': { input: 0.5, output: 2 },

  // DeepSeek
  'deepseek/deepseek-r1:online': { input: 0.2, output: 4.5 },

  // Other
  'qwen/qwen3-235b-a22b:online': { input: 0.3, output: 1.49 },
  'moonshotai/kimi-k2:online': { input: 1, output: 5 },
  'meta-llama/llama-4-maverick:online': { input: 0, output: 0 },
  'minimax/minimax-m1': { input: 0.4, output: 2.2 },
}

/**
 * Calculates cost for a model query based on token usage.
 *
 * @param modelId - OpenRouter model ID
 * @param usage - Token usage from the response
 * @returns Cost in USD
 *
 * @example
 * const cost = calculateCost('anthropic/claude-haiku-4.5:online', {
 *   promptTokens: 1000,
 *   completionTokens: 500
 * })
 * // Returns ~0.00087 USD
 */
/**
 * Get pricing for a model (null if unknown).
 * Used internally and for cost estimation.
 */
export function findModelPricing(modelId: string): { input: number; output: number } | null {
  return MODEL_PRICING[modelId] || null
}

/**
 * Calculates cost for a model query based on token usage.
 *
 * @param modelId - OpenRouter model ID
 * @param usage - Token usage from the response
 * @returns Cost in USD
 *
 * @example
 * const cost = calculateCost('anthropic/claude-haiku-4.5:online', {
 *   promptTokens: 1000,
 *   completionTokens: 500
 * })
 * // Returns ~0.00087 USD
 */
export function calculateCost(
  modelId: string,
  usage?: { promptTokens: number; completionTokens: number }
): number {
  if (!usage) return 0
  const pricing = findModelPricing(modelId)
  if (!pricing) return 0
  return (
    (usage.promptTokens / 1_000_000) * pricing.input +
    (usage.completionTokens / 1_000_000) * pricing.output
  )
}

// ============================================================
// OPENROUTER GENERATION API
// Queries actual cost from OpenRouter after each call
// ============================================================

interface GenerationStats {
  /** Generation ID */
  id: string
  /** Actual cost in USD */
  total_cost: number
  /** Native input tokens (from provider) */
  native_tokens_prompt?: number
  /** Native output tokens (from provider) */
  native_tokens_completion?: number
  /** Model used */
  model?: string
}

/**
 * Fetch actual cost from OpenRouter's Generation API.
 * Returns null if unavailable or errored (graceful degradation).
 *
 * @param generationId - ID returned from generateText() result
 * @param apiKey - OpenRouter API key
 * @returns Generation stats with actual cost, or null
 */
export async function fetchGenerationStats(
  generationId: string,
  apiKey: string
): Promise<GenerationStats | null> {
  if (!generationId || !apiKey) return null

  try {
    const response = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${generationId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://eachie.ai',
          'X-Title': 'Eachie',
        },
      }
    )

    if (!response.ok) {
      console.warn(`[Pricing] Generation API returned ${response.status}`)
      return null
    }

    const data = await response.json()
    return data?.data || null
  } catch (error) {
    console.warn('[Pricing] Failed to fetch generation stats:', error)
    return null
  }
}

// ============================================================
// TEXT-LENGTH COST ESTIMATION
// Fallback when token counts unavailable (~4 chars per token)
// ============================================================

interface CostEstimate {
  cost: number
  isEstimate: true
}

/**
 * Estimate cost based on text length when token data unavailable.
 * Uses ~4 characters per token heuristic.
 *
 * @param modelId - OpenRouter model ID
 * @param inputText - The prompt/input text
 * @param outputText - The response/output text
 * @returns Cost estimate with flag, or null for free/unknown models
 */
export function estimateCostFromText(
  modelId: string,
  inputText: string,
  outputText: string
): CostEstimate | null {
  const pricing = findModelPricing(modelId)

  // Unknown model - can't estimate
  if (!pricing) return null

  // Actually free model - not an estimate
  if (pricing.input === 0 && pricing.output === 0) return null

  // Estimate tokens (~4 characters per token)
  const estimatedInputTokens = Math.ceil(inputText.length / 4)
  const estimatedOutputTokens = Math.ceil(outputText.length / 4)

  const cost =
    (estimatedInputTokens / 1_000_000) * pricing.input +
    (estimatedOutputTokens / 1_000_000) * pricing.output

  return { cost, isEstimate: true }
}
