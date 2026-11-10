import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { scenePlanSchema, repairScenePlan, parseScenePlan, scenePlanOutputSchema } from '@/domains/games/services/scene-planner.service'

describe('scene plan repair', () => {
  it('keeps the strict model-facing schema while tolerating drift', () => {
    // The wrapper the planner hands to Output.object must still tell the
    // model the strict constraints.
    const wrapped = scenePlanOutputSchema
    const json = zodToJsonSchema(wrapped as any, { $refStrategy: 'none' }) as any
    const objProps = json.properties.objects
    console.log('objects minItems:', objProps.minItems, 'maxItems:', objProps.maxItems)
    console.log('objectiveIds maxItems:', json.properties.game.properties.objectiveIds.maxItems)
    console.log('y minimum:', objProps.items.properties.position.properties.y.minimum)
    expect(objProps.minItems).toBe(5)
    expect(json.properties.game.properties.objectiveIds.maxItems).toBe(5)
    expect(objProps.items.properties.position.properties.y.minimum).toBe(0)
  })

  it('repairs an out-of-range and over-long plan', () => {
    const raw = {
      title: 'Test',
      mood: 'dusk',
      ground: 'stone',
      palette: { sky: ['#111111'], ground: '#222222', fog: '#333333', accent: '#ffcc00' },
      zones: [{ id: 'z1', label: 'a', beatIndex: 0, description: 'd' }],
      objects: [
        { id: 'o1', label: 'x', primitive: 'structure', zoneId: 'z1', position: { x: 0, y: -3, z: 0 }, scale: 99, rotationY: 99, category: 'structure' },
        { id: 'o2', label: 'y', primitive: 'box', zoneId: 'z1', position: { x: 0, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
        { id: 'o3', label: 'z', primitive: 'box', zoneId: 'z1', position: { x: 0, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
        { id: 'o4', label: 'w', primitive: 'box', zoneId: 'z1', position: { x: 0, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
        { id: 'o5', label: 'v', primitive: 'box', zoneId: 'z1', position: { x: 0, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop' },
      ],
      npcs: [],
      game: { goal: 'find it', objectiveIds: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'] },
    }
    const plan = parseScenePlan(raw)
    console.log('primitive:', plan.objects[0].primitive, '| category:', plan.objects[0].category)
    console.log('y:', plan.objects[0].position.y, '| scale:', plan.objects[0].scale, '| rotationY:', plan.objects[0].rotationY)
    console.log('sky len:', plan.palette.sky.length)
    console.log('objectives:', plan.game?.objectiveIds.length)
    expect(plan.objects[0].primitive).toBe('box')
    expect(plan.objects[0].position.y).toBe(0)
    expect(plan.objects[0].scale).toBe(8)
    expect(plan.palette.sky.length).toBe(2)
    expect(plan.game?.objectiveIds.length).toBe(5)
  })

  it('drops a game block whose objectives do not resolve', () => {
    const raw = {
      title: 'T', mood: 'day', ground: 'grass',
      palette: { sky: ['#111111', '#222222'], ground: '#222222', fog: '#333333', accent: '#ffcc00' },
      zones: [{ id: 'z1', label: 'a', beatIndex: 0, description: 'd' }],
      objects: Array.from({ length: 5 }, (_, i) => ({
        id: `o${i}`, label: 'x', primitive: 'box', zoneId: 'z1',
        position: { x: 0, y: 0, z: 0 }, scale: 1, rotationY: 0, category: 'prop',
      })),
      npcs: [],
      game: { goal: 'g', objectiveIds: ['nope'] },
    }
    const plan = parseScenePlan(raw)
    console.log('game after repair:', JSON.stringify(plan.game))
    expect(plan.game).toBeUndefined()
  })
})
