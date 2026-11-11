import Link from 'next/link'
import { STORY_BEAT_KIND_LABEL } from '@/components/worlds/story-beat-stack'
import type { StoryBeat } from '@/lib/story-beats'

/**
 * Read — one beat, one panel. The cover is the first page.
 * The goal sentence and each character's line are the panel, so the label
 * is not repeated as a second heading.
 */
export function StoryComic({ slug, beats }: { slug: string; beats: StoryBeat[] }) {
  const [cover, ...rest] = beats
  let threadN = 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8">
      <ol className="flex flex-col gap-4">
        {cover && (
          <li className="border-b border-white/10 pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              {STORY_BEAT_KIND_LABEL[cover.kind]}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
              {cover.title}
            </h1>
            {cover.body && (
              <p className="mt-4 max-w-prose text-lg leading-relaxed text-white/75">{cover.body}</p>
            )}
          </li>
        )}

        {rest.map((beat) => {
          const isThread = beat.kind === 'thread'
          const panelIndex = isThread ? ++threadN : null
          const isGoal = beat.kind === 'goal'
          const isCharacter = beat.kind === 'character'
          const heading = isGoal ? beat.body : isCharacter ? beat.body : beat.title
          const aside = isGoal || isCharacter ? '' : beat.body

          return (
            <li
              key={beat.id}
              className={
                isGoal
                  ? 'rounded-2xl border border-brand/40 bg-brand/10 p-6'
                  : isCharacter
                    ? 'border-l-2 border-white/25 py-4 pl-5'
                    : 'rounded-2xl border border-white/10 p-6'
              }
            >
              <p className={isGoal ? 'text-xs font-semibold uppercase tracking-[0.22em] text-brand' : 'text-xs font-semibold uppercase tracking-[0.22em] text-white/40'}>
                {isCharacter ? beat.speaker ?? beat.title : STORY_BEAT_KIND_LABEL[beat.kind]}
                {panelIndex !== null && <span className="ml-2 tabular-nums text-white/50">{panelIndex}</span>}
              </p>
              {heading && (
                <h2 className={`mt-2 font-serif font-bold leading-snug text-white ${isGoal ? 'text-2xl' : 'text-xl'}`}>
                  {heading}
                </h2>
              )}
              {aside && <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/75">{aside}</p>}
            </li>
          )
        })}
      </ol>

      <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm">
        <Link href={`/worlds/${slug}`} className="text-white/70 hover:text-white">
          Walk this place
        </Link>
        <Link
          href={`/worlds/${slug}/film`}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
        >
          Watch it
        </Link>
      </nav>
    </div>
  )
}
