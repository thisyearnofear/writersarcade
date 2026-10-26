import { unstable_cache } from 'next/cache'
import { GameDatabaseService } from './game-database.service'
import { prisma } from '@/lib/prisma'

type GetGamesOptions = Parameters<typeof GameDatabaseService.getGames>[0]

/**
 * Public games list enriched with each game's first landed panel clip —
 * powers ambient surfaces (hero backdrop) with a light ~8MB clip instead of
 * the full montage MP4. Shared by GET /api/games and the server-rendered home page.
 */
export async function getPublicGamesWithClips(options: GetGamesOptions = {}) {
  const result = await GameDatabaseService.getGames({
    ...options,
    includePrivate: false,
    // Failed generation stubs must never surface in the arcade.
    excludeFailedGenerations: true,
  })

  const ids = result.games.map((g) => g.id)
  if (ids.length > 0) {
    const clips = await prisma.gameArtifactPanel.findMany({
      where: { gameId: { in: ids }, videoUrl: { not: null } },
      select: { gameId: true, videoUrl: true },
      orderBy: { panelIndex: 'asc' },
    })
    const clipByGame = new Map<string, string>()
    for (const c of clips) {
      if (c.videoUrl && !clipByGame.has(c.gameId)) clipByGame.set(c.gameId, c.videoUrl)
    }
    for (const g of result.games) {
      const clip = clipByGame.get(g.id)
      if (clip) (g as { clipVideoUrl?: string }).clipVideoUrl = clip
    }
  }

  return result
}

/**
 * Data-Cache variant for server-rendered surfaces (home page, writer pages).
 * Tagged 'games' so /api/games/generate can revalidateTag the moment a new
 * story lands — cross-instance, unlike the old in-process Map cache.
 */
export const getTaggedPublicGamesWithClips = unstable_cache(
  async (options: GetGamesOptions = {}) => getPublicGamesWithClips(options),
  ['public-games-with-clips'],
  { tags: ['games'], revalidate: 300 },
)
