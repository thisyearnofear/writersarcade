import { describe, it, expect, vi, beforeEach } from 'vitest'

// config.features.sceneDiorama is env-driven; stub it per test.
const featureState = { sceneDiorama: true }
vi.mock('@/lib/config', () => ({
  config: { features: { get sceneDiorama() { return featureState.sceneDiorama } } },
}))
vi.mock('@/lib/writer-coins', () => ({
  CREDITS_CONFIG: { cost: { 'video-upsell': 50, 'generate-scene': 20, 'mint-nft': 5 } },
}))

import { buildGameWorlds } from '@/lib/game-worlds'

const baseGame = {
  slug: 'test-game',
  title: 'Test Story',
  mode: 'story',
  imageUrl: 'https://img.example/cover.png',
}

describe('buildGameWorlds', () => {
  beforeEach(() => { featureState.sceneDiorama = true })

  it('always includes comic, film, and nft artifacts', () => {
    const worlds = buildGameWorlds(baseGame)
    expect(worlds.map((w) => w.id)).toEqual(['comic', 'film', 'diorama', 'nft'])
    expect(worlds[0].status).toBe('ready')
    expect(worlds[0].href).toBe('/games/test-game?play=1')
  })

  it('excludes diorama for wordle mode', () => {
    const worlds = buildGameWorlds({ ...baseGame, mode: 'wordle' })
    expect(worlds.map((w) => w.id)).toEqual(['comic', 'film', 'nft'])
  })

  it('excludes diorama when the feature flag is off', () => {
    featureState.sceneDiorama = false
    const worlds = buildGameWorlds(baseGame)
    expect(worlds.map((w) => w.id)).toEqual(['comic', 'film', 'nft'])
  })

  it('marks a completed scene as ready with its thumbnail', () => {
    const worlds = buildGameWorlds(baseGame, {
      status: 'completed',
      sceneJson: { title: 'Neon Boardroom' },
      thumbnailUrl: 'https://cdn.example/thumb.jpg',
    })
    const diorama = worlds.find((w) => w.id === 'diorama')!
    expect(diorama.status).toBe('ready')
    expect(diorama.href).toBe('/games/test-game/scene')
    expect(diorama.imageUrl).toBe('https://cdn.example/thumb.jpg')
    expect(diorama.costCredits).toBeUndefined()
  })

  it('marks an idle scene as available at the scene cost', () => {
    const worlds = buildGameWorlds(baseGame, null)
    const diorama = worlds.find((w) => w.id === 'diorama')!
    expect(diorama.status).toBe('available')
    expect(diorama.costCredits).toBe(20)
  })

  it('marks pending panels as film rendering and montage as ready', () => {
    const rendering = buildGameWorlds({
      ...baseGame,
      videoUpsellStatus: 'pending',
      artifactPanels: [{ videoStatus: 'pending', videoUrl: null }],
    })
    expect(rendering.find((w) => w.id === 'film')!.status).toBe('rendering')

    const ready = buildGameWorlds({ ...baseGame, montageVideoUrl: 'https://cdn.example/film.mp4' })
    const film = ready.find((w) => w.id === 'film')!
    expect(film.status).toBe('ready')
    expect(film.href).toBe('/games/test-game?watch=1')
  })

  it('marks minted games and hides cost', () => {
    const worlds = buildGameWorlds({ ...baseGame, nftTokenId: '42' })
    const nft = worlds.find((w) => w.id === 'nft')!
    expect(nft.status).toBe('minted')
    expect(nft.costCredits).toBeUndefined()
    expect(nft.meta).toBe('#42')
  })
})
