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
  const clipByGame = new Map<string, string>()
  if (ids.length > 0) {
    const clips = await prisma.gameArtifactPanel.findMany({
      where: { gameId: { in: ids }, videoUrl: { not: null } },
      select: { gameId: true, videoUrl: true },
      orderBy: { panelIndex: 'asc' },
    })
    for (const c of clips) {
      if (c.videoUrl && !clipByGame.has(c.gameId)) clipByGame.set(c.gameId, c.videoUrl)
    }
    for (const g of result.games) {
      const clip = clipByGame.get(g.id)
      if (clip) (g as { clipVideoUrl?: string }).clipVideoUrl = clip
    }
  }

  // Artifact badges — which "forms" each story already exists as
  // (film clip, walkable world). Powers the "new form" dot on cards.
  if (ids.length > 0) {
    const scenes = await prisma.gameScene.findMany({
      where: { gameId: { in: ids }, status: 'completed' },
      select: { gameId: true },
    })
    const sceneGames = new Set(scenes.map((s) => s.gameId))
    for (const g of result.games) {
      const badges: string[] = []
      if ((g as { montageVideoUrl?: string | null }).montageVideoUrl || clipByGame.has(g.id)) badges.push('film')
      if (sceneGames.has(g.id)) badges.push('world')
      if (badges.length > 0) (g as { artifactBadges?: string[] }).artifactBadges = badges
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
