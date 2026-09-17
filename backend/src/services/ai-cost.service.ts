/**
 * AI Cost Calculation Service for DeepSeek API
 *
 * Implements token-level pricing and double-spending (2.0x multiplier) accounting:
 * - Computes actual DeepSeek API expense based on input (cache hit / cache miss) and output tokens.
 * - Charges 2.0x of the actual API cost against the agent's balance (e.g. $4.00 balance covers $2.00 in raw API usage).
 */

export interface DeepSeekUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

export interface DeepSeekCostResult {
  actualCost: number;
  chargedCost: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  multiplier: number;
  model: string;
}

interface ModelPricing {
  cacheHitPer1M: number;
  cacheMissPer1M: number;
  outputPer1M: number;
}

// Official DeepSeek API pricing per 1 million tokens (USD)
const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  'deepseek-flash': {
    cacheHitPer1M: 0.015,
    cacheMissPer1M: 0.150,
    outputPer1M: 0.600,
  },
  'deepseek-chat': {
    cacheHitPer1M: 0.070,
    cacheMissPer1M: 0.270,
    outputPer1M: 1.100,
  },
};

/**
 * Returns model-specific token pricing, allowing environment overrides
 */
export function getModelPricing(modelName?: string): ModelPricing {
  const modelKey = (modelName || process.env.DEEPSEEK_MODEL || 'deepseek-flash').toLowerCase();
  const basePricing = DEFAULT_MODEL_PRICING[modelKey] || DEFAULT_MODEL_PRICING['deepseek-flash'];

  return {
    cacheHitPer1M: process.env.DEEPSEEK_COST_CACHE_HIT_PER_1M
      ? parseFloat(process.env.DEEPSEEK_COST_CACHE_HIT_PER_1M)
      : basePricing.cacheHitPer1M,
    cacheMissPer1M: process.env.DEEPSEEK_COST_INPUT_PER_1M
      ? parseFloat(process.env.DEEPSEEK_COST_INPUT_PER_1M)
      : basePricing.cacheMissPer1M,
    outputPer1M: process.env.DEEPSEEK_COST_OUTPUT_PER_1M
      ? parseFloat(process.env.DEEPSEEK_COST_OUTPUT_PER_1M)
      : basePricing.outputPer1M,
  };
}

/**
 * Retrieves the cost multiplier (default: 2.0x)
 */
export function getAiCostMultiplier(): number {
  const parsed = parseFloat(process.env.AI_COST_MULTIPLIER || '2.0');
  return isNaN(parsed) || parsed <= 0 ? 2.0 : parsed;
}

/**
 * Calculates actual and doubled charged costs from DeepSeek API usage metadata
 */
export function calculateDeepSeekCost(
  usage?: DeepSeekUsage | null,
  modelName?: string
): DeepSeekCostResult {
  const model = modelName || process.env.DEEPSEEK_MODEL || 'deepseek-flash';
  const pricing = getModelPricing(model);
  const multiplier = getAiCostMultiplier();

  const promptTokens = Math.max(0, usage?.prompt_tokens || 0);
  const completionTokens = Math.max(0, usage?.completion_tokens || 0);
  const totalTokens = usage?.total_tokens || promptTokens + completionTokens;

  const cacheHitTokens = Math.max(0, usage?.prompt_cache_hit_tokens || 0);
  const cacheMissTokens = usage?.prompt_cache_miss_tokens !== undefined
    ? Math.max(0, usage.prompt_cache_miss_tokens)
    : Math.max(0, promptTokens - cacheHitTokens);

  // Compute actual API cost in USD
  const hitCost = (cacheHitTokens * pricing.cacheHitPer1M) / 1_000_000;
  const missCost = (cacheMissTokens * pricing.cacheMissPer1M) / 1_000_000;
  const outputCost = (completionTokens * pricing.outputPer1M) / 1_000_000;

  const actualCost = hitCost + missCost + outputCost;

  // Charge double from actual API cost (or custom multiplier)
  const chargedCost = actualCost * multiplier;

  return {
    actualCost,
    chargedCost,
    promptTokens,
    completionTokens,
    totalTokens,
    cacheHitTokens,
    cacheMissTokens,
    multiplier,
    model,
  };
}

/**
 * Fallback estimation when token usage metadata is not returned by the API
 * Estimates ~4 characters per token as an industry standard heuristic.
 */
export function estimateFallbackCost(
  promptText: string,
  replyText: string,
  modelName?: string
): DeepSeekCostResult {
  const estPromptTokens = Math.max(10, Math.ceil((promptText || '').length / 4));
  const estCompletionTokens = Math.max(10, Math.ceil((replyText || '').length / 4));

  return calculateDeepSeekCost(
    {
      prompt_tokens: estPromptTokens,
      completion_tokens: estCompletionTokens,
      total_tokens: estPromptTokens + estCompletionTokens,
    },
    modelName
  );
}
