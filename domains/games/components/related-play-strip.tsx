'use client'

import Link from 'next/link'
import { BookOpen, ExternalLink } from 'lucide-react'
import type { Game } from '../types'
import { useRelatedPlays } from '../hooks/use-related-plays'
import { relatedHeading, type RelatedArticleTile, type RelatedGameTile } from '../utils/related-plays'
import { trackEvent } from '@/services/analytics'
import { getWriterCoinById } from '@/lib/writer-coins'
import { cn } from '@/lib/utils'

const TILT = [-2.5, 1.8, -1.2, 2.2]

const GENRE_WASH: Record<string, string> = {
  Adventure: 'from-emerald-800 to-cyan-950',
  Action: 'from-red-800 to-amber-950',
  Strategy: 'from-blue-800 to-violet-950',
  Puzzle: 'from-violet-800 to-fuchsia-950',
  Simulation: 'from-amber-800 to-lime-950',
}

type Density = 'landing' | 'wait' | 'finale'

interface RelatedPlayStripProps {
  game: Pick<Game, 'slug' | 'writerCoinId' | 'genre' | 'articleUrl' | 'authorParagraphUsername' | 'publicationName'>
  density: Density
  className?: string
}

function tileSize(density: Density) {
  if (density === 'wait') return 'h-24 w-[4.5rem] sm:h-28 sm:w-20'
  if (density === 'finale') return 'h-40 w-28 sm:h-44 sm:w-32'
  return 'h-36 w-24 sm:h-40 sm:w-28'
}

function GameTile({
  tile,
  index,
  density,
  surface,
}: {
  tile: RelatedGameTile
  index: number
  density: Density
  surface: string
}) {
  const wash = GENRE_WASH[tile.genre || ''] || 'from-zinc-800 to-black'

  return (
    <li style={{ transform: `rotate(${TILT[index % TILT.length]}deg)` }}>
      <Link
        href={`/games/${tile.slug}`}
        title={tile.title}
        onClick={() =>
          trackEvent('play_clicked', {
            surface,
            gameSlug: tile.slug,
            action: 'related_game',
            genre: tile.genre,
          })
        }
        className={`group relative block ${tileSize(density)} overflow-hidden rounded-sm border border-white/15 bg-zinc-950 shadow-lg transition-transform hover:-translate-y-1 hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
      >
        {tile.imageUrl ? (
          <img src={tile.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={`flex h-full w-full items-end bg-gradient-to-br ${wash} p-2`}>
            <span className="font-serif text-[11px] leading-4 text-white/80 line-clamp-3">{tile.title}</span>
          </div>
        )}
        <span className="sr-only">{tile.title}</span>
      </Link>
    </li>
  )
}

function ArticleTile({
  article,
  density,
  surface,
  currentSlug,
}: {
  article: RelatedArticleTile
  density: Density
  surface: string
  currentSlug: string
}) {
  return (
    <li style={{ transform: `rotate(${TILT[3]}deg)` }}>
      <a
        href={article.href}
        target="_blank"
        rel="noopener noreferrer"
        title={article.title}
        onClick={() =>
          trackEvent('play_clicked', {
            surface,
            gameSlug: currentSlug,
            action: 'source_article',
          })
        }
        className={`group relative flex ${tileSize(density)} flex-col justify-between overflow-hidden rounded-sm border border-amber-200/25 bg-[#f4ecd8] p-2.5 text-zinc-900 shadow-lg transition-transform hover:-translate-y-1 hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
      >
        <BookOpen className="h-3.5 w-3.5 text-zinc-700" />
        <span className="min-w-0">
          <span className="block font-serif text-[11px] leading-4 line-clamp-3">{article.writer || article.title}</span>
          <span className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-600">
            {article.host}
            <ExternalLink className="h-2.5 w-2.5" />
          </span>
        </span>
      </a>
    </li>
  )
}

export function RelatedPlayStrip({ game, density, className }: RelatedPlayStripProps) {
  const { games, article, fromWriter, loaded } = useRelatedPlays(game)
  const gameLimit = density === 'wait' ? 2 : 3
  const visibleGames = games.slice(0, gameLimit)
  const showArticle = Boolean(article) && (density !== 'wait' || visibleGames.length < 2)
  const hasAnything = visibleGames.length > 0 || showArticle

  if (!loaded || !hasAnything) return null

  const heading = relatedHeading(
    game.authorParagraphUsername,
    fromWriter,
    game.genre,
    density,
  )
  const surface = `related_${density}`
  const writerHref = game.writerCoinId && getWriterCoinById(game.writerCoinId)
    ? `/writers/${game.writerCoinId}`
    : '/games'

  return (
    <section
      className={cn(
        density === 'wait'
          ? 'mt-4 w-full max-w-5xl'
          : 'mx-auto w-full max-w-6xl px-4 py-6',
        className,
      )}
      aria-label={heading}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className={`text-white ${density === 'wait' ? 'text-xs font-semibold uppercase tracking-wider text-white/55' : 'font-serif text-lg'}`}>
          {density === 'wait' ? 'Meanwhile' : heading}
        </h2>
        {density !== 'wait' ? (
          <Link href={writerHref} className="text-xs text-white/45 transition-colors hover:text-white">
            {fromWriter > 0 ? 'All from this writer' : 'Arcade'}
          </Link>
        ) : null}
      </div>
      <ul className="flex items-end gap-3 overflow-x-auto pb-2 pt-1">
        {visibleGames.map((tile, index) => (
          <GameTile key={tile.slug} tile={tile} index={index} density={density} surface={surface} />
        ))}
        {showArticle && article ? (
          <ArticleTile article={article} density={density} surface={surface} currentSlug={game.slug} />
        ) : null}
      </ul>
    </section>
  )
}
