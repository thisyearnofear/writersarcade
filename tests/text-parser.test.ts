import { describe, expect, it } from 'vitest'
import { parsePanel, pullQuote } from '@/domains/games/utils/text-parser'

const INLINE_PANEL = `As you step off the subway train at Union Square, the vibrant sounds and smells of New York City envelop you. 1. You approach the truck, running your fingers over the gritty texture of the graffiti, feeling an instant connection to the anonymous artist's words. 2. You take a deep breath, letting the city's sounds and smells wash over you, and begin to walk towards your new office. 3. You pull out your phone, snapping a photo of the truck's inspiring message. 4. You hesitate, feeling the familiar tug of hesitation, and consider exploring the surrounding neighborhood.`

describe('parsePanel', () => {
  it('keeps newline-delimited choices working', () => {
    const raw = `The café is quiet.\n1. You sit down.\n2. You leave.\n3. You order coffee.\n4. You wait.`
    const result = parsePanel(raw)
    expect(result.narrative).toBe('The café is quiet.')
    expect(result.options).toEqual([
      'You sit down.',
      'You leave.',
      'You order coffee.',
      'You wait.',
    ])
  })

  it('strips inline numbered choices dumped in a single paragraph', () => {
    const result = parsePanel(INLINE_PANEL)
    expect(result.narrative).toBe(
      'As you step off the subway train at Union Square, the vibrant sounds and smells of New York City envelop you.',
    )
    expect(result.options).toHaveLength(4)
    expect(result.options[0]).toMatch(/^You approach the truck/)
    expect(result.options[3]).toMatch(/^You hesitate/)
  })
})

describe('pullQuote', () => {
  it('returns the first sentence without the choice list', () => {
    expect(pullQuote(INLINE_PANEL)).toBe(
      'As you step off the subway train at Union Square, the vibrant sounds and smells of New York City envelop you.',
    )
  })

  it('clips long sentences', () => {
    const long = 'A'.repeat(140) + '.'
    const quote = pullQuote(long, 90)
    expect(quote.endsWith('…')).toBe(true)
    expect(quote.length).toBeLessThanOrEqual(91)
  })
})
