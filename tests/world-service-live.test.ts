import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { createWorld, getWorld, listWorlds } from '@/domains/games/services/world.service'
import { scenePlanSchema } from '@/domains/games/services/scene-planner.service'

describe('live: prompt-to-world service', () => {
  it('builds a world from a plain-language prompt', async () => {
    const t0 = Date.now()
    const world = await createWorld({
      prompt:
        'A lighthouse keeper on a storm-battered cliff who must relight the beacon before the shipwreck',
      genre: 'mystery',
    })
    console.log('elapsed_ms', Date.now() - t0)
    console.log('world:', JSON.stringify(world))
    expect(world.status).toBe('completed')

    const stored = await getWorld(world.slug)
    expect(stored).toBeTruthy()
    expect(stored!.status).toBe('completed')
    const plan = scenePlanSchema.parse(stored!.sceneJson)
    console.log('title:', plan.title, '| objects:', plan.objects.length, '| npcs:', plan.npcs.length)
    console.log('goal:', plan.game?.goal)
    console.log('objectives:', plan.game?.objectiveIds?.join(', '))
    expect(plan.objects.length).toBeGreaterThanOrEqual(5)

    const list = await listWorlds(5)
    console.log('worlds listed:', list.length)
    expect(list.some((w) => w.slug === world.slug)).toBe(true)
  }, 240000)
})
