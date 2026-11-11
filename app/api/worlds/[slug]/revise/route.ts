import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiHandler, ok, fail } from '@/lib/api-response'
import { checkRateLimit } from '@/services/rate-limit'
import { reviseWorld, WorldRequestError } from '@/domains/games/services/world.service'

/**
 * POST /api/worlds/[slug]/revise — reshape a finished world with a sentence.
 *
 * A failed call leaves the stored scene untouched.
 */

export const maxDuration = 120

const reviseSchema = z.object({
  instruction: z.string().min(1).max(400),
})

export const POST = apiHandler(
  async (request: NextRequest, context?: { params: Promise<{ slug: string }> }) => {
    const { slug } = await (context?.params ?? Promise.resolve({ slug: '' }))
    if (!slug) return fail('World not found', 404)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const burst = checkRateLimit(`world:${ip}`, 30, 60_000)
    if (!burst.allowed) {
      return fail(
        `Too many worlds generated. Try again in ${Math.ceil(burst.resetIn / 1000)}s.`,
        429,
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = reviseSchema.safeParse(body)
    if (!parsed.success) {
      return fail('Say what to change in a few more words.', 400)
    }

    try {
      const world = await reviseWorld(slug, parsed.data.instruction)
      return ok(world)
    } catch (error) {
      if (error instanceof WorldRequestError) return fail(error.message, error.status)
      console.error('[api/worlds/revise] failed:', error)
      return fail('Could not reshape this world. It is unchanged — try again.', 502)
    }
  },
)
