import { getSecretPanelStatus, type SecretPanelGameFields } from '@/lib/secret-panel-status'

export type GameProgressPhase =
  | 'draft'
  | 'ready_to_play'
  | 'played'
  | 'completed'
  | 'secret_ready'
  | 'minted'

export interface GameProgressInput extends SecretPanelGameFields {
  playCount?: number
  lastPlayedAt?: Date | string | null
  nftTokenId?: string | null
  hasDailySession?: boolean
}

export interface GameProgress {
  phase: GameProgressPhase
  secretStatus: ReturnType<typeof getSecretPanelStatus>
  playCount: number
  hasDailySession: boolean
  chipLabel: string
  nextStepLabel: string | null
}

export function getGameProgress(game: GameProgressInput): GameProgress {
  const secretStatus = getSecretPanelStatus(game)
  const playCount = game.playCount ?? 0
  const hasDailySession = game.hasDailySession ?? false
  const minted = Boolean(game.nftTokenId)

  let phase: GameProgressPhase = 'draft'

  if (minted) {
    phase = 'minted'
  } else if (secretStatus.kind === 'inco' || secretStatus.kind === 'legacy') {
    phase = 'secret_ready'
  } else if (playCount > 0) {
    phase = playCount >= 1 ? 'played' : 'ready_to_play'
  } else {
    phase = 'ready_to_play'
  }

  let chipLabel = 'Ready to play'
  if (hasDailySession) chipLabel = 'Daily run active'
  else if (phase === 'minted') chipLabel = 'Minted'
  else if (phase === 'secret_ready') chipLabel = 'Secret epilogue ready'
  else if (phase === 'played') chipLabel = 'Played'
  else chipLabel = 'Not played yet'

  let nextStepLabel: string | null = 'Play your story'
  if (phase === 'minted') nextStepLabel = null
  else if (phase === 'secret_ready' && !minted) nextStepLabel = 'Mint to own & unlock epilogue'
  else if (phase === 'played' && secretStatus.kind === 'pending') nextStepLabel = 'Mint to store secret on-chain'
  else if (phase === 'played') nextStepLabel = 'Play again or mint'

  return {
    phase,
    secretStatus,
    playCount,
    hasDailySession,
    chipLabel,
    nextStepLabel,
  }
}
