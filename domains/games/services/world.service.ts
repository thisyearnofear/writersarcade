import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/config'
import { ScenePlannerService, type ScenePlan } from '@/domains/games/services/scene-planner.service'

/**
 * Standalone "prompt-to-world" service.
 *
 * A world is a plain-language prompt rendered as an explorable 3D diorama.
 * Unlike the game pipeline there is no article, no payment, no wallet and no
 * credit spend — this is the surface a judge (or any visitor) can use
 * immediately.
 *
 * Generation is a single structured-output call that takes ~30-60s, so it
 * runs inline against the request. Rows are created 'pending' first so a
 * refresh mid-generation does not lose the world.
 */

const MAX_PROMPT_CHARS = 1200
const MIN_PROMPT_CHARS = 12

/** Genre hints offered in the UI; also used to steer the planner. */
export const WORLD_GENRES = [
  'exploration',
  'mystery',
  'fantasy',
  'sci-fi',
  'horror',
  'post-apocalyptic',
  'cozy',
  'noir',
] as const

export type WorldGenre = (typeof WORLD_GENRES)[number]

export function normalizeGenre(value: unknown): WorldGenre {
  if (typeof value !== 'string') return 'exploration'
  const match = WORLD_GENRES.find((g) => g === value.toLowerCase())
  return match ?? 'exploration'
}

/** Trim a visitor prompt to something the planner can work with. */
export function normalizePrompt(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_CHARS)
}

export function validatePrompt(prompt: string): string | null {
  if (prompt.length < MIN_PROMPT_CHARS) {
    return `Describe a place in at least ${MIN_PROMPT_CHARS} characters.`
  }
  return null
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'world'
  )
}

/** Unique, readable URL slug — appends a short suffix on collision. */
export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title)
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6)
    const candidate = `${base}-${suffix}`
    const existing = await prisma.world.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

export interface CreateWorldInput {
  prompt: string
  genre?: string
}

export interface CreatedWorld {
  slug: string
  title: string
  prompt: string
  genre: string
  status: string
}

/**
 * Generate a world from a plain-language prompt.
 *
 * Returns the completed world. On planner failure the row is marked 'failed'
 * with the reason so the UI can explain itself rather than hang.
 */
export async function createWorld(input: CreateWorldInput): Promise<CreatedWorld> {
  const prompt = normalizePrompt(input.prompt)
  const genre = normalizeGenre(input.genre)

  // Reserve the row first so a slow generation is still addressable.
  const slug = await uniqueSlug(prompt.slice(0, 48))
  const row = await prisma.world.create({
    data: {
      slug,
      title: prompt.slice(0, 80),
      prompt,
      genre,
      status: 'pending',
    },
  })

  let plan: ScenePlan
  try {
    plan = await planWorld(prompt, genre)
    await prisma.world.update({
      where: { id: row.id },
      data: {
        title: plan.title || prompt.slice(0, 80),
        status: 'completed',
        sceneJson: plan as unknown as object,
        model: 'fal/anthropic/claude-sonnet-4.5',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('World generation failed:', error)
    await prisma.world.update({
      where: { id: row.id },
      data: { status: 'failed', error: message.slice(0, 500) },
    })
    throw error
  }

  return {
    slug,
    title: plan.title || prompt.slice(0, 80),
    prompt,
    genre,
    status: 'completed',
  }
}

/**
 * Plan the diorama for a prompt.
 *
 * The planner normally derives zones from a story plan's arc beats. With no
 * story we give it the prompt as the whole source material and let it invent
 * the beats — the schema requires at least one zone and the model produces a
 * coherent set.
 */
export async function planWorld(prompt: string, genre: string): Promise<ScenePlan> {
  const plan = await ScenePlannerService.generateScenePlan({
    title: prompt.slice(0, 60),
    description: prompt,
    genre,
    subgenre: undefined,
  })
  return plan
}

/** Recent completed worlds, newest first. */
export async function listWorlds(limit = 24): Promise<
  Array<{ slug: string; title: string; prompt: string; genre: string; createdAt: Date }>
> {
  return prisma.world.findMany({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { slug: true, title: true, prompt: true, genre: true, createdAt: true },
  })
}

export async function getWorld(slug: string): Promise<{
  slug: string
  title: string
  prompt: string
  genre: string
  status: string
  sceneJson: unknown
  createdAt: Date
} | null> {
  return prisma.world.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      prompt: true,
      genre: true,
      status: true,
      sceneJson: true,
      createdAt: true,
    },
  })
}
