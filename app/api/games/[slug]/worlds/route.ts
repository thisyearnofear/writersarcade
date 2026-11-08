import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { buildGameWorlds } from '@/lib/game-worlds'

/**
 * GET — the game's artifact-family manifest ("one story, many worlds").
 * Public read for public games; private games require the owner.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      scene: true,
      artifactPanels: { select: { videoStatus: true, videoUrl: true } },
    },
  })
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const actor = await getActor()
  if (game.private && game.userId && actor?.user.id !== game.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: { worlds: buildGameWorlds(game, game.scene) } })
}
