import { createOpenAI } from '@ai-sdk/openai'
import type { CompatibleLanguageModel } from '@/lib/ai-model-compatibility'

/**
 * fal.ai `any-llm` provider.
 *
 * fal fronts many upstream models (OpenAI, Anthropic, Google, Meta, …) behind
 * one tiny HTTP protocol. It was the only funded LLM route when this provider
 * was written — SandBase (`lib/sandbase-provider.ts`) is now the priority
 * route and fal is the fallback — but it still has to carry structured output
 * whenever SandBase is unconfigured.
 *
 * `any-llm` is NOT OpenAI-compatible, so we borrow the OpenAI provider from
 * the AI SDK and translate the wire format in a custom `fetch`:
 *
 *   request   OpenAI `{messages, response_format}` → fal `{prompt, response_format}`
 *   response  fal `{output}` → OpenAI `{choices:[{message:{content}}]}`
 *   stream    fal SSE (cumulative `output`) → OpenAI SSE (deltas + `[DONE]`)
 *
 * Two protocol quirks are handled here:
 *
 *  1. `response_format` must be a JSON *string*, not an object.
 *  2. Anthropic (via fal) rejects `$ref`s that point outside `$defs` /
 *     `definitions`, and the AI SDK's zod→JSON-Schema converter emits refs
 *     into `#/properties/...`. We inline every ref before sending.
 *
 * Tool calling is not emulated — fal's `any-llm` does not expose an
 * OpenAI-style `tools` surface, so tool-loop callers degrade to plain text
 * generation rather than failing hard.
 */

const FAL_ANY_LLM_URL = 'https://fal.run/fal-ai/any-llm'
const FAL_ANY_LLM_STREAM_URL = 'https://fal.run/fal-ai/any-llm/stream'

/** Upstream model ids available through fal's `any-llm`. */
export const FAL_MODELS = {
  'anthropic/claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
  'anthropic/claude-haiku-4.5': 'anthropic/claude-haiku-5.5',
  'anthropic/claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
  'openai/gpt-4o-mini': 'openai/gpt-4o-mini',
  'openai/gpt-4o': 'openai/gpt-4o',
  'openai/gpt-4.1': 'openai/gpt-4.1',
  'openai/gpt-5-mini': 'openai/gpt-5-mini',
  'google/gemini-2.5-flash': 'google/gemini-2.5-flash',
  'google/gemini-2.5-pro': 'google/gemini-2.5-pro',
  'meta-llama/llama-3.1-70b-instruct': 'meta-llama/llama-3.1-70b-instruct',
} as const

/**
 * Our internal model names → fal upstream ids.
 * Unmapped names fall back to `anthropic/claude-sonnet-4.5` (best structured
 * output fidelity of the available set).
 */
const MODEL_ALIASES: Record<string, string> = {
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'o3': 'openai/gpt-5-mini',
  'gemini-2.0-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-3-8-flash': 'google/gemini-2.5-flash',
  'gemini-3.1-flash-preview': 'google/gemini-2.5-flash',
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
  'claude-3-5-sonnet': 'anthropic/claude-3.7-sonnet',
  'claude-haiku-4-5': 'anthropic/claude-haiku-5.5',
  'llama-3.3-70b': 'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/Meta-Llama-3.1-70B-Instruct': 'meta-llama/llama-3.1-70b-instruct',
}

export const FAL_DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5'
export const FAL_FAST_MODEL = 'openai/gpt-4o-mini'

export function resolveFalModel(modelName?: string): string {
  if (!modelName) return FAL_DEFAULT_MODEL
  if (modelName in FAL_MODELS) return modelName
  const alias = MODEL_ALIASES[modelName]
  if (alias) return alias
  // Already a fully-qualified fal id we don't know about — pass through if it
  // looks like one, otherwise fall back to the default.
  if (modelName.includes('/')) return modelName
  return FAL_DEFAULT_MODEL
}

export function hasFalConfiguration(): boolean {
  return !!(process.env.FAL_API_KEY || process.env.FAL_KEY)
}

function falApiKey(): string {
  const key = process.env.FAL_API_KEY || process.env.FAL_KEY
  if (!key) throw new Error('fal API key is required (FAL_API_KEY or FAL_KEY)')
  return key
}

/**
 * Resolve a JSON-pointer reference (`#/properties/a/properties/b`) against the
 * root schema. Returns undefined when the pointer does not resolve.
 */
function resolvePointer(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('#/')) return undefined
  let current: any = root
  for (const rawSegment of pointer.slice(2).split('/')) {
    if (current == null) return undefined
    const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~')
    current = current[segment]
  }
  return current
}

/**
 * Inline every `$ref` in a JSON Schema.
 *
 * The AI SDK's zod→JSON-Schema converter emits refs like
 * `#/properties/palette/properties/sky/items`. Anthropic (behind fal) rejects
 * refs that point outside `$defs`/`definitions`, so we resolve them against
 * the root document and substitute the target inline.
 */
export function inlineSchemaRefs(schema: unknown, root: unknown = schema, seen = new Set<string>()): unknown {
  if (Array.isArray(schema)) {
    return schema.map((entry) => inlineSchemaRefs(entry, root, seen))
  }
  if (schema === null || typeof schema !== 'object') return schema

  const obj = schema as Record<string, unknown>
  const ref = obj.$ref
  if (typeof ref === 'string') {
    if (seen.has(ref)) return {}
    const target = resolvePointer(root, ref)
    if (target === undefined) {
      // Unresolvable ref — drop it rather than sending something invalid.
      const { $ref: _dropped, ...rest } = obj
      return inlineSchemaRefs(rest, root, seen)
    }
    const nextSeen = new Set(seen)
    nextSeen.add(ref)
    const resolved = inlineSchemaRefs(target, root, nextSeen)
    const { $ref: _unused, ...rest } = obj
    return { ...(resolved as object), ...inlineSchemaRefs(rest, root, nextSeen) as object }
  }

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    out[key] = inlineSchemaRefs(value, root, seen)
  }
  return out
}

/** Flatten OpenAI-style `messages` into fal's single `prompt` string. */
function messagesToPrompt(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  const parts: string[] = []
  for (const message of messages) {
    const m = message as { role?: string; content?: unknown }
    let text = ''
    if (typeof m.content === 'string') {
      text = m.content
    } else if (Array.isArray(m.content)) {
      text = m.content
        .map((part: any) => (typeof part === 'string' ? part : (part?.text ?? '')))
        .join('')
    }
    if (!text) continue
    parts.push(m.role === 'system' ? text : text)
  }
  return parts.join('\n\n')
}

interface FalRequestBody {
  model?: string
  messages?: unknown
  prompt?: string
  response_format?: unknown
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  [key: string]: unknown
}

/**
 * OpenAI's strict JSON-schema mode requires every property to appear in
 * `required` (optional fields must be nullable). Our schemas use zod
 * `.optional()`, which the AI SDK renders as "not required" — OpenAI rejects
 * that with "Missing 'assetKey'". Anthropic accepts it.
 *
 * We relax `strict` for OpenAI-family models only. The response is still
 * schema-guided and is still validated against the zod schema by the AI SDK,
 * so correctness is enforced on our side either way.
 */
function isOpenAIFamilyModel(model: string): boolean {
  return model.startsWith('openai/')
}

/** Translate an AI SDK/OpenAI chat-completions request into fal's shape. */
export function toFalRequest(body: FalRequestBody): Record<string, unknown> {
  const model = resolveFalModel(body.model)
  const out: Record<string, unknown> = {
    model,
    prompt: body.prompt ?? messagesToPrompt(body.messages),
  }
  if (typeof body.max_tokens === 'number') out.max_tokens = body.max_tokens
  if (typeof body.temperature === 'number') out.temperature = body.temperature
  if (typeof body.top_p === 'number') out.top_p = body.top_p

  const responseFormat = body.response_format
  if (responseFormat && typeof responseFormat === 'object') {
    const rf = responseFormat as Record<string, any>
    if (rf.type === 'json_schema' && rf.json_schema?.schema) {
      const jsonSchema = {
        ...rf.json_schema,
        schema: inlineSchemaRefs(rf.json_schema.schema),
      }
      if (isOpenAIFamilyModel(model) && jsonSchema.strict !== false) {
        jsonSchema.strict = false
      }
      out.response_format = JSON.stringify({
        type: 'json_schema',
        json_schema: jsonSchema,
      })
    } else if (rf.type === 'json_object') {
      out.response_format = JSON.stringify({ type: 'json_object' })
    }
  }
  return out
}

/** Build an OpenAI-shaped chat completion from fal's `{output}` envelope. */
export function fromFalResponse(falBody: any, model: string): Record<string, unknown> {
  const content = typeof falBody?.output === 'string' ? falBody.output : ''
  return {
    id: `fal-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  }
}

/**
 * Translate fal's cumulative SSE stream into OpenAI-style delta chunks.
 *
 * fal emits `data: {"output": "<full text so far>", "partial": true}` — each
 * frame repeats everything accumulated so far. The AI SDK expects deltas, so
 * we track the previous prefix and emit only the new suffix.
 */
export function falStreamToOpenAIChunks(
  falStream: ReadableStream<Uint8Array>,
  model: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const created = Math.floor(Date.now() / 1000)
  const id = `fal-${Date.now()}`

  const chunk = (delta: Record<string, unknown>, finishReason: string | null = null) =>
    `data: ${JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    })}\n\n`

  let emitted = ''
  let buffer = ''

  /** Extract the `output` string from one fal SSE `data:` payload. */
  const readOutput = (rawEvent: string): string | null => {
    const dataLine = rawEvent
      .split('\n')
      .find((line) => line.startsWith('data:'))
      ?.slice(5)
      .trim()
    if (!dataLine || dataLine === '[DONE]') return null
    try {
      const parsed = JSON.parse(dataLine)
      return typeof parsed?.output === 'string' ? parsed.output : null
    } catch {
      return null
    }
  }

  // Decode to text ourselves — TextDecoderStream's WritableStream type does not
  // line up with the Uint8Array chunk type under the current DOM lib.
  const decoder = new TextDecoder()
  const decoded = falStream.pipeThrough(
    new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        controller.enqueue(decoder.decode(chunk, { stream: true }))
      },
      flush(controller) {
        const tail = decoder.decode()
        if (tail) controller.enqueue(tail)
      },
    })
  )

  return decoded.pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform(text, controller) {
        // fal emits CRLF line endings, so normalize before splitting events.
        buffer += text.replace(/\r\n/g, '\n')
        // SSE events are separated by a blank line.
        let sep = buffer.indexOf('\n\n')
        while (sep !== -1) {
          const rawEvent = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const output = readOutput(rawEvent)
          if (output !== null) {
            if (output.length > emitted.length && output.startsWith(emitted)) {
              // Cumulative frame — emit only the new suffix.
              const delta = output.slice(emitted.length)
              emitted = output
              if (delta) controller.enqueue(encoder.encode(chunk({ content: delta })))
            } else if (output && !output.startsWith(emitted)) {
              // Non-cumulative frame — emit the whole thing as a fresh delta.
              emitted = output
              controller.enqueue(encoder.encode(chunk({ content: output })))
            }
          }
          sep = buffer.indexOf('\n\n')
        }
      },
      flush(controller) {
        // A final event may be left in the buffer without a trailing blank line.
        if (buffer.trim()) {
          const output = readOutput(buffer)
          if (output !== null && output.length > emitted.length) {
            const delta = output.startsWith(emitted) ? output.slice(emitted.length) : output
            if (delta) controller.enqueue(encoder.encode(chunk({ content: delta })))
          }
        }
        controller.enqueue(encoder.encode(chunk({}, 'stop')))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      },
    })
  )
}

/**
 * Build a `fetch` that speaks fal's protocol on the wire and the OpenAI
 * protocol to the AI SDK.
 */
export function createFalFetch(): typeof fetch {
  return async function falFetch(input: any, init: any): Promise<Response> {
    const key = falApiKey()
    const headers = new Headers(init?.headers || {})
    headers.set('Authorization', `Key ${key}`)
    headers.set('Content-Type', 'application/json')

    let body: FalRequestBody = {}
    if (init?.body) {
      try {
        body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
      } catch {
        body = {}
      }
    }

    const wantsStream = body.stream === true
    const payload = toFalRequest(body)
    const url = wantsStream ? FAL_ANY_LLM_STREAM_URL : FAL_ANY_LLM_URL

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: init?.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      return new Response(text, { status: response.status, headers: response.headers })
    }

    if (wantsStream && response.body) {
      return new Response(falStreamToOpenAIChunks(response.body, payload.model as string), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }

    const text = await response.text()
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { output: text }
    }
    return new Response(JSON.stringify(fromFalResponse(parsed, payload.model as string)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * A fal-backed chat model usable anywhere the AI SDK expects a `LanguageModel`.
 */
export function getCompatibleFalModel(modelName?: string): CompatibleLanguageModel {
  const provider = createOpenAI({
    apiKey: falApiKey(),
    baseURL: FAL_ANY_LLM_URL,
    fetch: createFalFetch(),
  })
  return provider.chat(resolveFalModel(modelName)) as unknown as CompatibleLanguageModel
}
