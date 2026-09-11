/**
 * Structured-object generation with provider fallback.
 *
 * `generateObject` requires JSON mode (`response_format`), which Venice's
 * default `llama-3.3-70b` rejects with a 400. Venice *does* host models that
 * support structured output (see `VENICE_STRUCTURED_MODEL`), so the fallback
 * stays on the funded Venice key — no extra provider spend required.
 *
 * Order: a JSON-capable provider (real OpenAI `sk-` key, enabled Gemini key,
 * or Anthropic) → Venice structured model. If only a gateway token sits in
 * `OPENAI_API_KEY` (e.g. `ogw_live_...`), we skip it entirely.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import {
  getJsonCapableModel,
  getCompatibleVeniceModel,
  hasVeniceConfiguration,
  hasGeminiConfiguration,
  VENICE_STRUCTURED_MODEL,
  type CompatibleLanguageModel,
} from '@/lib/ai-model-compatibility'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import { logger } from '@/lib/config'

/** A JSON-mode provider exists if a key is set AND plausibly valid for that
 *  provider. `ogw_`/non-`sk-` tokens in OPENAI_API_KEY are gateway keys — not
 *  usable against api.openai.com without a base URL. */
function hasUsableJsonProvider(userPreferences?: UserAIPreferences): boolean {
  if (hasGeminiConfiguration(userPreferences)) return true
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && /^sk-/.test(openaiKey)) return true
  if (process.env.ANTHROPIC_API_KEY) return true
  return false
}

/**
 * Generate a schema-validated object via `generateObject`, trying the
 * JSON-capable provider first and Venice's structured model as fallback.
 */
export async function generateStructuredObject<T>(opts: {
  model?: string
  schema: z.ZodType<T>
  prompt: string
  userPreferences?: UserAIPreferences
}): Promise<T> {
  const { model: modelName = '', schema, prompt, userPreferences } = opts

  const attempts: CompatibleLanguageModel[] = []
  if (hasUsableJsonProvider(userPreferences)) {
    attempts.push(getJsonCapableModel(modelName, userPreferences))
  }
  if (hasVeniceConfiguration()) {
    attempts.push(getCompatibleVeniceModel(VENICE_STRUCTURED_MODEL))
  }
  if (attempts.length === 0) {
    // No configured providers — let the default resolution throw its usual error.
    attempts.push(getJsonCapableModel(modelName, userPreferences))
  }

  let lastError: Error | null = null
  for (const model of attempts) {
    try {
      const { object } = await generateObject({ model, schema, prompt })
      return object as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn('[AI] Structured generation attempt failed', {
        error: lastError.message.slice(0, 200),
      })
    }
  }
  throw lastError ?? new Error('Structured generation failed')
}
