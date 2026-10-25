import { HomeClient } from './home-client'
import { getPublicGamesWithClips } from '@/domains/games/services/public-games.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { prisma } from '@/lib/prisma'
import type { SampleGame } from '@/domains/games/components/hero-game-strip'
import type { HeroTransformationProps } from '@/domains/games/components/hero-transformation'

export const revalidate = 300

type HeroGame = SampleGame & { clipVideoUrl?: string; montageVideoUrl?: string }

export default async function HomePage() {
  let initialSampleGames: HeroGame[] = []
  let initialStats: { publicGames: number; totalPlays: number } | null = null
  let featuredArtifact: HeroTransformationProps | undefined
  try {
    const [gamesResult, stats] = await Promise.all([
      getPublicGamesWithClips({ limit: 5, requireImage: true, requireArtifact: true }),
      GameDatabaseService.getGameStats(),
    ])
    initialSampleGames = gamesResult.games.map((g) => ({
      slug: g.slug,
      title: g.title,
      imageUrl: g.imageUrl ?? undefined,
      clipVideoUrl: (g as { clipVideoUrl?: string }).clipVideoUrl,
      montageVideoUrl: g.montageVideoUrl ?? undefined,
    }))
    initialStats = { publicGames: stats.publicGames, totalPlays: stats.totalPlays }

    // The hero's article→comic artifact needs one game born from a real
    // article plus its generated panels. First match wins; anything short of
    // three panels falls back to the generic game strip.
    const sourceGame = gamesResult.games.find((g) => g.articleUrl)
    if (sourceGame) {
      const panels = await prisma.gameArtifactPanel.findMany({
        where: { gameId: sourceGame.id, imageUrl: { not: null } },
        orderBy: { panelIndex: 'asc' },
        take: 5,
        select: { imageUrl: true },
      })
      const panelUrls = panels
        .map((p) => p.imageUrl)
        .filter((u): u is string => Boolean(u))
      if (panelUrls.length >= 3) {
        featuredArtifact = {
          slug: sourceGame.slug,
          title: sourceGame.title,
          panels: panelUrls,
          author: sourceGame.authorParagraphUsername,
          publication: sourceGame.publicationName,
        }
      }
    }
  } catch {
    // Client hooks refetch when the initial values are empty; the hero then
    // falls back to the sample-games strip without an artifact.
  }
  return (
    <HomeClient
      initialSampleGames={initialSampleGames}
      initialStats={initialStats}
      featuredArtifact={featuredArtifact}
    />
  )
}
