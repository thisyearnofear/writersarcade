import { describe, it, expect } from 'vitest'
import { scenePlanSchema } from '@/domains/games/services/scene-planner.service'

const obj = (over: Record<string, unknown> = {}) => ({
  id: 'obj-0',
  label: 'oak tree',
  primitive: 'cylinder',
  zoneId: 'z1',
  position: { x: 0, y: 0, z: 0 },
  scale: 1,
  rotationY: 0,
  category: 'flora',
  status: 'ready',
  glbUrl: null,
  ...over,
})

const validPlan = {
  title: 'Neon Boardroom',
  mood: 'dusk',
  ground: 'stone',
  palette: {
    sky: ['#1a1a2e', '#4a2c5a'],
    ground: '#2a2a33',
    fog: '#1a1626',
    accent: '#ffcc00',
  },
  zones: [
    { id: 'z1', label: 'the boardroom', beatIndex: 0, description: 'Glass and shadow' },
    { id: 'z2', label: 'the rooftops', beatIndex: 1, description: 'Wind and city glow' },
  ],
  objects: [
    obj({ id: 'obj-0', category: 'landmark', interactable: { action: 'inspect', label: 'Read the ledger', narrativeHook: 'Panel 2: the numbers don\'t add up' } }),
    obj({ id: 'obj-1', zoneId: 'z2', position: { x: 8, y: 0, z: -5 } }),
    obj({ id: 'obj-2', zoneId: 'z2', position: { x: -6, y: 0, z: 3 }, category: 'prop' }),
    obj({ id: 'obj-3', zoneId: 'z2', position: { x: 4, y: 0, z: 9 }, category: 'interactable' }),
    obj({ id: 'obj-4', zoneId: 'z1', position: { x: -3, y: 0, z: 6 }, category: 'structure' }),
  ],
  npcs: [
    { id: 'npc-0', name: 'Maya', zoneId: 'z1', position: { x: 1, y: 0, z: 2 }, persona: 'wry, clinical', dilemma: 'disclose or delay' },
  ],
  game: { goal: 'Find the hidden ledger', objectiveIds: ['obj-0'] },
}

describe('scenePlanSchema', () => {
  it('accepts a well-formed scene plan', () => {
    const parsed = scenePlanSchema.parse(validPlan)
    expect(parsed.objects).toHaveLength(5)
    expect(parsed.zones).toHaveLength(2)
    expect(parsed.game?.objectiveIds).toContain('obj-0')
  })

  it('rejects fewer than 5 objects', () => {
    expect(() => scenePlanSchema.parse({ ...validPlan, objects: validPlan.objects.slice(0, 4) })).toThrow()
  })

  it('rejects positions outside world bounds', () => {
    expect(() =>
      scenePlanSchema.parse({ ...validPlan, objects: [obj({ position: { x: 100, y: 0, z: 0 } }), ...validPlan.objects.slice(1)] })
    ).toThrow()
  })

  it('rejects non-hex palette colors', () => {
    expect(() =>
      scenePlanSchema.parse({ ...validPlan, palette: { ...validPlan.palette, accent: 'gold' } })
    ).toThrow()
  })

  it('rejects an unknown primitive', () => {
    expect(() =>
      scenePlanSchema.parse({ ...validPlan, objects: [obj({ primitive: 'teapot' }), ...validPlan.objects.slice(1)] })
    ).toThrow()
  })

  it('defaults npc list and per-object status/glbUrl', () => {
    const { npcs: _npcs, game: _game, ...rest } = validPlan
    const parsed = scenePlanSchema.parse(rest)
    expect(parsed.npcs).toEqual([])
    expect(parsed.objects[0].status).toBe('ready')
    expect(parsed.objects[0].glbUrl).toBeNull()
  })
})
