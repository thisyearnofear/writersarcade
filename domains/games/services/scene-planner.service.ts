import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getStructuredOutputModel } from '@/lib/ai-model-compatibility'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import { SCENE_ASSETS, sceneAssetVocabulary } from '@/lib/scene-assets'
import type { StoryPlan } from './story-planner.service'
import { clampCopy } from './generation-prompts'

// Constrained vocabularies (three.ws diorama pattern + SceneTeller contract
// approach): the LLM composes inside rails — enums and bounded fields — so the
// renderer can assemble deterministically without geometric hallucinations.

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

/**
 * Repair a raw LLM scene plan so it satisfies the schema.
 *
 * Structured-output providers do not reliably honour every constraint — fal's
 * strict `json_schema` mode (Anthropic under the hood) accepted `y: -3` for a
 * field constrained to `min(0)`, and returned six objectives for a field
 * capped at five. A single violation fails the whole parse and throws away a
 * 40-60s generation, so we normalise instead of rejecting.
 *
 * The repair is deliberately conservative: it clamps numbers into range,
 * truncates over-long arrays, coerces unknown enum values to a safe default,
 * and leaves everything else untouched. The schema the *model* sees is
 * unchanged and still strict — this only affects how we parse what comes back.
 */
export function repairScenePlan(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const plan = raw as Record<string, any>

  const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
  }

  // Palette — the sky needs at least two stops.
  if (plan.palette && typeof plan.palette === 'object') {
    const sky = Array.isArray(plan.palette.sky) ? plan.palette.sky.filter((c: unknown) => typeof c === 'string') : []
    if (sky.length === 1) sky.push(sky[0])
    plan.palette.sky = sky.slice(0, 3)
  }

  if (Array.isArray(plan.zones)) plan.zones = plan.zones.slice(0, 6)
  if (Array.isArray(plan.npcs)) plan.npcs = plan.npcs.slice(0, 6)

  if (Array.isArray(plan.objects)) {
    plan.objects = plan.objects.slice(0, 40).map((obj: any) => {
      if (!obj || typeof obj !== 'object') return obj
      const position = obj.position && typeof obj.position === 'object' ? obj.position : {}
      obj.position = {
        x: clamp(position.x, -40, 40, 0),
        y: clamp(position.y, 0, 20, 0),
        z: clamp(position.z, -40, 40, 0),
      }
      obj.scale = clamp(obj.scale, 0.2, 8, 1)
      obj.rotationY = clamp(obj.rotationY, 0, Math.PI * 2, 0)
      // The model sometimes answers with a category where a primitive belongs.
      if (!['box', 'cylinder', 'sphere', 'cone', 'plane', 'torus', 'icosahedron', 'dodecahedron'].includes(obj.primitive)) {
        obj.primitive = 'box'
      }
      if (!['landmark', 'structure', 'prop', 'flora', 'npc', 'interactable'].includes(obj.category)) {
        obj.category = 'prop'
      }
      return obj
    })
  }

  // The explorable goal — cap objectives and keep them pointing at real objects.
  if (plan.game && typeof plan.game === 'object') {
    const ids = Array.isArray(plan.game.objectiveIds) ? plan.game.objectiveIds.filter((id: unknown) => typeof id === 'string') : []
    const objectIds = new Set((plan.objects ?? []).map((o: any) => o?.id).filter(Boolean))
    const resolved = ids.filter((id: string) => objectIds.has(id)).slice(0, 5)
    if (resolved.length > 0) {
      plan.game.objectiveIds = resolved
    } else {
      // No valid objectives — the world still renders, just without a goal.
      delete plan.game
    }
  }

  if (!['dawn', 'day', 'dusk', 'night'].includes(plan.mood)) plan.mood = 'day'
  if (!['grass', 'sand', 'snow', 'stone', 'water', 'meadow', 'void'].includes(plan.ground)) plan.ground = 'grass'

  return plan
}

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
  assetKey: z.string().optional().describe('Curated asset-pack key — MUST be one of the available keys listed in the instructions; omit if none fits'),
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
    assetKey: z.string().optional().describe('Character asset key (e.g. dungeon-character-human, dungeon-character-orc, forest-character-archer); omit for capsule placeholder'),
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

/**
 * Parse a raw LLM scene plan, repairing drift before validation.
 *
 * `Output.object` validates the model's JSON against the strict schema, so a
 * single out-of-range number or over-long array would discard an entire
 * generation. The repair pass normalises those first.
 */
export function parseScenePlan(raw: unknown): ScenePlan {
  return scenePlanSchema.parse(repairScenePlan(raw))
}

/**
 * The schema handed to `Output.object`.
 *
 * The preprocess runs before validation, so drift is repaired rather than
 * rejected. Crucially the *model-facing* JSON Schema is unchanged — the AI
 * SDK renders a `ZodEffects` wrapper using its inner schema, so the LLM still
 * sees the strict min/max/enum constraints and is guided correctly.
 */
export const scenePlanOutputSchema = z.preprocess(repairScenePlan, scenePlanSchema)

/**
 * Referential integrity the schema can't express: zoneIds and game.objectiveIds
 * must resolve, and assetKey must exist in the manifest — the LLM can
 * hallucinate either. Mutates and returns the plan. Shared by initial
 * generation and critique-driven revision.
 */
export function sanitizeScenePlan(plan: ScenePlan): ScenePlan {
  for (const obj of plan.objects) {
    if (obj.assetKey && !SCENE_ASSETS[obj.assetKey]) obj.assetKey = undefined
  }
  for (const npc of plan.npcs) {
    if (npc.assetKey && (!SCENE_ASSETS[npc.assetKey] || !SCENE_ASSETS[npc.assetKey].categories.includes('npc'))) npc.assetKey = undefined
  }
  const zoneIds = new Set(plan.zones.map((z) => z.id))
  plan.objects = plan.objects.filter((o) => zoneIds.has(o.zoneId))
  plan.npcs = plan.npcs.filter((n) => zoneIds.has(n.zoneId))
  // Compute surviving ids AFTER zone filtering — objectiveIds must resolve
  // to objects that actually render.
  const objectIds = new Set(plan.objects.map((o) => o.id))
  if (plan.game) {
    plan.game.objectiveIds = plan.game.objectiveIds.filter((id) => objectIds.has(id))
    if (plan.game.objectiveIds.length === 0) delete plan.game
  }
  return plan
}

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
- npcs[] are characters from the story placed in zones, each carrying a persona line and, when relevant, the dilemma they embody.
- ALWAYS emit a game block: derive a concrete explorable objective from the story's central conflict (e.g. "find the three witnesses", "reach the beacon before dusk"). objectiveIds must reference objects the player can click — give each a meaningful interactable.narrativeHook. The player "wins" the world by discovering every objective.
- assetKey: prefer a curated asset when one fits the object — available keys: ${sceneAssetVocabulary()}. primitive is the guaranteed fallback for anything without a match.
- Give every object a color chosen from the palette (accent for landmarks/interactables, ground/fog tones for set dressing). Asset-keyed objects ignore color (they use their baked texture).`,
      prompt: `SOURCE MATERIAL:\n${context}\n\nOUTPUT a ScenePlan for a "${input.genre}" diorama (${input.subgenre ?? 'subgenre optional'}) titled "${input.title}".`,
      output: Output.object({ schema: scenePlanOutputSchema }),
    })

    // Referential integrity the schema can't express: game.objectiveIds and
    // zoneIds must resolve, or the renderer hits dangling references. Same for
    // assetKey — the LLM can hallucinate keys outside the manifest.
    return sanitizeScenePlan(output)
  }
}
