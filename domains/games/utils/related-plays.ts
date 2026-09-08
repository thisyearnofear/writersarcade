export type RelatedGameTile = {
  slug: string
  title: string
  imageUrl?: string
  genre?: string
}

export type RelatedArticleTile = {
  href: string
  title: string
  host: string
  writer?: string
}

export type RelatedPlayCatalog = {
  games: RelatedGameTile[]
  article: RelatedArticleTile | null
  fromWriter: number
}

type GameLike = {
  slug: string
  title: string
  imageUrl?: string | null
  genre?: string | null
}

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function pickRelatedGames(
  currentSlug: string,
  writerGames: GameLike[],
  genreGames: GameLike[],
  limit = 3,
): RelatedGameTile[] {
  const seen = new Set([currentSlug])
  const tiles: RelatedGameTile[] = []

  for (const pool of [writerGames, genreGames]) {
    const ranked = [...pool].sort(
      (a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)),
    )
    for (const game of ranked) {
      if (!game.slug || seen.has(game.slug)) continue
      seen.add(game.slug)
      tiles.push({
        slug: game.slug,
        title: game.title,
        imageUrl: game.imageUrl || undefined,
        genre: game.genre || undefined,
      })
      if (tiles.length >= limit) return tiles
    }
  }

  return tiles
}

export function articleTile(
  articleUrl?: string | null,
  writer?: string | null,
  publication?: string | null,
): RelatedArticleTile | null {
  if (!articleUrl) return null
  return {
    href: articleUrl,
    title: writer ? `${writer} on ${hostnameLabel(articleUrl)}` : (publication || 'Source essay'),
    host: hostnameLabel(articleUrl),
    writer: writer || undefined,
  }
}

export function relatedHeading(
  writer?: string | null,
  fromWriter = 0,
  genre?: string | null,
  density: 'landing' | 'wait' | 'finale' = 'landing',
): string {
  if (writer && fromWriter > 0) {
    return density === 'finale' ? `Play another from ${writer}` : `More from ${writer}`
  }
  if (genre) return density === 'finale' ? `Play another ${genre}` : `More ${genre}`
  return density === 'finale' ? 'Play another story' : 'More in the arcade'
}
