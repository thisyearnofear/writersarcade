import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { config } from '@/lib/config'
import type { ScenePlan } from '@/domains/games/services/scene-planner.service'

/**
 * "One story, many worlds" — the canonical manifest of a game's artifact
 * family (comic, film, diorama, NFT). Pure read aggregation over data the
 * app already persists; shared by the /worlds hub page and any surface that
 * needs to answer "what else can this story be?".
 */

export type WorldArtifactStatus =
  | 'ready'      // exists — go experience it
  | 'rendering'  // being generated right now
  | 'available'  // can be generated (may cost credits)
  | 'failed'     // last attempt failed — retryable
  | 'minted'     // NFT claimed
  | 'hidden'     // not applicable to this game

export interface WorldArtifact {
  id: 'comic' | 'film' | 'diorama' | 'nft'
  title: string
  description: string
  status: WorldArtifactStatus
  /** Primary destination — play/watch/scene/finale. */
  href: string
  /** Credits required to unlock, when the artifact isn't free/ready. */
  costCredits?: number
  imageUrl?: string | null
  meta?: string
}

export interface WorldsGameInput {
  slug: string
  title: string
  mode: string
  imageUrl?: string | null
  nftTokenId?: string | null
  montageVideoUrl?: string | null
  videoUpsellStatus?: string | null
  artifactPanels?: Array<{ videoStatus: string; videoUrl: string | null }>
}

export interface WorldsSceneInput {
  status: string
  sceneJson?: unknown
  thumbnailUrl?: string | null
  error?: string | null
}

export function buildGameWorlds(game: WorldsGameInput, scene?: WorldsSceneInput | null): WorldArtifact[] {
  const artifacts: WorldArtifact[] = []
  const base = `/games/${game.slug}`

  // ── Comic — the canonical artifact; every story game has one. ──
  artifacts.push({
    id: 'comic',
    title: 'Comic',
    description: 'The interactive comic you played — every panel, every choice.',
    status: 'ready',
    href: `${base}?play=1`,
    imageUrl: game.imageUrl ?? null,
  })

  // ── Film — the run as a continuous video. ──
  const panels = game.artifactPanels ?? []
  const anyPending = panels.some((p) => p.videoStatus === 'pending')
  const filmRendering = game.videoUpsellStatus === 'pending' || anyPending
  const filmUrl = game.montageVideoUrl
    ?? panels.find((p) => p.videoUrl)?.videoUrl
    ?? null
  artifacts.push({
    id: 'film',
    title: 'Film',
    description: filmUrl
      ? 'Your run as a continuous film — every scene resolves into the next.'
      : 'Turn your run into a continuous film — every scene resolves into the next.',
    status: filmUrl ? 'ready' : filmRendering ? 'rendering' : 'available',
    href: filmUrl ? `${base}?watch=1` : base,
    costCredits: filmUrl || filmRendering ? undefined : CREDITS_CONFIG.cost['video-upsell'],
    imageUrl: filmUrl ? null : game.imageUrl ?? null,
    meta: filmUrl ? 'Watch' : filmRendering ? 'Rendering…' : undefined,
  })

  // ── Diorama — the explorable 3D world (story mode only, flag-gated). ──
  const scenePlan = scene?.sceneJson as ScenePlan | undefined
  const sceneTitle = scenePlan?.title
  if (game.mode !== 'wordle' && config.features.sceneDiorama) {
    const sceneStatus = scene?.status ?? 'idle'
    artifacts.push({
      id: 'diorama',
      title: '3D World',
      description: sceneStatus === 'completed'
        ? `Walk through "${sceneTitle ?? game.title}" — every panel becomes a place you can visit.`
        : 'Explore the story as a walkable 3D diorama — every panel becomes a place you can visit.',
      status: sceneStatus === 'completed' ? 'ready'
        : sceneStatus === 'pending' ? 'rendering'
        : sceneStatus === 'failed' ? 'failed'
        : 'available',
      href: `${base}/scene`,
      costCredits: sceneStatus === 'completed' || sceneStatus === 'pending' ? undefined : CREDITS_CONFIG.cost['generate-scene'],
      imageUrl: scene?.thumbnailUrl ?? null,
      meta: sceneStatus === 'completed' ? 'Enter' : sceneStatus === 'pending' ? 'Generating…' : sceneStatus === 'failed' ? 'Retry' : undefined,
    })
  }

  // ── NFT — ownership + the encrypted secret epilogue. ──
  artifacts.push({
    id: 'nft',
    title: 'NFT',
    description: game.nftTokenId
      ? `You own this story — token #${game.nftTokenId}.`
      : 'Mint this story to own it onchain and unlock the encrypted secret epilogue.',
    status: game.nftTokenId ? 'minted' : 'available',
    href: base,
    costCredits: game.nftTokenId ? undefined : CREDITS_CONFIG.cost['mint-nft'],
    imageUrl: game.imageUrl ?? null,
    meta: game.nftTokenId ? `#${game.nftTokenId}` : undefined,
  })

  return artifacts
}
