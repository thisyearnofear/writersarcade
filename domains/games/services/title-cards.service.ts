import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'

/**
 * Cover imagery for the shared loading "title sequence".
 *
 * The cards are real artefacts the platform has produced — comic covers,
 * 3D world thumbnails, film stills — so the wait shows what the product
 * makes rather than decorative filler. Falls back to typographic cards when
 * the corpus is empty.
 */

export interface ArtefactCover {
  imageUrl: string | null
  title: string
  label: string
  accent?: string
}

const ACCENTS = ['#ffcc00', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']

export interface TitleCardSource {
  /** A card per artefact family. */
  cards: ArtefactCover[]
}

/**
 * Collect covers for the three artefact families the platform makes.
 * `excludeTitle` keeps the card currently being generated out of the reel.
 */
export async function collectTitleCards(excludeTitle?: string): Promise<ArtefactCover[]> {
  const cards: ArtefactCover[] = []

  try {
    const [comics, films, worlds] = await Promise.all([
      prisma.game.findMany({
        where: { private: false, imageUrl: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { title: true, imageUrl: true },
      }),
      prisma.game.findMany({
        where: { private: false, montageVideoUrl: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { title: true, imageUrl: true, montageVideoUrl: true },
      }),
      prisma.gameScene.findMany({
        where: { status: 'completed', thumbnailUrl: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: {
          thumbnailUrl: true,
          sceneJson: true,
          game: { select: { title: true } },
        },
      }),
    ])

    comics.forEach((g, i) => {
      cards.push({
        imageUrl: g.imageUrl,
        title: g.title,
        label: 'Interactive comic',
        accent: ACCENTS[i % ACCENTS.length],
      })
    })

    films.forEach((g, i) => {
      cards.push({
        imageUrl: g.imageUrl,
        title: g.title,
        label: 'Film',
        accent: ACCENTS[(i + 2) % ACCENTS.length],
      })
    })

    worlds.forEach((w, i) => {
      const sceneTitle = (w.sceneJson as { title?: string } | null)?.title
      cards.push({
        imageUrl: w.thumbnailUrl,
        title: sceneTitle || w.game.title,
        label: '3D world',
        accent: ACCENTS[(i + 3) % ACCENTS.length],
      })
    })
  } catch (error) {
    console.error('[title-cards] failed to collect covers:', error)
  }

  // Don't tease the thing that is currently being generated.
  const filtered = excludeTitle
    ? cards.filter((c) => c.title.toLowerCase() !== excludeTitle.toLowerCase())
    : cards

  return filtered
}

/**
 * Static fallback cards, used when the corpus is empty (fresh install, or a
 * deploy before any public content exists).
 */
export function fallbackTitleCards(): ArtefactCover[] {
  return [
    { imageUrl: null, title: 'A comic', label: 'Interactive comic', accent: '#ffcc00' },
    { imageUrl: null, title: 'A 3D world', label: 'Walkable diorama', accent: '#34d399' },
    { imageUrl: null, title: 'A film', label: 'Your run, rendered', accent: '#60a5fa' },
  ]
}

/** Whether the 3D surface is available (the loading reel may reference it). */
export function hasSceneFeature(): boolean {
  return Boolean(config.features.sceneDiorama)
}
