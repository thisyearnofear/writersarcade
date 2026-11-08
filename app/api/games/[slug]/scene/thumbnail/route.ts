import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { logger } from '@/lib/config'
import { persistMediaBuffer } from '@/lib/storage/media-upload'

const MAX_DATA_URL_CHARS = 8 * 1024 * 1024 // ~6MB binary — generous for a JPEG frame

/**
 * POST — persist a client-rendered diorama thumbnail.
 *
 * The R3F viewer snapshots its own WebGL canvas and posts a JPEG data URL;
 * we decode it, push the bytes through durable media storage (Grove/Pinata),
 * and record the resulting URL on the GameScene row. No headless GL needed —
 * the user's browser already did the render.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const actor = await getActor()
  if (!actor) return NextResponse.json({ error: 'Sign in to save a thumbnail.' }, { status: 401 })

  const game = await prisma.game.findUnique({ where: { slug }, include: { scene: true } })
  if (!game?.scene || game.scene.status !== 'completed') {
    return NextResponse.json({ error: 'No completed scene to thumbnail.' }, { status: 404 })
  }

  const { image } = (await request.json().catch(() => ({}))) as { image?: string }
  const match = typeof image === 'string' && image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/s)
  if (!match || image.length > MAX_DATA_URL_CHARS) {
    return NextResponse.json({ error: 'Expected a JPEG/PNG data URL under 8MB.' }, { status: 400 })
  }

  const buffer = Buffer.from(match[2], 'base64')
  const contentType = match[1] === 'png' ? 'image/png' : 'image/jpeg'

  const url = await persistMediaBuffer(buffer, `scene-${game.id}-thumb.${match[1] === 'png' ? 'png' : 'jpg'}`, contentType)
  if (!url) {
    logger.warn('Scene thumbnail persistence failed', { gameId: game.id })
    return NextResponse.json({ error: 'Thumbnail storage unavailable.' }, { status: 502 })
  }

  await prisma.gameScene.update({ where: { id: game.scene.id }, data: { thumbnailUrl: url } })
  return NextResponse.json({ success: true, data: { thumbnailUrl: url } })
}
