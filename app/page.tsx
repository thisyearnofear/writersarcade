import { HomeClient } from './home-client'
import { getTaggedPublicGamesWithClips } from '@/domains/games/services/public-games.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { getBasePaintDay } from '@/lib/basepaint/day'
import { getBasePaintCanvasProxyUrl, getBasePaintAnimationUrl } from '@/lib/basepaint/urls'
import type { SampleGame } from '@/domains/games/components/hero-game-strip'
import type { HeroTransformationProps } from '@/domains/games/components/hero-transformation'
import type { ManyFormsData } from '@/domains/games/components/many-forms-strip'

export const revalidate = 300

type HeroGame = SampleGame & { clipVideoUrl?: string; montageVideoUrl?: string }

/**
 * Timelapse MP4s lag the canvas by ~a day — today's often 404s. Probe HEAD
 * (today, then yesterday) so the daily card never mounts a dead <video>.
 * Runs inside the page's 5-minute ISR revalidate, so the probe is cheap.
 */
async function resolveBasePaintAnimation(day: number): Promise<string | undefined> {
  for (const d of [day, day - 1]) {
    if (d < 1) continue
    const url = getBasePaintAnimationUrl(d)
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch {
      // CDN unreachable — try the previous day, then give up.
    }
  }
  return undefined
}

export default async function HomePage() {
  let initialSampleGames: HeroGame[] = []
  let initialStats: { publicGames: number; totalPlays: number } | null = null
  let featuredArtifact: HeroTransformationProps | undefined
  // BasePaint day is date-derived, not DB-derived — the daily card always
  // has fresh art even when every other query below comes back empty.
  const basePaintDay = getBasePaintDay()
  const basePaintAnimation = await resolveBasePaintAnimation(basePaintDay)
  const manyForms: ManyFormsData = {
    daily: {
      imageUrl: getBasePaintCanvasProxyUrl(basePaintDay),
      videoUrl: basePaintAnimation,
      href: '/basepaint',
      label: `BasePaint Day ${basePaintDay}`,
      title: "Today's collaborative canvas",
    },
  }
  try {
    const [gamesResult, artifactResult, stats, filmGame, wordleGame, latestScene] = await Promise.all([
      // Hero strip: publishable games with a cover — artifact presence is
      // play-derived, so gating on it hid every freshly generated game.
      getTaggedPublicGamesWithClips({ limit: 5, requireImage: true, requireProvenance: true }),
      // The article→comic artifact showcase still needs real panels.
      getTaggedPublicGamesWithClips({ limit: 15, requireArtifact: true, requireProvenance: true }),
      GameDatabaseService.getGameStats(),
      // "Many forms" strip: newest public game that already has a film.
      prisma.game.findFirst({
        where: {
          private: false,
          NOT: { generationStatus: 'failed' },
          montageVideoUrl: { startsWith: 'http' },
        },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, title: true, montageVideoUrl: true, imageUrl: true },
      }),
      // Wordle card — hidden until a public wordle game exists.
      prisma.game.findFirst({
        where: { mode: 'wordle', private: false },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, title: true, imageUrl: true },
      }),
      // Shared by the hero's world tile and the strip's world card.
      config.features.sceneDiorama
        ? prisma.gameScene.findFirst({
            where: { status: 'completed', thumbnailUrl: { not: null } },
            orderBy: { updatedAt: 'desc' },
            select: { thumbnailUrl: true, game: { select: { slug: true, title: true } } },
          })
        : Promise.resolve(null),
    ])
    initialSampleGames = gamesResult.games.map((g) => ({
      slug: g.slug,
      title: g.title,
      imageUrl: g.imageUrl ?? undefined,
      clipVideoUrl: (g as { clipVideoUrl?: string }).clipVideoUrl,
      montageVideoUrl: g.montageVideoUrl ?? undefined,
    }))
    initialStats = { publicGames: stats.publicGames, totalPlays: stats.totalPlays }

    // The hero's article→comic artifact needs one game born from a real
    // article plus its generated panels. First match wins; anything short of
    // three panels falls back to the generic game strip.
    const sourceGame = artifactResult.games.find((g) => g.articleUrl)
    if (sourceGame) {
      const panels = await prisma.gameArtifactPanel.findMany({
        where: { gameId: sourceGame.id, imageUrl: { not: null } },
        orderBy: { panelIndex: 'asc' },
        take: 5,
        select: { imageUrl: true },
      })
      const panelUrls = panels
        .map((p) => p.imageUrl)
        .filter((u): u is string => Boolean(u))
      if (panelUrls.length >= 3) {
        // Third visual beat: a real auto-captured world thumbnail, when the
        // scene pipeline has produced one. Silent otherwise. The tile links
        // to the scene's own game — the thumbnail may come from any story.
        let worldImage: string | undefined
        let worldHref: string | undefined
        if (latestScene?.thumbnailUrl) {
          worldImage = latestScene.thumbnailUrl
          worldHref = `/games/${latestScene.game.slug}/scene`
        }
        featuredArtifact = {
          slug: sourceGame.slug,
          title: sourceGame.title,
          panels: panelUrls,
          author: sourceGame.authorParagraphUsername,
          publication: sourceGame.publicationName,
          worldImage,
          worldHref,
          clipUrl: (sourceGame as { clipVideoUrl?: string }).clipVideoUrl,
        }
      }
    }
    // "Many forms" cards — each only renders when its real artifact exists.
    if (featuredArtifact) {
      manyForms.comic = {
        href: `/games/${featuredArtifact.slug}`,
        title: featuredArtifact.title,
        images: featuredArtifact.panels.slice(0, 4),
        label: 'Interactive comic',
      }
    } else {
      const g = initialSampleGames[0]
      if (g?.imageUrl) {
        manyForms.comic = {
          href: `/games/${g.slug}`,
          title: g.title,
          images: [g.imageUrl],
          label: 'Interactive comic',
        }
      }
    }
    if (filmGame?.montageVideoUrl) {
      manyForms.film = {
        href: `/games/${filmGame.slug}`,
        title: filmGame.title,
        videoUrl: filmGame.montageVideoUrl,
        posterUrl: filmGame.imageUrl ?? undefined,
        label: 'Animated film',
      }
    }
    if (latestScene?.thumbnailUrl) {
      manyForms.world = {
        href: `/games/${latestScene.game.slug}/scene`,
        title: latestScene.game.title,
        imageUrl: latestScene.thumbnailUrl,
        label: 'Walkable 3D world',
      }
    }
    if (wordleGame) {
      manyForms.wordle = {
        href: `/games/${wordleGame.slug}`,
        title: wordleGame.title,
        imageUrl: wordleGame.imageUrl ?? undefined,
        label: 'Word puzzle',
      }
    }
  } catch {
    // Client hooks refetch when the initial values are empty; the hero then
    // falls back to the sample-games strip without an artifact.
  }
  return (
    <HomeClient
      initialSampleGames={initialSampleGames}
      initialStats={initialStats}
      featuredArtifact={featuredArtifact}
      manyForms={manyForms}
    />
  )
}
