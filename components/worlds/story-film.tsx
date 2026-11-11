'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { TitleSequence, type TitleCard } from '@/components/generation/title-sequence'
import { StoryBeatStack, STORY_BEAT_KIND_LABEL } from '@/components/worlds/story-beat-stack'
import type { StoryBeat } from '@/lib/story-beats'

/**
 * Watch — the same beats played as a title-card cut of the story.
 * No planner call, no credits, no Game row. The beat list renders
 * underneath so the film is readable without motion.
 */
export function StoryFilm({ slug, beats }: { slug: string; beats: StoryBeat[] }) {
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(beats.length <= 1)
  const [run, setRun] = useState(0)
  const handleEnd = useCallback(() => setFinished(true), [])

  const cards: TitleCard[] = beats.map((beat) => ({
    title: beat.title,
    label: STORY_BEAT_KIND_LABEL[beat.kind],
    body: beat.body || undefined,
  }))

  const replay = () => {
    setFinished(false)
    setPlaying(true)
    setRun((r) => r + 1)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          Title-card cut
        </p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/60">
          The same story the world walks you through, read as title cards. Motion and
          drawn panels are part of the paid comic — this cut costs nothing.
        </p>
      </header>

      <div className="relative">
        <TitleSequence
          key={run}
          cards={cards}
          intervalMs={4000}
          playing={playing}
          loop={false}
          onEnd={handleEnd}
        />

        {!playing && !finished && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the story"
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/20"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {finished && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            href={`/worlds/${slug}`}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
          >
            Walk this story
          </Link>
          {beats.length > 1 && (
            <button
              type="button"
              onClick={replay}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white/60 transition hover:text-white"
            >
              Replay
            </button>
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          The script
        </h2>
        <StoryBeatStack beats={beats} />
      </section>
    </div>
  )
}
