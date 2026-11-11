import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiHandler, ok, fail } from '@/lib/api-response'
import { checkRateLimit } from '@/services/rate-limit'
import {
  createWorld,
  listWorlds,
  normalizePrompt,
  validatePrompt,
  WORLD_GENRES,
  WorldRequestError,
} from '@/domains/games/services/world.service'

/**
 * POST /api/worlds — generate a 3D world from a plain-language prompt.
 *
 * No auth, no wallet, no credits. Rate limited per IP so the demo cannot be
 * scraped into an unbounded bill.
 */

export const maxDuration = 120

const createWorldSchema = z.object({
  prompt: z.string().min(1).max(2000),
  genre: z.string().optional(),
})

export const POST = apiHandler(async (request: NextRequest) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // Each generation is a real model call, so the limit exists to stop a
  // runaway loop rather than to police ordinary use — it is generous enough
  // that a visitor (or a judge) can explore several prompts in a row.
  const burst = checkRateLimit(`world:${ip}`, 30, 60_000)
  if (!burst.allowed) {
    return fail(
      `Too many worlds generated. Try again in ${Math.ceil(burst.resetIn / 1000)}s.`,
      429,
    )
  }

  const body = await request.json().catch(() => ({}))
  const parsed = createWorldSchema.safeParse(body)
  if (!parsed.success) {
    return fail('Invalid request data', 400, {
      details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    })
  }

  const prompt = normalizePrompt(parsed.data.prompt)
  const invalid = validatePrompt(prompt)
  if (invalid) return fail(invalid, 400)

  try {
    const world = await createWorld({ prompt, genre: parsed.data.genre })
    return ok(world, 201)
  } catch (error) {
    if (error instanceof WorldRequestError) return fail(error.message, error.status)
    console.error('[api/worlds] generation failed:', error)
    return fail('World generation failed. Please try again.', 502)
  }
})

/**
 * GET /api/worlds — recent completed worlds.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 24) || 24, 60)
  const worlds = await listWorlds(limit)
  return ok({ worlds, genres: WORLD_GENRES })
})
