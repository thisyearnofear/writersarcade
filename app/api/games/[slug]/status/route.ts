import { ok, fail } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/games/[slug]/status — lightweight poll for record-first generation.
 * The game page's "writing your story" view polls this until the async
 * pipeline flips generationStatus to 'ready' (or 'failed').
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const game = await prisma.game.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      generationStatus: true,
      generationError: true,
    },
  })
  if (!game) return fail('Game not found', 404, { code: 'GAME_NOT_FOUND' })

  return ok({
    slug: game.slug,
    title: game.title,
    generationStatus: game.generationStatus,
    generationError: game.generationError,
  })
}
