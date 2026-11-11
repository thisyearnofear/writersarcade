'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useReducedMotion } from 'framer-motion'
import { TitleSequence, type TitleCard } from '@/components/generation/title-sequence'
import { STORY_BEAT_KIND_LABEL } from '@/components/worlds/story-beat-stack'
import type { StoryBeat } from '@/lib/story-beats'

/**
 * Watch — the same beats as title cards.
 * The first card is readable before play. The written list stays available
 * for reduced motion and for anyone who would rather read.
 */
export function StoryFilm({ slug, beats }: { slug: string; beats: StoryBeat[] }) {
  const reduced = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(beats.length <= 1)
  const [run, setRun] = useState(0)
  const handleEnd = useCallback(() => setFinished(true), [])

  const cards: TitleCard[] = beats.map((beat) => ({
    title: beat.kind === 'goal' || beat.kind === 'character' ? beat.body || beat.title : beat.title,
    label: beat.kind === 'character' ? beat.speaker ?? STORY_BEAT_KIND_LABEL.character : STORY_BEAT_KIND_LABEL[beat.kind],
    body: beat.kind === 'goal' || beat.kind === 'character' ? undefined : beat.body || undefined,
  }))

  const play = () => {
    setStarted(true)
    setFinished(false)
    setPlaying(true)
  }

  const replay = () => {
    setFinished(false)
    setPlaying(true)
    setRun((r) => r + 1)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:py-8">
      <p className="mb-4 text-sm text-white/55">
        Press play. Each card is one beat of the place you can walk.
      </p>

      <TitleSequence
        key={run}
        cards={cards}
        intervalMs={4200}
        playing={playing}
        loop={false}
        onEnd={handleEnd}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!started && !finished && (
          <button
            type="button"
            onClick={play}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Play
          </button>
        )}
        {started && !finished && (
          <button
            type="button"
            onClick={() => setPlaying((on) => !on)}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {playing ? 'Pause' : 'Resume'}
          </button>
        )}
        {finished && (
          <>
            <Link
              href={`/worlds/${slug}`}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90"
            >
              Walk this place
            </Link>
            <Link href={`/worlds/${slug}/comic`} className="px-2 py-2 text-sm font-semibold text-white/70 hover:text-white">
              Read it
            </Link>
            {beats.length > 1 && (
              <button type="button" onClick={replay} className="px-2 py-2 text-sm font-semibold text-white/70 hover:text-white">
                Replay
              </button>
            )}
          </>
        )}
      </div>

      <details className="mt-8 border-t border-white/10 pt-4" open={reduced ? true : undefined}>
        <summary className="cursor-pointer text-sm text-white/60 hover:text-white">Read the cards as text</summary>
        <ol className="mt-3 flex flex-col">
          {beats.map((beat) => (
            <li key={beat.id} className="border-b border-white/10 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {beat.kind === 'character' ? beat.speaker ?? beat.title : STORY_BEAT_KIND_LABEL[beat.kind]}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/85">
                {beat.kind === 'goal' || beat.kind === 'character' ? beat.body : beat.title}
              </p>
              {beat.kind === 'thread' && beat.body && (
                <p className="mt-1 text-sm leading-relaxed text-white/60">{beat.body}</p>
              )}
              {beat.kind === 'cover' && beat.body && (
                <p className="mt-1 text-sm leading-relaxed text-white/60">{beat.body}</p>
              )}
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
