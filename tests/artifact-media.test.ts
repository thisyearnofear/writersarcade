import { describe, expect, it } from 'vitest'
import { coverFocalClass, getPanelMedia } from '@/domains/games/utils/artifact-media'

describe('getPanelMedia', () => {
  it('prefers a finished or draft video over stills', () => {
    expect(getPanelMedia({
      videoUrl: 'https://cdn.example/clip.mp4',
      videoDraftUrl: 'https://cdn.example/draft.mp4',
      videoStillUrl: 'https://cdn.example/still.jpg',
      imageUrl: 'https://cdn.example/panel.jpg',
    })).toEqual({ kind: 'video', src: 'https://cdn.example/clip.mp4' })
  })

  it('falls back through still, panel image, then cover', () => {
    expect(getPanelMedia({ videoStillUrl: 'https://cdn.example/still.jpg' }))
      .toEqual({ kind: 'image', src: 'https://cdn.example/still.jpg' })
    expect(getPanelMedia({ imageUrl: 'https://cdn.example/panel.jpg' }))
      .toEqual({ kind: 'image', src: 'https://cdn.example/panel.jpg' })
    expect(getPanelMedia({}, 'https://cdn.example/cover.jpg'))
      .toEqual({ kind: 'image', src: 'https://cdn.example/cover.jpg', reuseCover: true })
  })

  it('returns a poster when nothing visual exists', () => {
    expect(getPanelMedia({})).toEqual({ kind: 'poster' })
  })
})

describe('coverFocalClass', () => {
  it('varies crop so reused covers do not look identical', () => {
    expect(coverFocalClass(0)).not.toBe(coverFocalClass(2))
    expect(coverFocalClass(5)).toBe(coverFocalClass(0))
  })
})
