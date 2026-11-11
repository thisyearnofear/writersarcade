import Link from 'next/link'
import { STORY_BEAT_KIND_LABEL } from '@/components/worlds/story-beat-stack'
import type { StoryBeat } from '@/lib/story-beats'

/**
 * Read — the world's ScenePlan rendered as a comic strip.
 * One beat is one panel; the cover is the oversized first panel. Pure
 * function of the beat list: no planner call, no credits, refresh-safe.
 */
export function StoryComic({ slug, beats }: { slug: string; beats: StoryBeat[] }) {
  const [cover, ...rest] = beats
  let threadN = 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8">
      <ol className="flex flex-col gap-5">
        {cover && (
          <li className="rounded-2xl border border-white/20 bg-gradient-to-b from-white/10 to-white/5 p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              {STORY_BEAT_KIND_LABEL[cover.kind]}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-white sm:text-5xl">
              {cover.title}
            </h1>
            {cover.body && (
              <p className="mt-4 max-w-prose text-base leading-relaxed text-white/75 sm:text-lg">
                {cover.body}
              </p>
            )}
          </li>
        )}

        {rest.map((beat) => {
          const isThread = beat.kind === 'thread'
          const panelIndex = isThread ? ++threadN : null
          const isGoal = beat.kind === 'goal'
          const isCharacter = beat.kind === 'character'

          return (
            <li
              key={beat.id}
              className={
                isGoal
                  ? 'rounded-2xl border border-brand/30 bg-brand/5 p-6'
                  : 'rounded-2xl border border-white/10 bg-white/5 p-6'
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={
                    isGoal
                      ? 'text-xs font-semibold uppercase tracking-[0.3em] text-brand'
                      : 'text-xs font-semibold uppercase tracking-[0.3em] text-white/40'
                  }
                >
                  {STORY_BEAT_KIND_LABEL[beat.kind]}
                  {panelIndex !== null && (
                    <span className="ml-2 text-white/30">{String(panelIndex).padStart(2, '0')}</span>
                  )}
                </p>
                {isCharacter && beat.speaker && (
                  <p className="font-serif text-sm italic text-white/50">{beat.speaker}</p>
                )}
              </div>
              <h2 className="mt-2 font-serif text-xl font-bold leading-snug text-white">
                {beat.title}
              </h2>
              {beat.body && (
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/80">
                  {beat.body}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      <nav className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm">
        <Link href={`/worlds/${slug}`} className="text-white/60 transition hover:text-white">
          ← Walk this world
        </Link>
        <Link href={`/worlds/${slug}/film`} className="text-brand transition hover:text-white">
          Watch this story →
        </Link>
      </nav>
    </div>
  )
}
