# One story, three views — implementation plan

A world, a comic, and a film are three readings of one `ScenePlan`. The
lighthouse already stores that plan. This plan makes the other two readings
real on that world, with no wallet and no second model call, then lets a new
article enter through the same door.

Do not reshape the showcase world
(`a-lighthouse-on-a-cliff-at-dusk-its-beam-sweepi-l2vt`). Comic and film read
`sceneJson`. They never `POST /api/worlds/:slug/revise`.

## Contract (freeze this before either track writes UI)

New module `lib/story-beats.ts`. Both tracks import it. Neither track
re-derives beats inside a component.

```ts
export type StoryBeatKind = 'cover' | 'goal' | 'thread' | 'character'

export interface StoryBeat {
  id: string
  kind: StoryBeatKind
  title: string
  /** One or two sentences. Already on the scene. */
  body: string
  speaker?: string
}

/** Pure. Same scene in, same beats out. Empty game/npcs still return a cover. */
export function beatsFromScene(
  scene: StoryBeatSource,
  options?: { prompt?: string },
): StoryBeat[]
```

Order, and only these sources:

1. **Cover** — `scene.title`. Body is the world's prompt, passed in by the
   caller (`beatsFromScene(scene, { prompt })`), because the prompt lives on
   the `World` row, not inside `sceneJson`.
2. **Goal** — `scene.game.goal`, when present.
3. **Threads** — one beat per `scene.game.objectiveIds`, in that order. Title
   is the object's `label`. Body is `object.interactable.narrativeHook`. Skip
   an id that does not resolve to an object. Skip an object with an empty hook.
4. **Characters** — one beat per `scene.npcs`. Title is `npc.name`. Body is
   `npc.dilemma`, falling back to `npc.persona`. `speaker` is `npc.name`.

No image generation. No credits. No new Prisma columns in this phase. The
comic and the film are functions of the row that already exists.

Fixture for tests and for the UI track: a trimmed `ScenePlan` in
`tests/fixtures/lighthouse-beats.json` with a goal, three hooked objects, and
two NPCs (keeper, harbormaster). The live lighthouse is the acceptance scene;
the fixture only has to exercise the compiler.

## Tracks

Work in parallel after the contract file and the fixture land. Stay out of
each other's files.

### Track A — compiler, routes, world header

Owns:

- `lib/story-beats.ts`
- `tests/story-beats.test.ts`
- `tests/fixtures/lighthouse-beats.json`
- `app/worlds/[slug]/page.tsx` (header links only)
- `app/worlds/[slug]/comic/page.tsx` and `app/worlds/[slug]/film/page.tsx`
  as thin server pages: load the world, 404 if missing, pass
  `beatsFromScene` into Track B's components. If `sceneJson` is absent, render
  the same "still building" state the world page already uses.

Header on a completed world, replacing the current
`/generate?source=text&prompt=` link:

- **Walk** — `/worlds/[slug]` (current page)
- **Read** — `/worlds/[slug]/comic`
- **Watch** — `/worlds/[slug]/film`

Pending and failed worlds keep the header without those links. The paid
generator stays where it is (`/generate`). It is how a visitor asks for drawn
panels, not how they read this story.

Tests: fixture yields cover + goal + three threads + two characters, in that
order; a scene with no `game` yields the cover only; an objective id missing
from `objects` is dropped; whitespace-only hooks are dropped.

### Track B — comic page and film page

Owns:

- `components/worlds/story-comic.tsx`
- `components/worlds/story-film.tsx`
- `components/generation/title-sequence.tsx` — **additive only** (see below)

Does not import Prisma. Props are `{ slug, beats: StoryBeat[] }` — the slug
powers the "Walk this story" / cross-view links; title and prompt already
live inside the cover beat. Build against the fixture until Track A's pages
exist. `components/worlds/story-beat-stack.tsx` stays as the shared
beat-list renderer — the film page reuses it as the always-visible script
under the player, and `STORY_BEAT_KIND_LABEL` is exported from it for the
kind eyebrow on both views.

`title-sequence.tsx` changes are backward-compatible additions; the
generation loading state keeps today's defaults:

- `TitleCard.body?: string` — a readable serif sentence rendered under the
  title. `label` stays the small uppercase eyebrow (it maps beat *kind*,
  never beat body — a sentence in that slot would overflow).
- `playing?: boolean` (default `true`) — when false the sequence holds the
  first card until the caller flips it.
- `loop?: boolean` (default `true`) — when false the sequence stops on the
  last card instead of wrapping.
- `onEnd?: () => void` — fires once when a non-looping sequence reaches the
  last card. Callers should pass a stable callback.

**Read.** `story-comic.tsx` is a server component: a vertical stack of
beats — an oversized cover panel (scene title as the h1, prompt as the
lede), then one panel per remaining beat with kind as a small label,
thread panels numbered in objective order, character panels showing the
speaker's name. Footer links cross to Walk and Watch. Dark world chrome
(`bg-black`, white type, `border-white/10`). Keyboard: the page is a normal
document, so scroll is enough. No wallet, no "generate" button on this page.

**Watch.** `story-film.tsx` is a client component playing the same beats
through `TitleSequence`: each beat maps to a `TitleCard` with `title` =
beat title, `label` = kind label, `body` = beat body, no `imageUrl`.
`intervalMs` ≈ 4000 so a sentence can be read. The player starts paused on
the cover card behind a play button; on play it runs once (`loop={false}`)
and stops on the last card, where **Walk this story** links back to
`/worlds/[slug]` alongside a Replay that remounts the sequence. Copy calls
it a title-card cut of the story — it does not say the world was filmed.
The beat list (`StoryBeatStack`) renders underneath at all times, so the
film is fully readable without motion and under `prefers-reduced-motion`.
Motion (the existing `video-montage` / `video-upsell` paths) stays a paid
continuation on a game, and is out of scope here.

## Acceptance

On the lighthouse URL, with no wallet connected:

1. **Walk** opens the current diorama, goal card, and reshape bar.
2. **Read** shows the Aurora goal, the evidence threads, and the keeper and
   harbormaster, using sentences already in `sceneJson`.
3. **Watch** plays those same sentences in the same order and returns to the
   world.
4. Refresh does not call the planner and does not create a `Game`.
5. Submitting the exact showcase prompt on `/worlds` still returns the saved
   world (`findShowcaseWorld`). A different sentence still plans a new world.

Verify in the browser on `pnpm dev` (port 3000's `pnpm start` is a stale
production build). `pnpm exec vitest run tests/story-beats.test.ts` and
`pnpm type-check`.

Leave `docs/HACKATHON_VR.md` alone until those three clicks work. The article
is already near the 1,500-word cap; the writeup changes only after the demo
matches it.

## Phase 2 — a new article enters the same door

Start only after Phase 1 is on the lighthouse. One owner (Track A). Track B
has no page changes if the beat contract holds.

- `/worlds` accepts a pasted article as well as a sentence. The existing
  builder already posts a prompt to `POST /api/worlds`. Raise the prompt
  length only as far as `ScenePlannerService` already tolerates; do not add a
  second planner.
- Optional provenance: additive nullable `World.sourceUrl String?`. No default
  change to `prompt`, `sceneJson`, credits, or user columns. No
  `db push --accept-data-loss`.
- The new world gets Walk / Read / Watch from the same pages. Drawn panel art
  and a rendered montage remain the paid game pipeline, linked from the comic
  as a secondary action ("Illustrate this story") that prefills `/generate`.
  The free read does not depend on that action.

## Out of scope

- Calling an image or video model while a judge is on these pages.
- Cloning a game row per world.
- Rodin meshes, terrain certificates, or a playing economy.
- Editing the showcase scene to make the comic read better. If a hook is thin,
  the compiler shows that thin hook.
