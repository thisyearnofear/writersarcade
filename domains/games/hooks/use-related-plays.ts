'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Game } from '../types'
import {
  articleTile,
  pickRelatedGames,
  type RelatedArticleTile,
  type RelatedGameTile,
} from '../utils/related-plays'

type ListedGame = Pick<Game, 'slug' | 'title' | 'imageUrl' | 'genre'>

type GameListResponse = {
  success?: boolean
  data?: { games?: ListedGame[] }
}

async function fetchGames(params: URLSearchParams): Promise<ListedGame[]> {
  const response = await fetch(`/api/games?${params.toString()}`)
  const result = (await response.json()) as GameListResponse
  return result.success ? result.data?.games ?? [] : []
}

export function useRelatedPlays(game: Pick<Game, 'slug' | 'writerCoinId' | 'genre' | 'articleUrl' | 'authorParagraphUsername' | 'publicationName'>) {
  const [writerGames, setWriterGames] = useState<RelatedGameTile[]>([])
  const [genreGames, setGenreGames] = useState<RelatedGameTile[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const writerParams = new URLSearchParams({
          limit: '8',
          includeLegacy: 'true',
          sortBy: 'playCount',
        })
        const genreParams = new URLSearchParams({
          limit: '8',
          includeLegacy: 'true',
          sortBy: 'playCount',
        })
        if (game.writerCoinId) writerParams.set('writerCoinId', game.writerCoinId)
        if (game.genre) genreParams.set('genre', game.genre)

        const [writerPool, genrePool] = await Promise.all([
          game.writerCoinId ? fetchGames(writerParams) : Promise.resolve([]),
          game.genre ? fetchGames(genreParams) : Promise.resolve([]),
        ])

        if (cancelled) return
        setWriterGames(
          (writerPool || []).map(item => ({
            slug: item.slug,
            title: item.title,
            imageUrl: item.imageUrl,
            genre: item.genre,
          })),
        )
        setGenreGames(
          (genrePool || []).map(item => ({
            slug: item.slug,
            title: item.title,
            imageUrl: item.imageUrl,
            genre: item.genre,
          })),
        )
      } catch {
        if (!cancelled) {
          setWriterGames([])
          setGenreGames([])
        }
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [game.slug, game.writerCoinId, game.genre])

  const games = useMemo(
    () => pickRelatedGames(game.slug, writerGames, genreGames, 4),
    [game.slug, writerGames, genreGames],
  )
  const fromWriter = useMemo(
    () => writerGames.filter(item => item.slug !== game.slug).length,
    [writerGames, game.slug],
  )
  const article: RelatedArticleTile | null = useMemo(
    () => articleTile(game.articleUrl, game.authorParagraphUsername, game.publicationName),
    [game.articleUrl, game.authorParagraphUsername, game.publicationName],
  )

  return { games, article, fromWriter, loaded }
}
