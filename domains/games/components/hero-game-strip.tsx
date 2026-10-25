'use client'

import Link from 'next/link'

export interface SampleGame {
  slug: string
  title: string
  imageUrl?: string
}

/** Below this we render nothing — a two-tile "strip" reads as a bug, not proof. */
const MIN_TILES = 3
const MAX_TILES = 5

/** Slight alternating tilt so the row reads as a comic strip rather than a logo bar. */
const TILT = [-3, 1.5, -1, 2.5, -2]

/**
 * Proof-of-product strip for the hero.
 *
 * Presentational: the homepage owns the fetch so the same games also back the
 * primary CTA, and one request serves both. Silent when under-populated, per the
 * empty-state policy on the homepage sections.
 */
export function HeroGameStrip({ games }: { games: SampleGame[] }) {
  if (games.length < MIN_TILES) return null

  return (
    <div className="mt-8 flex flex-col items-center gap-3 animate-slide-up [animation-delay:150ms] [animation-fill-mode:both] motion-reduce:animate-none">
      <ul className="flex items-center justify-center gap-2 sm:gap-3">
        {games.slice(0, MAX_TILES).map((game, index) => (
          <li key={game.slug}>
            <Link
              href={`/games/${game.slug}`}
              title={game.title}
              className="group block overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-all hover:z-10 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              style={{ rotate: `${TILT[index % TILT.length]}deg` }}
            >
              {/* Plain img matches GameCard: remote covers aren't in next/image domains. */}
              <img
                src={game.imageUrl}
                alt=""
                width={80}
                height={80}
                loading="eager"
                decoding="async"
                fetchPriority={index < 3 ? 'high' : undefined}
                className="h-16 w-16 object-cover transition-transform duration-500 group-hover:scale-105 sm:h-20 sm:w-20"
              />
              <span className="sr-only">{game.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Real games, generated from real articles</p>
    </div>
  )
}
