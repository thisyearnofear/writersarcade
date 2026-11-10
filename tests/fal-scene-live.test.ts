import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { ScenePlannerService } from '@/domains/games/services/scene-planner.service'
import { getStructuredOutputModel } from '@/lib/ai-model-compatibility'

describe('live: fal-backed scene planning', () => {
  it('plans a scene from a plain prompt via the standard structured-output path', async () => {
    const t0 = Date.now()
    const plan = await ScenePlannerService.generateScenePlan({
      title: 'The Lighthouse Keeper',
      description:
        'A lighthouse keeper on a storm-battered cliff who must relight the beacon before the shipwreck.',
      genre: 'mystery',
      subgenre: 'gothic',
    })
    console.log('elapsed_ms', Date.now() - t0)
    console.log('title:', plan.title, '| mood:', plan.mood, '| ground:', plan.ground)
    console.log('zones:', plan.zones.length, 'objects:', plan.objects.length, 'npcs:', plan.npcs.length)
    console.log('game:', JSON.stringify(plan.game))
    console.log('interactables:', plan.objects.filter((o) => o.interactable).length)
    console.log('assetKeys:', plan.objects.filter((o) => o.assetKey).length)
    console.log('y values:', plan.objects.map((o) => o.position.y).join(','))
    expect(plan.objects.length).toBeGreaterThanOrEqual(5)
    expect(plan.game?.objectiveIds.length).toBeGreaterThan(0)
    // Every objective must point at a real object.
    const ids = new Set(plan.objects.map((o) => o.id))
    for (const oid of plan.game?.objectiveIds ?? []) expect(ids.has(oid)).toBe(true)
  }, 180000)

  it('resolves a structured-output model without throwing', () => {
    const model = getStructuredOutputModel()
    expect(model).toBeTruthy()
    expect((model as any).modelId).toBeTruthy()
    console.log('resolved model id:', (model as any).modelId)
  })
})
