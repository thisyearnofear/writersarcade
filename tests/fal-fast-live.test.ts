import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { streamText } from 'ai'
import { getModel } from '@/lib/ai-model-compatibility'
import { getCompatibleFalModel, FAL_FAST_MODEL } from '@/lib/fal-provider'

describe('live: fal fast model', () => {
  it('streams via the fast model', async () => {
    const t0 = Date.now()
    const { textStream } = await streamText({
      model: getCompatibleFalModel(FAL_FAST_MODEL),
      prompt: 'Name three haunted places. One per line, no preamble.',
    })
    let out = ''
    for await (const chunk of textStream) out += chunk
    console.log('fast elapsed_ms', Date.now() - t0)
    console.log('fast text:', JSON.stringify(out.slice(0, 200)))
    expect(out.length).toBeGreaterThan(10)
  }, 120000)

  it('resolves a default model for the plain getModel() path', () => {
    const model = getModel('')
    console.log('default model id:', (model as any).modelId)
    expect((model as any).modelId).toBeTruthy()
  })
})
