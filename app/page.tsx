import { HomeClient } from './home-client'
import { getPublicGamesWithClips } from '@/domains/games/services/public-games.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import type { SampleGame } from '@/domains/games/components/hero-game-strip'

export const revalidate = 300

type HeroGame = SampleGame & { clipVideoUrl?: string; montageVideoUrl?: string }

export default async function HomePage() {
  let initialSampleGames: HeroGame[] = []
  let initialStats: { publicGames: number; totalPlays: number } | null = null
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
  } catch {
    // Client hooks refetch when the initial values are empty.
  }
  return <HomeClient initialSampleGames={initialSampleGames} initialStats={initialStats} />
}
