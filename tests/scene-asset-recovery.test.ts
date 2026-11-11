import { describe, it, expect } from 'vitest'
import { parseScenePlan } from '@/domains/games/services/scene-planner.service'
import { SCENE_ASSETS } from '@/lib/scene-assets'

type TestObject = {
  id: string
  label: string
  primitive: string
  zoneId: string
  position: { x: number; y: number; z: number }
  scale: number
  rotationY: number
  category: string
  assetKey?: string
}

/** Minimal valid plan; individual tests mutate it. */
const basePlan = (): { title: string; mood: string; ground: string; palette: Record<string, unknown>; zones: unknown[]; objects: TestObject[]; npcs: unknown[]; game: Record<string, unknown> } => ({
  title: 'Test',
  mood: 'dusk',
  ground: 'stone',
  palette: { sky: ['#111111', '#222222'], ground: '#333333', fog: '#444444', accent: '#ffcc00' },
  zones: [{ id: 'z1', label: 'the hall', beatIndex: 0, description: 'a hall' }],
  objects: [
    { id: 'o1', label: 'safety rail', primitive: 'box', zoneId: 'z1', position: { x: 0, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'structure' },
    { id: 'o2', label: 'mystery object', primitive: 'box', zoneId: 'z1', position: { x: 1, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
    { id: 'o3', label: 'third', primitive: 'box', zoneId: 'z1', position: { x: 2, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
    { id: 'o4', label: 'fourth', primitive: 'box', zoneId: 'z1', position: { x: 3, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
    { id: 'o5', label: 'fifth', primitive: 'box', zoneId: 'z1', position: { x: 4, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
  ],
  npcs: [],
  game: { goal: 'find it', objectiveIds: ['o1'] },
})

describe('scene plan asset recovery', () => {
  it('recovers an asset key from the object label', () => {
    const plan = parseScenePlan(basePlan())
    expect(plan.objects[0].assetKey).toBeTruthy()
    // The recovered key must exist in the manifest and be loadable.
    expect(SCENE_ASSETS[plan.objects[0].assetKey!]).toBeTruthy()
  })

  it('leaves an object with no match unassigned', () => {
    const plan = parseScenePlan(basePlan())
    expect(plan.objects[1].assetKey).toBeUndefined()
  })

  it('never invents a key that is not in the manifest', () => {
    const raw = basePlan()
    raw.objects[0].label = 'exit sign'
    raw.objects[1].label = 'cottage door'
    const plan = parseScenePlan(raw)
    for (const o of plan.objects) {
      if (o.assetKey) expect(SCENE_ASSETS[o.assetKey]).toBeTruthy()
    }
  })

  it('replaces an invalid key with a recovered one', () => {
    const raw = basePlan()
    raw.objects[0].assetKey = 'not-a-real-key'
    const plan = parseScenePlan(raw)
    if (plan.objects[0].assetKey) expect(SCENE_ASSETS[plan.objects[0].assetKey]).toBeTruthy()
  })

  it('does not override a key the planner chose', () => {
    const raw = basePlan()
    raw.objects[0].assetKey = 'dungeon-chest'
    const plan = parseScenePlan(raw)
    expect(plan.objects[0].assetKey).toBe('dungeon-chest')
  })


})
