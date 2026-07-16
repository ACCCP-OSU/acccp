/**
 * Shared LiteLLM client used by the conversion pipeline (lib/convert.ts) and
 * the admin cost/metrics routes.
 *
 * Required env vars:
 *   LITELLM_BASE_URL   e.g. https://litellm.cloud.osu.edu
 *   LITELLM_API_KEY    your nano key
 *   LITELLM_MODEL      e.g. gpt-5.4-nano-2026-03-17
 */

export interface LiteLLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export function getLiteLLMConfig(): LiteLLMConfig {
  const baseUrl = process.env.LITELLM_BASE_URL
  const apiKey = process.env.LITELLM_API_KEY
  const model = process.env.LITELLM_MODEL ?? "gpt-5.4-nano-2026-03-17"
  if (!baseUrl) throw new Error("Missing env var: LITELLM_BASE_URL")
  if (!apiKey) throw new Error("Missing env var: LITELLM_API_KEY")
  return { baseUrl, apiKey, model }
}

export interface LiteLLMCallResult {
  content: string
  model: string
  promptTokens: number
  completionTokens: number
}

export async function callLiteLLM(
  systemPrompt: string,
  userMessage: string,
  config: LiteLLMConfig
): Promise<LiteLLMCallResult> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LiteLLM error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
    model: string
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
  }

  return {
    content: data.choices[0].message.content.trim(),
    model: data.model,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  }
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface ModelPricing {
  inputCostPerToken: number
  outputCostPerToken: number
}

const PRICING_CACHE_TTL_MS = 5 * 60 * 1000
const pricingCache = new Map<
  string,
  { value: ModelPricing | null; expiresAt: number }
>()

/** Test-only: clears the in-memory pricing cache between test cases. */
export function clearModelPricingCache(): void {
  pricingCache.clear()
}

/**
 * Looks up per-token pricing for `model` from LiteLLM's /model/info endpoint.
 * Returns null (never throws) if the endpoint or the cost fields are
 * unavailable — cost tracking degrades gracefully; token counts still get
 * recorded either way. Cached for 5 minutes per model since pricing is
 * low-cardinality and slow-changing.
 */
export async function fetchModelPricing(
  model: string,
  config: Pick<LiteLLMConfig, "baseUrl" | "apiKey">
): Promise<ModelPricing | null> {
  const cached = pricingCache.get(model)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const value = await fetchModelPricingUncached(model, config)
  pricingCache.set(model, {
    value,
    expiresAt: Date.now() + PRICING_CACHE_TTL_MS,
  })
  return value
}

async function fetchModelPricingUncached(
  model: string,
  config: Pick<LiteLLMConfig, "baseUrl" | "apiKey">
): Promise<ModelPricing | null> {
  try {
    const response = await fetch(`${config.baseUrl}/model/info`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    if (!response.ok) return null

    const data = (await response.json()) as {
      data?: Array<{
        model_name?: string
        litellm_params?: { model?: string }
        model_info?: {
          input_cost_per_token?: number
          output_cost_per_token?: number
        }
      }>
    }

    const entry = data.data?.find(
      (m) => m.model_name === model || m.litellm_params?.model === model
    )
    const info = entry?.model_info
    if (
      !info ||
      typeof info.input_cost_per_token !== "number" ||
      typeof info.output_cost_per_token !== "number"
    ) {
      return null
    }

    return {
      inputCostPerToken: info.input_cost_per_token,
      outputCostPerToken: info.output_cost_per_token,
    }
  } catch {
    return null
  }
}

/** Pure — no I/O — so it's trivially unit-testable. */
export function computeCallCostUsd(
  promptTokens: number,
  completionTokens: number,
  pricing: ModelPricing | null
): number | null {
  if (!pricing) return null
  return (
    promptTokens * pricing.inputCostPerToken +
    completionTokens * pricing.outputCostPerToken
  )
}
