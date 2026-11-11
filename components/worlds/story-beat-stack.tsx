import type { StoryBeat } from '@/lib/story-beats'

export const STORY_BEAT_KIND_LABEL: Record<StoryBeat['kind'], string> = {
  cover: 'Story',
  goal: 'Goal',
  thread: 'Thread',
  character: 'Character',
}

/**
 * Readable stand-in for the comic and the film.
 * Track B replaces the comic page with story-comic and the film page with
 * story-film. Both receive this same beat list.
 */
export function StoryBeatStack({ beats }: { beats: StoryBeat[] }) {
  return (
    <ol className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
      {beats.map((beat) => (
        <li key={beat.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{STORY_BEAT_KIND_LABEL[beat.kind]}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{beat.title}</h2>
          {beat.body && <p className="mt-2 text-sm leading-relaxed text-white/80">{beat.body}</p>}
        </li>
      ))}
    </ol>
  )
}
