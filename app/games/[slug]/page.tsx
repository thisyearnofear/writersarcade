import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GameArtifactView } from '@/domains/games/components/game-artifact-view'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import { IPAttribution } from '@/domains/games/components/ip-attribution'
import { GameOwnershipProgress } from '@/domains/games/components/game-ownership-progress'
import { PlayWelcomeCoach } from '@/components/onboarding/play-welcome-coach'
import { getSecretPanelStatus, formatSecretPanelDetail } from '@/lib/secret-panel-status'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { GameGeneratingView } from '@/domains/games/components/game-generating-view'
import { GameWatchView } from '@/domains/games/components/game-watch-view'
import { PlayGameClient } from './PlayGameClient'
import { getActor } from '@/services/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/config'

// Play mode includes viewer-specific ownership and insights capabilities, so
// avoid caching one visitor's owner state for other visitors. Read-only
// artifact pages can be split into a separately cached route later.
export const dynamic = 'force-dynamic'

interface GamePageProps {
  params: Promise<{
    slug: string
  }>
  searchParams?: Promise<{
    play?: string
    watch?: string
    unlocked?: string
  }>
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params
  const query = await searchParams
  const isPlayMode = query?.play === '1'
  const isWatchMode = query?.watch === '1'
  const isUnlockShare = Boolean(query?.unlocked)
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    notFound()
  }

  // Record-first generation: the row exists before the AI pipeline finishes.
  // Show the "writing your story" view — it polls /status and refreshes into
  // the real page when ready, or surfaces retry on failure.
  if (game.generationStatus !== 'ready') {
    return (
      <ThemeWrapper theme="arcade">
        <GameGeneratingView
          slug={game.slug}
          title={game.title}
          initialStatus={game.generationStatus}
          initialError={game.generationError}
        />
      </ThemeWrapper>
    )
  }

  // Watch mode: a shared-run landing that plays the game's generated panel
  // videos full-bleed before offering play. Falls through to the normal
  // artifact/play views when no video exists yet.
  if (isWatchMode) {
    const videoPanels = await prisma.gameArtifactPanel.findMany({
      where: { gameId: game.id, videoUrl: { not: null } },
      orderBy: { panelIndex: 'asc' },
      select: { videoUrl: true, panelIndex: true },
    })
    const clipUrls = videoPanels.map(p => p.videoUrl!).filter(Boolean)
    // Prefer the assembled continuous film; fall back to sequential clips.
    const videoUrls =
      game.montageVideoUrl?.startsWith('http')
        ? [game.montageVideoUrl]
        : clipUrls
    if (videoUrls.length > 0) {
      return (
        <ThemeWrapper theme="arcade">
          <div className="min-h-screen bg-black">
            <GameWatchView slug={game.slug} title={game.title} videoUrls={videoUrls} coverUrl={game.imageUrl} />
          </div>
        </ThemeWrapper>
      )
    }
  }

  const actor = await getActor()
  const viewerIsOwner = Boolean(
    actor && (
      (game.userId && game.userId === actor.user.id) ||
      (actor.user.walletAddress && (
        actor.user.walletAddress.toLowerCase() === game.ownerWallet?.toLowerCase() ||
        actor.user.walletAddress.toLowerCase() === game.creatorWallet?.toLowerCase()
      ))
    )
  )

  const siteUrl = getSiteUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.description,
    url: `${siteUrl}/games/${encodeURIComponent(game.slug)}`,
    gamePlatform: 'writersarcade',
    applicationCategory: 'Game',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: game.authorParagraphUsername || 'Anonymous',
    },
    datePublished: game.createdAt.toISOString(),
    image: game.imageUrl || `${siteUrl}/og`,
  }

  // Cover art is the landing page's primary asset. Kick generation even when
  // the visitor never enters play mode, otherwise text-only artifacts churn.
  if (game.mode !== 'wordle' && !game.imageUrl) {
    ImageGenerationService.generateGameImage(game).then(result => {
      if (result.imageUrl) {
        GameDatabaseService.updateGameImage(game.id, result.imageUrl).catch((err) => logger.error('Failed to update game image', err, { gameId: game.id }))
      }
    }).catch((err) => logger.error('Cover image generation failed', err, { gameSlug: game.slug }))
  }

  const currentUserWallet = actor?.user.walletAddress ?? undefined

  if (!isPlayMode && !isUnlockShare) {
    return (
      <ThemeWrapper theme="arcade">
        <div className="min-h-screen bg-black">
          <Header />
          <GameArtifactView game={game} currentUserWallet={currentUserWallet} />
          <Footer />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </div>
      </ThemeWrapper>
    )
  }

  // Wordle-mode games render a Wordle interface instead of the comic-story interface
  // The answer is NEVER stored in plaintext — read from Inco on the client
  if (game.mode === 'wordle') {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <GameOwnershipProgress game={game} variant="strip" />
        </div>
        <PlayGameClient game={game} isOwner={viewerIsOwner} maxAttempts={WordleService.DEFAULT_MAX_ATTEMPTS} />
      </div>
    )
  }

  // Extract and flatten assets for the attribution component
   
  type LinkedAsset = { id: string; title: string; type: string; storyRegistration?: { storyIpId: string; status: string } | null }
  const gameWithAssets = game as typeof game & { gamesFromAssets?: { asset: LinkedAsset }[] }
  const linkedAssets = gameWithAssets.gamesFromAssets?.map((relation) => relation.asset) || []

  return (
    <div className="min-h-screen bg-black">
      {isUnlockShare && (
        <div className="border-b border-emerald-500/20 bg-emerald-950/35 px-4 py-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Vault unlocked</p>
              <h1 className="mt-1 text-lg font-semibold text-white">
                Someone unlocked the secret panel for {game.title}
              </h1>
              <p className="mt-1 text-sm text-emerald-100/75">
                This share link points to a token-gated epilogue protected by the game NFT and Inco.
              </p>
            </div>
            {game.promptVaultUuid && (
              <div className="rounded-md border border-emerald-500/20 bg-black/30 px-3 py-2 text-xs text-emerald-100">
                {formatSecretPanelDetail(getSecretPanelStatus(game))}
              </div>
            )}
          </div>
        </div>
      )}
      {linkedAssets.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <IPAttribution assets={linkedAssets} compact />
        </div>
      )}
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <GameOwnershipProgress game={game} variant="strip" />
      </div>
      <PlayWelcomeCoach gameSlug={game.slug} />
      <ErrorBoundary>
        <PlayGameClient game={game} isOwner={viewerIsOwner} maxAttempts={WordleService.DEFAULT_MAX_ATTEMPTS} />
      </ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'
}

export async function generateMetadata({ params, searchParams }: GamePageProps) {
  if (!process.env.DATABASE_URL) {
    return {
      title: 'writersarcade Game',
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

  const query = await searchParams
  const isUnlockShare = Boolean(query?.unlocked)
  const siteUrl = getSiteUrl()
  // Branded composite card (cover + title + genre + panel strip + Animated badge).
  const ogImage = isUnlockShare
    ? `/games/${encodeURIComponent(slug)}/unlock-og`
    : `/games/${encodeURIComponent(slug)}/og`

  // When a completed hero animation exists, expose it as a video embed so the
  // shared link plays in-app instead of degrading to a static card. Never emit
  // a placeholder/pending URL.
  let heroVideoUrl: string | null = null
  try {
    const hero = await prisma.game.findFirst({
      where: { slug },
      select: {
        artifactPanels: {
          where: { videoStatus: 'completed' },
          select: { videoUrl: true },
          orderBy: { panelIndex: 'desc' },
          take: 1,
        },
      },
    })
    heroVideoUrl = hero?.artifactPanels?.[0]?.videoUrl ?? null
  } catch {
    heroVideoUrl = null
  }
  const hasVideo = Boolean(!isUnlockShare && heroVideoUrl)

  return {
    title: isUnlockShare
      ? `Secret panel unlocked: ${game.title}`
      : `${game.title} - writersarcade`,
    description: isUnlockShare
      ? `A secret panel was unlocked for "${game.title}" on writersarcade.`
      : game.description,
    openGraph: {
      title: isUnlockShare ? `I unlocked the secret panel of ${game.title}` : game.title,
      description: isUnlockShare
        ? 'Verified unlock proof with vault UUID and gate NFT context.'
        : game.description,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630 }],
      ...(hasVideo && heroVideoUrl
        ? {
            videos: [{
              url: heroVideoUrl,
              secureUrl: heroVideoUrl,
              type: 'video/mp4',
              width: 1080,
              height: 1920,
            }],
          }
        : {}),
    },
    twitter: {
      card: hasVideo ? 'player' : 'summary_large_image',
      title: isUnlockShare ? `I unlocked the secret panel of ${game.title}` : game.title,
      description: isUnlockShare ? 'Verified unlock proof on writersarcade.' : game.description,
      images: [ogImage],
      ...(hasVideo && heroVideoUrl
        ? { players: [{ playerUrl: `${siteUrl}/embed/${encodeURIComponent(slug)}`, streamUrl: heroVideoUrl, width: 1080, height: 1920 }] }
        : {}),
    },
  }
}
