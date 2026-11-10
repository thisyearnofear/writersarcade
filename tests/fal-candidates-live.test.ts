import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { generateText, Output } from 'ai'
import { scenePlanSchema } from '@/domains/games/services/scene-planner.service'
import { getCompatibleFalModel } from '@/lib/fal-provider'

const CANDIDATES = [
  'google/gemini-2.5-flash',
  'anthropic/claude-haiku-5.5',
  'openai/gpt-4.1',
]

describe('live: candidate models for scene planning', () => {
  for (const model of CANDIDATES) {
    it(`plans a scene with ${model}`, async () => {
      const t0 = Date.now()
      try {
        const { output } = await generateText({
          model: getCompatibleFalModel(model),
          prompt:
            'A lighthouse keeper on a storm-battered cliff who must relight the beacon before the shipwreck. Genre: mystery. Title: The Lighthouse Keeper.',
          output: Output.object({ schema: scenePlanSchema }),
        })
        const plan = scenePlanSchema.parse(output)
        console.log(
          `[${model}] OK ${Date.now() - t0}ms objects=${plan.objects.length} npcs=${plan.npcs.length} assetKeys=${plan.objects.filter((o) => o.assetKey).length} interactables=${plan.objects.filter((o) => o.interactable).length}`
        )
        expect(plan.objects.length).toBeGreaterThanOrEqual(5)
      } catch (e: any) {
        console.log(`[${model}] FAIL ${Date.now() - t0}ms: ${String(e?.message ?? e).slice(0, 220)}`)
      }
    }, 180000)
  }
})
