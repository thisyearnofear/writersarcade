import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// Recovery endpoint: the client polls this when a generate POST times out or
// errors — the server-side pipeline creates the game stub early, so a game
// that "failed" client-side often exists. Returns the newest matching game
// created within the window.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') || ''
  const minutes = Math.min(Number(req.nextUrl.searchParams.get('within') || 15), 60)
  if (!url) return NextResponse.json({ success: false }, { status: 400 })

  const game = await prisma.game.findFirst({
    where: {
      mode: 'story',
      articleUrl: url,
      createdAt: { gte: new Date(Date.now() - minutes * 60_000) },
    },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, title: true, imageUrl: true, genre: true, createdAt: true },
  })
  if (!game) return NextResponse.json({ success: true, data: null })
  return NextResponse.json({ success: true, data: game })
}
