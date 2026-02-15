import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GamePlayInterface } from '@/domains/games/components/game-play-interface'
import { WordleGameInterface } from '@/domains/games/components/wordle-game-interface'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import { IPAttribution } from '@/domains/games/components/ip-attribution'

export const dynamic = 'force-dynamic'

interface GamePageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    notFound()
  }

  // For story games, generate image if not exists (async, non-blocking)
  if (game.mode !== 'wordle' && !game.imageUrl) {
    ImageGenerationService.generateGameImage(game).then(result => {
      if (result.imageUrl) {
        GameDatabaseService.updateGameImage(game.id, result.imageUrl).catch(console.error)
      }
    }).catch(console.error)
  }

  // Wordle-mode games render a Wordle interface instead of the comic-story interface
  if (game.mode === 'wordle') {
    let answer = game.wordleAnswer

    // Fallback: derive from article if answer wasn't persisted (backwards compatibility)
    if (!answer) {
      if (!game.articleUrl) {
        notFound()
      }
      // Enhanced: Use game-specific seed for randomness to avoid predictability
      // Combine article URL and game ID for varied but reproducible results
      const randomSeed = `${game.articleUrl}-${game.id}-${new Date().toISOString().split('T')[0]}`
      answer = WordleService.deriveAnswerFromText(processed.text, undefined, randomSeed)
    }

    if (!answer) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-black">
        <WordleGameInterface game={game} answer={answer} maxAttempts={WordleService.DEFAULT_MAX_ATTEMPTS} />
      </div>
    )
  }

  // Extract and flatten assets for the attribution component
   
  // @ts-expect-error - GameDatabaseService includes assets via include; type not reflected here
  const linkedAssets = game.gamesFromAssets?.map((relation: { asset: unknown }) => relation.asset) || []

  return (
    <div className="min-h-screen bg-black">
      <GamePlayInterface game={game} />

      {linkedAssets.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-24">
          <IPAttribution assets={linkedAssets} />
        </div>
      )}
    </div>
  )
}

export async function generateMetadata({ params }: GamePageProps) {
  if (!process.env.DATABASE_URL) {
    return {
      title: 'WritArcade Game',
      description: 'Play interactive games generated from articles',
    }
  }

  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    return {
      title: 'Game Not Found',
    }
  }

  return {
    title: `${game.title} - WritArcade`,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      type: 'article',
      images: game.imageUrl ? [game.imageUrl] : [],
    },
  }
}
