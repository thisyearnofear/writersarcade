import { describe, it, expect } from 'vitest'
import {
  toFalRequest,
  fromFalResponse,
  inlineSchemaRefs,
  resolveFalModel,
  FAL_DEFAULT_MODEL,
  FAL_FAST_MODEL,
} from '@/lib/fal-provider'

describe('fal provider — wire translation', () => {
  it('flattens OpenAI messages into fal prompt', () => {
    const out = toFalRequest({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a set designer.' },
        { role: 'user', content: 'A lighthouse.' },
      ],
    })
    expect(out.model).toBe('openai/gpt-4o-mini')
    expect(out.prompt).toContain('You are a set designer.')
    expect(out.prompt).toContain('A lighthouse.')
  })

  it('sends response_format as a JSON string', () => {
    const out = toFalRequest({
      model: 'anthropic/claude-sonnet-4.5',
      response_format: { type: 'json_schema', json_schema: { name: 'r', schema: { type: 'object' }, strict: true } },
    })
    expect(typeof out.response_format).toBe('string')
    const parsed = JSON.parse(out.response_format as string)
    expect(parsed.type).toBe('json_schema')
    expect(parsed.json_schema.strict).toBe(true)
  })

  it('relaxes strict mode for OpenAI models only', () => {
    const openai = toFalRequest({
      model: 'openai/gpt-4o-mini',
      response_format: { type: 'json_schema', json_schema: { name: 'r', schema: { type: 'object' }, strict: true } },
    })
    expect(JSON.parse(openai.response_format as string).json_schema.strict).toBe(false)

    const anthropic = toFalRequest({
      model: 'anthropic/claude-sonnet-4.5',
      response_format: { type: 'json_schema', json_schema: { name: 'r', schema: { type: 'object' }, strict: true } },
    })
    expect(JSON.parse(anthropic.response_format as string).json_schema.strict).toBe(true)
  })

  it('inlines $refs that point into #/properties', () => {
    const schema = {
      type: 'object',
      properties: {
        palette: { type: 'object', properties: { sky: { type: 'array', items: { type: 'string' } } } },
        accent: { $ref: '#/properties/palette/properties/sky/items' },
      },
    }
    const inlined = inlineSchemaRefs(schema) as any
    expect(inlined.properties.accent.$ref).toBeUndefined()
    expect(inlined.properties.accent.type).toBe('string')
  })

  it('drops unresolvable refs rather than sending them', () => {
    const schema = { type: 'object', properties: { x: { $ref: '#/nowhere/at/all' } } }
    const inlined = inlineSchemaRefs(schema) as any
    expect(inlined.properties.x.$ref).toBeUndefined()
  })

  it('translates fal output into an OpenAI chat completion', () => {
    const out = fromFalResponse({ output: 'hello' }, 'openai/gpt-4o-mini')
    expect(out.object).toBe('chat.completion')
    const choices = out.choices as any[]
    expect(choices[0].message.content).toBe('hello')
    expect(choices[0].message.role).toBe('assistant')
    expect(choices[0].finish_reason).toBe('stop')
  })

  it('maps internal model names onto fal upstream ids', () => {
    expect(resolveFalModel('gpt-4o-mini')).toBe('openai/gpt-4o-mini')
    expect(resolveFalModel('gemini-2.0-flash')).toBe('google/gemini-2.5-flash')
    expect(resolveFalModel('claude-sonnet-4-5')).toBe('anthropic/claude-sonnet-4.5')
    expect(resolveFalModel('llama-3.3-70b')).toBe('meta-llama/llama-3.1-70b-instruct')
    expect(resolveFalModel('')).toBe(FAL_DEFAULT_MODEL)
    expect(resolveFalModel(undefined)).toBe(FAL_DEFAULT_MODEL)
    expect(resolveFalModel('openai/gpt-4o-mini')).toBe('openai/gpt-4o-mini')
    expect(FAL_FAST_MODEL).toBe('openai/gpt-4o-mini')
  })
})
