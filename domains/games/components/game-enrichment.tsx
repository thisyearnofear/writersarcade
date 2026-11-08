'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { SecretPanel } from './secret-panel'
import { HypercertBadge } from './hypercert-badge'
import { ModifierReveal } from './modifier-reveal'
import { HiddenHandTeaser } from './hidden-hand-teaser'
import {
  loadDailyChallengeState,
  type DailyChallengeClientState,
} from '@/lib/daily-challenge/daily-challenge-client'
import { config } from '@/lib/config'
import { resolveBasePaintDay } from '@/components/basepaint/basepaint-finale-attribution'
import Link from 'next/link'
import { Boxes, ArrowUpRight } from 'lucide-react'

interface GameEnrichmentProps {
  gameId: string
  gameSlug: string
  gameTitle?: string
  primaryColor: string
  nftTokenId?: string | null
  secretPanelGenerated?: boolean
  promptVaultUuid?: string | null
  hypercertUri?: string | null
  hypercertCid?: string | null
  storySessionId?: string | null
  storyComplete?: boolean
  /**
   * How to render the daily-challenge card:
   * - 'full' (default): the complete Hidden Hand / reveal card
   * - 'teaser': the compact HiddenHandTeaser (slim, non-blocking)
   * - 'hidden': rendered elsewhere (e.g. gameplay sidebar)
   */
  dailyDisplay?: 'full' | 'teaser' | 'hidden'
  /** Panels completed, forwarded to the teaser for its progress note. */
  dailyPanelsDone?: number
  articleUrl?: string | null
  /** 'story' | 'wordle' — gates the worlds teaser to story games. */
  gameMode?: string
}

/**
 * Renders the Inco secret panel + Hypercerts badge
 * below the main game interface. Client-only — uses wagmi for wallet state.
 */
export function GameEnrichment({
  gameId,
  gameSlug,
  gameTitle,
  primaryColor,
  nftTokenId,
  secretPanelGenerated,
  promptVaultUuid,
  hypercertUri,
  hypercertCid,
  storySessionId,
  storyComplete,
  dailyDisplay = 'full',
  dailyPanelsDone,
  articleUrl,
  gameMode,
}: GameEnrichmentProps) {
  const { address, isConnected } = useAccount()
  const [dailyState, setDailyState] = useState<DailyChallengeClientState | null>(null)

  useEffect(() => {
    if (config.features.dailyChallenge) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- LocalStorage daily-session hydration
      setDailyState(loadDailyChallengeState())
    }
  }, [storyComplete])

  const showSecretPanel = secretPanelGenerated
  const showHypercert = !!hypercertUri
  const showDailyReveal = Boolean(dailyState?.incoSessionId) && dailyDisplay !== 'hidden'
  const basePaintDay = resolveBasePaintDay(articleUrl, dailyState?.day)
  // Post-story teaser: the story just became "more forms" — point at the hub.
  const showWorldsTeaser = Boolean(storyComplete)
    && process.env.NEXT_PUBLIC_FEATURE_SCENE_DIORAMA === 'true'
    && gameMode !== 'wordle'

  if (!showSecretPanel && !showHypercert && !showDailyReveal && !showWorldsTeaser) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {showDailyReveal && dailyState && (
        dailyDisplay === 'teaser' ? (
          <HiddenHandTeaser panelsDone={dailyPanelsDone} />
        ) : (
          <ModifierReveal
            gameId={gameId}
            gameSlug={gameSlug}
            gameTitle={gameTitle}
            sessionId={dailyState.incoSessionId}
            vaultAddress={dailyState.vaultAddress}
            modifierHandles={dailyState.modifierHandles}
            scoreHandle={dailyState.scoreHandle}
            isComplete={!!storyComplete}
            primaryColor={primaryColor}
            basePaintDay={basePaintDay}
            articleUrl={articleUrl}
          />
        )
      )}

      {showSecretPanel && (
        <SecretPanel
          gameId={gameId}
          gameSlug={gameSlug}
          primaryColor={primaryColor}
          promptVaultUuid={promptVaultUuid}
          isConnected={isConnected}
          walletAddress={address}
          nftTokenId={nftTokenId}
          storySessionId={storySessionId}
          storyComplete={storyComplete}
        />
      )}

      {showWorldsTeaser && (
        <Link
          href={`/games/${gameSlug}/worlds`}
          className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Boxes className="h-5 w-5 text-white/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Your story has more forms</p>
            <p className="text-xs text-white/60">Watch it as a film, walk through it as a 3D world, own it as an NFT.</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}

      {showHypercert && (
        <div className="flex justify-center">
          <HypercertBadge
            hypercertUri={hypercertUri}
            _hypercertCid={hypercertCid}
          />
        </div>
      )}
    </div>
  )
}
