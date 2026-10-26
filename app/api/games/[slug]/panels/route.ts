import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/config'
import { rehostRemoteImage } from '@/lib/storage/rehost-image'

export const maxDuration = 30

// GET — persisted panel images for a game (skips regeneration on replays)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true } })
  if (!game) return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 })
  const panels = await prisma.gameArtifactPanel.findMany({
    where: { gameId: game.id, imageUrl: { not: null } },
    select: { panelIndex: true, imageUrl: true, narrativeText: true },
    orderBy: { panelIndex: 'asc' },
  })
  return NextResponse.json({ success: true, data: panels })
}

// POST — persist a generated panel image { panelIndex, imageUrl, narrativeText? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const { panelIndex, imageUrl, narrativeText } = await req.json()
    if (typeof panelIndex !== 'number' || panelIndex < 0 || !imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }
    const game = await prisma.game.findUnique({ where: { slug }, select: { id: true } })
    if (!game) return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 })

    // Re-host on IPFS so panels don't depend on expiring provider URLs or
    // bulky data: URIs in the DB. Falls back to the original URL.
    const hosted = (await rehostRemoteImage(imageUrl)) ?? imageUrl

    const existing = await prisma.gameArtifactPanel.findFirst({
      where: { gameId: game.id, panelIndex },
      select: { id: true },
    })
    if (existing) {
      await prisma.gameArtifactPanel.update({ where: { id: existing.id }, data: { imageUrl: hosted } })
    } else {
      await prisma.gameArtifactPanel.create({
        data: { gameId: game.id, panelIndex, imageUrl: hosted, narrativeText: narrativeText ?? '' },
      })
    }
    return NextResponse.json({ success: true, data: { imageUrl: hosted } })
  } catch (error) {
    logger.error('Panel image persist failed:', error)
    return NextResponse.json({ success: false, error: 'Persist failed' }, { status: 500 })
  }
}
