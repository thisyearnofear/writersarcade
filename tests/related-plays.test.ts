import { describe, expect, it } from 'vitest'
import { articleTile, pickRelatedGames, relatedHeading } from '@/domains/games/utils/related-plays'

const current = 'borrowed-time-a-life-in-transit'
const writerPool = [
  { slug: current, title: 'Borrowed Time', imageUrl: '/a.jpg', genre: 'Adventure' },
  { slug: 'other-debbie', title: 'Other Debbie', imageUrl: '/b.jpg', genre: 'Adventure' },
  { slug: 'third-debbie', title: 'Third', genre: 'Puzzle' },
]
const genrePool = [
  { slug: 'unrelated-adventure', title: 'Unrelated', imageUrl: '/c.jpg', genre: 'Adventure' },
  { slug: 'other-debbie', title: 'Dup', imageUrl: '/d.jpg', genre: 'Adventure' },
]

describe('pickRelatedGames', () => {
  it('prefers the same writer, skips the current game, and fills from genre', () => {
    const tiles = pickRelatedGames(current, writerPool, genrePool, 3)
    expect(tiles.map(tile => tile.slug)).toEqual([
      'other-debbie',
      'third-debbie',
      'unrelated-adventure',
    ])
  })

  it('ranks covers ahead of text-only tiles in the same pool', () => {
    const tiles = pickRelatedGames('current', [
      { slug: 'plain', title: 'Plain' },
      { slug: 'pictured', title: 'Pictured', imageUrl: '/p.jpg' },
    ], [])
    expect(tiles.map(tile => tile.slug)).toEqual(['pictured', 'plain'])
  })

  it('returns empty when nothing else exists', () => {
    expect(pickRelatedGames(current, writerPool.slice(0, 1), [])).toEqual([])
  })
})

describe('articleTile', () => {
  it('builds a host-labelled essay tile', () => {
    expect(articleTile('https://paragraph.com/@debbie/borrowed-time', 'Debbie Soon', 'Debbie Soon')).toEqual({
      href: 'https://paragraph.com/@debbie/borrowed-time',
      title: 'Debbie Soon on paragraph.com',
      host: 'paragraph.com',
      writer: 'Debbie Soon',
    })
  })

  it('returns null without a source URL', () => {
    expect(articleTile(null, 'Debbie Soon')).toBeNull()
  })
})

describe('relatedHeading', () => {
  it('names the writer when sibling games exist', () => {
    expect(relatedHeading('Debbie Soon', 2, 'Adventure', 'finale')).toBe('Play another from Debbie Soon')
    expect(relatedHeading('Debbie Soon', 0, 'Adventure', 'landing')).toBe('More Adventure')
  })
})
