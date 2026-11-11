import { describe, expect, it } from 'vitest'
import { isPlannerTimeout, validateRevision, normalizeRevision } from '@/domains/games/services/world.service'

describe('world reshape requests', () => {
  it('rejects a revision that is too short to be an instruction', () => {
    expect(validateRevision('night')).toMatch(/few more words/)
    expect(validateRevision('Make it night')).toBeNull()
  })

  it('collapses whitespace and caps the instruction', () => {
    expect(normalizeRevision('  make   it   night  ')).toBe('make it night')
    expect(normalizeRevision('x'.repeat(500))).toHaveLength(400)
  })

  it('recognises a model timeout without treating every error as one', () => {
    expect(isPlannerTimeout(new DOMException('The operation was aborted', 'AbortError'))).toBe(true)
    const timeout = new Error('request timed out')
    timeout.name = 'TimeoutError'
    expect(isPlannerTimeout(timeout)).toBe(true)
    expect(isPlannerTimeout(new Error('schema parse failed'))).toBe(false)
  })
})
