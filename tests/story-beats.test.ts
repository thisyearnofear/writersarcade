import { describe, expect, it } from 'vitest'
import { beatsFromScene, type StoryBeatSource } from '@/lib/story-beats'
import fixture from './fixtures/lighthouse-beats.json'

const scene = fixture as StoryBeatSource
const prompt = 'A lighthouse on a cliff at dusk, its beam sweeping the fog where a ship is missing'

describe('beatsFromScene', () => {
  it('reads the fixture as cover, goal, hooked threads, then characters', () => {
    const beats = beatsFromScene(scene, { prompt })
    expect(beats.map((beat) => beat.kind)).toEqual([
      'cover',
      'goal',
      'thread',
      'thread',
      'character',
      'character',
    ])
    expect(beats[0]).toMatchObject({ id: 'cover', title: 'The Missing Ship', body: prompt })
    expect(beats[1]).toMatchObject({
      id: 'goal',
      body: "Find the three pieces of evidence that reveal the Aurora's fate",
    })
    expect(beats[2]).toMatchObject({ id: 'thread-cargo-barrel', title: 'Cargo Barrel' })
    expect(beats[3]).toMatchObject({ id: 'thread-ships-wheel', title: "Ship's Wheel" })
    expect(beats[4]).toMatchObject({
      speaker: 'The Lighthouse Keeper',
      body: 'Relight the beam, or keep the cliff dark so the wreck stays hidden.',
    })
    expect(beats[5]).toMatchObject({
      speaker: 'Harbormaster Chen',
      body: 'Counts every ship that fails to make the harbor.',
    })
  })

  it('returns the cover only when the scene has no game', () => {
    const beats = beatsFromScene({ title: 'The Missing Ship', objects: scene.objects, npcs: scene.npcs }, { prompt })
    expect(beats).toEqual([{ id: 'cover', kind: 'cover', title: 'The Missing Ship', body: prompt }])
  })

  it('drops an objective that does not resolve to an object', () => {
    const ids = beatsFromScene(scene, { prompt }).map((beat) => beat.id)
    expect(ids).not.toContain('thread-missing-log')
  })

  it('drops a thread whose hook is only whitespace', () => {
    const ids = beatsFromScene(scene, { prompt }).map((beat) => beat.id)
    expect(ids).not.toContain('thread-broken-crate')
  })
})
