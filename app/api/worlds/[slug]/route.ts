import { NextRequest } from 'next/server'
import { apiHandler, ok, notFound } from '@/lib/api-response'
import { getWorld } from '@/domains/games/services/world.service'

/**
 * GET /api/worlds/[slug] — a single world and its scene plan.
 */
export const GET = apiHandler(
  async (_request: NextRequest, context?: { params: Promise<{ slug: string }> }) => {
    const { slug } = await (context?.params ?? Promise.resolve({ slug: '' }))
    if (!slug) return notFound('World not found')
    const world = await getWorld(slug)
    if (!world) return notFound('World not found')
    return ok(world)
  },
)
