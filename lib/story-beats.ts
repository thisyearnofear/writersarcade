import type { ScenePlan } from '@/domains/games/services/scene-planner.service'

/**
 * One reading of a scene plan, shared by the comic and the film.
 * Derived from sceneJson. Nothing here calls a model or spends credits.
 */
export type StoryBeatKind = 'cover' | 'goal' | 'thread' | 'character'

export interface StoryBeat {
  id: string
  kind: StoryBeatKind
  title: string
  /** One or two sentences already stored on the scene. */
  body: string
  speaker?: string
}

/** The slice of a ScenePlan the comic and the film read. */
export interface StoryBeatSource {
  title: string
  game?: {
    goal?: string
    objectiveIds?: string[]
  }
  objects?: Array<{
    id?: string
    label?: string
    interactable?: { narrativeHook?: string }
  }>
  npcs?: Array<{
    id?: string
    name?: string
    persona?: string
    dilemma?: string
  }>
}

export interface StoryBeatOptions {
  /** World.prompt. The cover body. It lives on the row, not in sceneJson. */
  prompt?: string
}

function line(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

/**
 * Cover, then the goal, then each objective's hook, then each character.
 * A scene with no game returns the cover only. Missing objects and blank
 * hooks are dropped. The same scene always returns the same list.
 */
export function beatsFromScene(scene: StoryBeatSource, options?: StoryBeatOptions): StoryBeat[] {
  const beats: StoryBeat[] = [
    {
      id: 'cover',
      kind: 'cover',
      title: line(scene.title) || 'Untitled',
      body: line(options?.prompt),
    },
  ]

  const game = scene.game
  if (!game) return beats

  const goal = line(game.goal)
  if (goal) {
    beats.push({ id: 'goal', kind: 'goal', title: 'Goal', body: goal })
  }

  const objects = new Map<string, NonNullable<StoryBeatSource['objects']>[number]>()
  for (const object of scene.objects ?? []) {
    const id = line(object?.id)
    if (id) objects.set(id, object)
  }

  for (const rawId of game.objectiveIds ?? []) {
    const id = line(rawId)
    const object = objects.get(id)
    if (!object) continue
    const body = line(object.interactable?.narrativeHook)
    if (!body) continue
    beats.push({
      id: `thread-${id}`,
      kind: 'thread',
      title: line(object.label) || id,
      body,
    })
  }

  for (const npc of scene.npcs ?? []) {
    const name = line(npc?.name)
    const body = line(npc?.dilemma) || line(npc?.persona)
    if (!name || !body) continue
    const id = line(npc.id) || name
    beats.push({
      id: `character-${id}`,
      kind: 'character',
      title: name,
      speaker: name,
      body,
    })
  }

  return beats
}

/** ScenePlan satisfies the beat source. Use this at the page boundary. */
export function beatsFromPlan(scene: ScenePlan, options?: StoryBeatOptions): StoryBeat[] {
  return beatsFromScene(scene, options)
}

export function asStorySource(value: unknown): StoryBeatSource | null {
  if (!value || typeof value !== 'object') return null
  const scene = value as Record<string, unknown>
  if (typeof scene.title !== 'string' || !line(scene.title)) return null
  return scene as unknown as StoryBeatSource
}
