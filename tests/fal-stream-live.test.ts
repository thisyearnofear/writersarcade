import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { streamText } from 'ai'
import { getModel } from '@/lib/ai-model-compatibility'

describe('live: fal streaming', () => {
  it('streams text through the standard streamText path', async () => {
    const t0 = Date.now()
    const { textStream } = await streamText({
      model: getModel(''),
      prompt: 'Name three haunted places. One per line, no preamble.',
    })
    let out = ''
    let chunks = 0
    for await (const chunk of textStream) {
      out += chunk
      chunks++
    }
    console.log('elapsed_ms', Date.now() - t0, 'chunks', chunks)
    console.log('text:', JSON.stringify(out.slice(0, 300)))
    expect(out.length).toBeGreaterThan(10)
    expect(chunks).toBeGreaterThan(0)
  }, 120000)
})
