import { createOpenAI } from '@ai-sdk/openai'
import type { CompatibleLanguageModel } from '@/lib/ai-model-compatibility'

/**
 * SandBase provider — an OpenAI-compatible LLM gateway
 * (`https://api.sandbase.ai/v1`), so no wire-format translation is needed:
 * `createOpenAI` speaks the same chat-completions protocol SandBase exposes.
 *
 * Verified against the live API (Nov 2026):
 *  - `openai/*` and `google/*` models enforce `response_format` json_schema
 *    strictly (~1-2s).
 *  - `anthropic/*` models DO NOT enforce it — they return fenced JSON that
 *    ignores the schema, and took ~50s on a trivial request. resolveSandbaseModel
 *    therefore never routes structured output to an anthropic/ id.
 */

export const SANDBASE_BASE_URL = 'https://api.sandbase.ai/v1'

/**
 * Default model for structured output. `openai/gpt-5-mini` enforces strict
 * JSON schema and stays cheap; override with SANDBASE_MODEL.
 */
export const SANDBASE_DEFAULT_MODEL =
  process.env.SANDBASE_MODEL || 'openai/gpt-5-mini'

/**
 * Internal model names → SandBase catalog ids (`provider/model`).
 * Anything unrecognized falls back to SANDBASE_DEFAULT_MODEL.
 */
const MODEL_ALIASES: Record<string, string> = {
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'gpt-5': 'openai/gpt-5',
  'o3': 'openai/gpt-5-mini',
  'gemini-2.0-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'llama-3.3-70b': 'meta/llama-3.3-70b-instruct',
}

export function resolveSandbaseModel(modelName?: string): string {
  if (!modelName) return SANDBASE_DEFAULT_MODEL
  if (modelName.includes('/')) {
    // Anthropic-routed models ignore response_format — structured output
    // would silently come back unvalidated. Never send it there.
    if (modelName.startsWith('anthropic/')) return SANDBASE_DEFAULT_MODEL
    return modelName
  }
  return MODEL_ALIASES[modelName] ?? SANDBASE_DEFAULT_MODEL
}

export function hasSandbaseConfiguration(): boolean {
  return !!process.env.SANDBASE_API_KEY
}

function sandbaseApiKey(): string {
  const key = process.env.SANDBASE_API_KEY
  if (!key) throw new Error('SandBase API key is required (SANDBASE_API_KEY)')
  return key
}

/**
 * OpenAI strict JSON-schema mode requires every property in `required` —
 * our zod `.optional()` fields render as "not required" and SandBase (like
 * OpenAI) rejects the request ("Missing 'goal'"). Relax `strict` before the
 * request leaves; the response is still schema-guided and the AI SDK still
 * validates it against the zod schema. Same trade fal-provider makes for
 * OpenAI-family models.
 */
export function createSandbaseFetch(): typeof fetch {
  return async function sandbaseFetch(input: any, init: any): Promise<Response> {
    if (init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body)
        const rf = body?.response_format
        if (
          rf?.type === 'json_schema' &&
          rf.json_schema &&
          typeof rf.json_schema === 'object'
        ) {
          rf.json_schema.strict = false
          init = { ...init, body: JSON.stringify(body) }
        }
      } catch {
        // Unparseable body — forward as-is and let the API report the error.
      }
    }
    return fetch(input, init)
  }
}

/**
 * A SandBase-backed chat model usable anywhere the AI SDK expects a
 * `LanguageModel`.
 */
export function getCompatibleSandbaseModel(
  modelName?: string
): CompatibleLanguageModel {
  const provider = createOpenAI({
    apiKey: sandbaseApiKey(),
    baseURL: SANDBASE_BASE_URL,
    fetch: createSandbaseFetch(),
  })
  return provider.chat(
    resolveSandbaseModel(modelName)
  ) as unknown as CompatibleLanguageModel
}
