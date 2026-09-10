'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { WalletProviders } from '@/components/providers/WalletProviders'
import { Game } from '@/domains/games/types'
import { WordleService } from '@/domains/games/services/wordle.service'

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
  return (
    <WalletProviders fallback={<div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">Loading game…</div>}>
      <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">Loading game…</div>}>
        {game.mode === 'wordle' ? (
          <WordleGameInterface game={game} maxAttempts={maxAttempts} />
        ) : (
          <GamePlayInterface game={game} isOwner={isOwner} />
        )}
      </Suspense>
    </WalletProviders>
  )
}
