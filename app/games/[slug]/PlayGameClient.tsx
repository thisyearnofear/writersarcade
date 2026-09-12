'use client'

import dynamic from 'next/dynamic'
import { Suspense, useEffect } from 'react'
import { WalletProviders } from '@/components/providers/WalletProviders'
import { WalletLoadingFallback } from '@/components/providers/WalletLoadingFallback'
import { Game } from '@/domains/games/types'
import { trackEvent } from '@/services/analytics'

const GamePlayInterface = dynamic(
  () => import('@/domains/games/components/game-play-interface').then(m => m.GamePlayInterface),
  { ssr: false }
)

const WordleGameInterface = dynamic(
  () => import('@/domains/games/components/wordle-game-interface').then(m => m.WordleGameInterface),
  { ssr: false }
)

interface PlayGameClientProps {
  game: Game
  isOwner: boolean
  maxAttempts: number
  /** Reports when the player is in active decision-play so surrounding page
   * chrome (ownership rail) can hide until the finale. */
  onActivePlayChange?: (active: boolean) => void
}

export function PlayGameClient({ game, isOwner, maxAttempts, onActivePlayChange }: PlayGameClientProps) {
  const fallback = <WalletLoadingFallback showHeader={false} className="py-12" message="Loading game…" />

  useEffect(() => {
    trackEvent('game_viewed', { gameSlug: game.slug, mode: game.mode })
  }, [game.slug, game.mode])
  return (
    <WalletProviders fallback={fallback}>
      <Suspense fallback={fallback}>
        {game.mode === 'wordle' ? (
          <WordleGameInterface game={game} maxAttempts={maxAttempts} />
        ) : (
          <GamePlayInterface game={game} isOwner={isOwner} onActivePlayChange={onActivePlayChange} />
        )}
      </Suspense>
    </WalletProviders>
  )
}
