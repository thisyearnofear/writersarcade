import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getStructuredOutputModel } from '@/lib/ai-model-compatibility'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import { scenePlanSchema, sanitizeScenePlan, type ScenePlan } from './scene-planner.service'
import type { StoryPlan } from './story-planner.service'
import { clampCopy } from './generation-prompts'

// Critique→revise loop (Scenethesis/SceneBloom pattern): a second structured
// pass reviews the planned scene against the story and emits a corrected plan
// only when issues are material. Non-fatal by design — the caller treats a
// critique failure as "keep the original plan".

const critiqueSchema = z.object({
  score: z.number().min(0).max(10)
    .describe('Overall quality score 0-10: story fidelity, layout readability, interactivity coverage'),
  issues: z.array(z.string()).max(8)
    .describe('Concrete problems found, e.g. "zone z3 has no landmark", "positions overlap", "no interactable references the heist panel"'),
  revisedScenePlan: scenePlanSchema.optional()
    .describe('A corrected full ScenePlan — emit ONLY if issues materially hurt the scene; omit when the plan is already good'),
})

export type SceneCritique = z.infer<typeof critiqueSchema>

export interface SceneCritiqueInput {
  title: string
  description: string
  genre: string
  articleContext?: string
  storyPlan?: StoryPlan | null
}

export class SceneCritiqueService {
  /**
   * Review a generated scene plan against its source story. Returns the
   * critique plus a sanitized revised plan when the model supplied one.
   */
  static async review(
    plan: ScenePlan,
    input: SceneCritiqueInput,
    userPreferences?: UserAIPreferences
  ): Promise<SceneCritique> {
    const model = getStructuredOutputModel(userPreferences)

    const context = [
      input.articleContext ? clampCopy(input.articleContext) : input.description ?? '',
      input.storyPlan ? `STORY PLAN:\n${JSON.stringify(input.storyPlan, null, 2)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const { output } = await generateText({
      model,
      instructions: `You are the creative director reviewing a WritersArcade diorama — an explorable 3D scene generated from an interactive comic's story plan.
Critique the SCENE PLAN against the SOURCE MATERIAL on:
- Story fidelity: do zones dramatize the arc beats? Do NPC personas and narrativeHooks reference real story moments?
- Layout readability: are objects spread out, anchored by landmarks, free of obvious overlaps (compare positions numerically)?
- Interactivity: enough interactables with meaningful hooks? Does the game objective resolve to real objects?
- Palette/mood coherence: does mood/lighting/palette match the story's tone?
Then decide: if issues materially hurt the scene, emit a corrected revisedScenePlan fixing them (respect all schema constraints — valid zoneIds, assetKeys only from known keys if you keep them, positions within ±40). If the plan is already good, omit revisedScenePlan.`,
      prompt: `GAME: "${input.title}" (${input.genre})\n\nSOURCE MATERIAL:\n${context}\n\nSCENE PLAN TO REVIEW:\n${JSON.stringify(plan, null, 2)}`,
      output: Output.object({ schema: critiqueSchema }),
    })

    if (output.revisedScenePlan) {
      output.revisedScenePlan = sanitizeScenePlan(output.revisedScenePlan)
    }
    return output
  }
}
