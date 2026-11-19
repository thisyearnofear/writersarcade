// Pulp-arcade cover art (Recraft style 30fedbf7) used as the fallback when a
// game has no generated imageUrl. Covers exist for the five canonical
// GENRE_STYLES keys plus fiction-genre keywords the AI tags stories with.

const EXACT: Record<string, string> = {
  Adventure: '/covers/adventure.webp',
  Action: '/covers/action.webp',
  Strategy: '/covers/strategy.webp',
  Puzzle: '/covers/puzzle.webp',
  Simulation: '/covers/simulation.webp',
}

const KEYWORDS: Array<[string, string]> = [
  ['noir', '/covers/noir.webp'],
  ['detect', '/covers/noir.webp'],
  ['crime', '/covers/noir.webp'],
  ['mystery', '/covers/noir.webp'],
  ['sci', '/covers/sci-fi.webp'],
  ['space', '/covers/sci-fi.webp'],
  ['robot', '/covers/sci-fi.webp'],
  ['fantasy', '/covers/fantasy.webp'],
  ['magic', '/covers/fantasy.webp'],
  ['dragon', '/covers/fantasy.webp'],
  ['horror', '/covers/horror.webp'],
  ['ghost', '/covers/horror.webp'],
  ['spook', '/covers/horror.webp'],
  ['romance', '/covers/romance.webp'],
  ['love', '/covers/romance.webp'],
  ['adventure', '/covers/adventure.webp'],
  ['quest', '/covers/adventure.webp'],
  ['action', '/covers/action.webp'],
  ['strategy', '/covers/strategy.webp'],
  ['puzzle', '/covers/puzzle.webp'],
  ['simul', '/covers/simulation.webp'],
]

export function genreCoverUrl(genre: string | null | undefined): string | null {
  if (!genre) return null
  if (EXACT[genre]) return EXACT[genre]
  const g = genre.toLowerCase()
  for (const [kw, cover] of KEYWORDS) {
    if (g.includes(kw)) return cover
  }
  return null
}
