'use client'

import { useState } from 'react'
import { Game } from '@/domains/games/types'
import { GameOwnershipProgress } from '@/domains/games/components/game-ownership-progress'
import { PlayGameClient } from './PlayGameClient'

interface PlayPageSurfaceProps {
  game: Game
  isOwner: boolean
  maxAttempts: number
}

/**
 * Owns the boundary between page chrome and play: the ownership rail is
 * useful on the hero and finale screens (where mint/IP actions are
 * actionable) but pure noise mid-decision, so it hides during active play.
 */
export function PlayPageSurface({ game, isOwner, maxAttempts }: PlayPageSurfaceProps) {
  const [inActivePlay, setInActivePlay] = useState(false)

  return (
    <>
      {!inActivePlay && (
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <GameOwnershipProgress game={game} variant="strip" />
        </div>
      )}
      <PlayGameClient
        game={game}
        isOwner={isOwner}
        maxAttempts={maxAttempts}
        onActivePlayChange={setInActivePlay}
      />
    </>
  )
}
