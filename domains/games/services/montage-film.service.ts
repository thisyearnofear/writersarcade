import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/config'
import { persistMediaBuffer } from '@/domains/story/services/media-upload'

/**
 * Assemble the per-panel clips into one continuous film.
 *
 * The concat itself runs on the Fastify VPS (ffmpeg is a persistent-process
 * dependency — shipping the binary in a Vercel function bundle is the weight
 * we're trying to remove). This function:
 *   1. collects the panel videoUrls in order,
 *   2. claims the game with a 'pending' sentinel so concurrent status polls
 *      don't double-assemble,
 *   3. POSTs the clip list to the VPS concat endpoint (returns MP4 bytes),
 *   4. pins the result to Pinata and stores the durable URL.
 *
 * On failure the sentinel is cleared so the next all-complete poll retries.
 */
export async function assembleMontageFilm(gameId: string, slug: string): Promise<string | null> {
  const panels = await prisma.gameArtifactPanel.findMany({
    where: { gameId, videoUrl: { not: null } },
    orderBy: { panelIndex: 'asc' },
    select: { videoUrl: true },
  })
  const clips = panels.map((p) => p.videoUrl!).filter((u) => u.startsWith('http'))
  if (clips.length < 2) return null

  const claimed = await prisma.game.updateMany({
    where: { id: gameId, montageVideoUrl: null },
    data: { montageVideoUrl: 'pending' },
  })
  if (claimed.count === 0) {
    // Already assembled or another request claimed assembly.
    const existing = await prisma.game.findUnique({ where: { id: gameId }, select: { montageVideoUrl: true } })
    return existing?.montageVideoUrl?.startsWith('http') ? existing.montageVideoUrl : null
  }

  try {
    const backendUrl = process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180_000)
    try {
      const res = await fetch(`${backendUrl}/api/montage/concat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'video/mp4' },
        body: JSON.stringify({ clips }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Montage concat failed: ${res.status} ${text.slice(0, 200)}`)
      }
      const mp4 = await res.arrayBuffer()
      const durableUrl = await persistMediaBuffer(mp4, `writersarcade-${slug}-montage.mp4`)
      if (!durableUrl) throw new Error('Durable media storage is not configured.')

      await prisma.game.update({ where: { id: gameId }, data: { montageVideoUrl: durableUrl } })
      logger.info('Montage film assembled', { gameId, slug, clips: clips.length })
      return durableUrl
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    logger.error('Montage film assembly failed', error, { gameId, slug })
    await prisma.game
      .updateMany({ where: { id: gameId, montageVideoUrl: 'pending' }, data: { montageVideoUrl: null } })
      .catch(() => {})
    return null
  }
}
