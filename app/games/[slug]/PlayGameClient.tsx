'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { WalletProviders } from '@/components/providers/WalletProviders'
import { WalletLoadingFallback } from '@/components/providers/WalletLoadingFallback'
import { Game } from '@/domains/games/types'

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
}

export function PlayGameClient({ game, isOwner, maxAttempts }: PlayGameClientProps) {
  const fallback = <WalletLoadingFallback showHeader={false} className="py-12" message="Loading game…" />
  return (
    <WalletProviders fallback={fallback}>
      <Suspense fallback={fallback}>
        {game.mode === 'wordle' ? (
          <WordleGameInterface game={game} maxAttempts={maxAttempts} />
        ) : (
          <GamePlayInterface game={game} isOwner={isOwner} />
        )}
      </Suspense>
    </WalletProviders>
  )
}
