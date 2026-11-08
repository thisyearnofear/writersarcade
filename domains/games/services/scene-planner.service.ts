import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getStructuredOutputModel } from '@/lib/ai-model-compatibility'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import type { StoryPlan } from './story-planner.service'
import { clampCopy } from './generation-prompts'

// Constrained vocabularies (three.ws diorama pattern + SceneTeller contract
// approach): the LLM composes inside rails — enums and bounded fields — so the
// renderer can assemble deterministically without geometric hallucinations.

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

const paletteSchema = z.object({
  sky: z.array(hexColor).min(2).max(3).describe('Sky gradient stops, horizon to zenith'),
  ground: hexColor,
  fog: hexColor.describe('Distance fog color — should harmonize with sky[0]'),
  accent: hexColor.describe('Interactive-object / UI accent pulled from the story'),
})

export const sceneObjectSchema = z.object({
  id: z.string().describe('Stable slug, e.g. "obj-0" or "lighthouse"'),
  label: z.string().describe('Short display name'),
  // Exactly ONE physical thing — never a scene, never "and". Spacing between
  // objects is enforced by the renderer using zone bounds.
  assetKey: z.string().optional().describe('Curated asset-pack key (v1 retrieval tier); omit for primitive-only'),
  primitive: z.enum(['box', 'cylinder', 'sphere', 'cone', 'plane', 'torus', 'icosahedron', 'dodecahedron'])
    .describe('Fallback geometry when no assetKey resolves'),
  color: hexColor.optional().describe('Object color — must be drawn from the scene palette'),
  forgePrompt: z.string().optional().describe('One-line description for future image→3D forging (v2 tier)'),
  zoneId: z.string().describe('Which story zone this object belongs to'),
  position: z.object({
    x: z.number().min(-40).max(40),
    y: z.number().min(0).max(20),
    z: z.number().min(-40).max(40),
  }).describe('World position; y=0 is ground plane'),
  scale: z.number().min(0.2).max(8),
  rotationY: z.number().min(0).max(Math.PI * 2),
  category: z.enum(['landmark', 'structure', 'prop', 'flora', 'npc', 'interactable'])
    .describe('landmark/structure anchor the scene; prop/flora fill; interactable carries narrativeHook'),
  interactable: z.object({
    action: z.string().describe('Verb the player triggers, e.g. "inspect", "collect", "talk"'),
    label: z.string().describe('Button/tooltip text'),
    narrativeHook: z.string().describe('Story text surfaced on interaction — ties back to a panel or dilemma'),
  }).optional(),
  // Per-object job state — mirrors GameArtifactPanel.videoStatus so objects can
  // stream in progressively (v1+); v0 renders everything immediately.
  status: z.enum(['pending', 'forging', 'ready', 'failed']).default('ready'),
  glbUrl: z.string().nullable().default(null),
})

export const scenePlanSchema = z.object({
  title: z.string().describe('2-4 word diorama title'),
  mood: z.enum(['dawn', 'day', 'dusk', 'night'])
    .describe('Time-of-day lighting mood — derive from storyPlan arc mood tension/hope'),
  ground: z.enum(['grass', 'sand', 'snow', 'stone', 'water', 'meadow', 'void'])
    .describe('Terrain biome for the ground plane'),
  palette: paletteSchema,
  zones: z.array(z.object({
    id: z.string(),
    label: z.string().describe('Zone name, e.g. "the boardroom", "the rooftops"'),
    beatIndex: z.number().int().min(0).describe('Index into storyPlan.arc this zone dramatizes'),
    description: z.string().describe('One line on what this zone looks/feels like'),
  })).min(1).max(6),
  objects: z.array(sceneObjectSchema).min(5).max(40),
  npcs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    zoneId: z.string(),
    position: z.object({ x: z.number(), y: z.number().min(0), z: z.number() }),
    persona: z.string().describe('One-line character voice/personality from the story'),
    dilemma: z.string().optional().describe('The fork this NPC embodies, if any'),
  })).max(6).default([]),
  game: z.object({
    goal: z.string().describe('What the player is invited to do in the scene'),
    objectiveIds: z.array(z.string()).min(1).max(5)
      .describe('Object ids that constitute the goal — must exist in objects[]'),
  }).optional().describe('Only when the story implies an explorable objective'),
})

export type ScenePlan = z.infer<typeof scenePlanSchema>
export type SceneObject = z.infer<typeof sceneObjectSchema>

export interface ScenePlannerInput {
  title: string
  description: string
  genre: string
  subgenre?: string
  articleContext?: string
  storyPlan?: StoryPlan | null
}

/**
 * Generate a 3D diorama blueprint from a game's story plan.
 * One structured-output call; objects reference zones derived from arc beats.
 */
export class ScenePlannerService {
  static async generateScenePlan(
    input: ScenePlannerInput,
    userPreferences?: UserAIPreferences
  ): Promise<ScenePlan> {
    const model = getStructuredOutputModel(userPreferences)

    const context = [
      input.articleContext ? clampCopy(input.articleContext) : input.description ?? '',
      input.storyPlan ? `STORY PLAN:\n${JSON.stringify(input.storyPlan, null, 2)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const { output } = await generateText({
      model,
      instructions: `You are the set designer for WritersArcade dioramas — explorable 3D scenes generated from interactive comics.
Design ONE walkable scene that dramatizes the story plan's world. Rules:
- zones[] should mirror the story arc beats (one zone per major beat, max 6).
- Every object is EXACTLY ONE physical thing — a single tree, a single chair, never a scene and never "and".
- Spread objects across zones with breathing room; no overlapping positions.
- 30-50% of objects should be interactable, each with a narrativeHook that references a panel moment or dilemma.
- npcs[] are characters from the story placed in zones, each carrying a persona line.
- Emit a game block only if the story implies a concrete explorable objective.
- assetKey is optional — omit it unless a category clearly maps to a standard prop; primitive is the guaranteed fallback.
- Give every object a color chosen from the palette (accent for landmarks/interactables, ground/fog tones for set dressing).`,
      prompt: `SOURCE MATERIAL:\n${context}\n\nOUTPUT a ScenePlan for a "${input.genre}" diorama (${input.subgenre ?? 'subgenre optional'}) titled "${input.title}".`,
      output: Output.object({ schema: scenePlanSchema }),
    })

    // Referential integrity the schema can't express: game.objectiveIds and
    // zoneIds must resolve, or the renderer hits dangling references.
    const objectIds = new Set(output.objects.map((o) => o.id))
    const zoneIds = new Set(output.zones.map((z) => z.id))
    output.objects = output.objects.filter((o) => zoneIds.has(o.zoneId))
    output.npcs = output.npcs.filter((n) => zoneIds.has(n.zoneId))
    if (output.game) {
      output.game.objectiveIds = output.game.objectiveIds.filter((id) => objectIds.has(id))
      if (output.game.objectiveIds.length === 0) delete output.game
    }

    return output
  }
}
