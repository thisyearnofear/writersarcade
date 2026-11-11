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
export function beatsFromScene(scene: ScenePlan): StoryBeat[]
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

Does not import Prisma. Props are `{ title, prompt, beats: StoryBeat[] }`.
Build against the fixture until Track A's pages exist.

**Read.** A vertical stack of beats. Cover, then goal, then each thread, then
each character. One beat is one panel: kind as a small label, title, body.
Palette can come from a later prop; v1 uses the existing dark world chrome
(`bg-black`, white type, `border-white/10`). Keyboard: the page is a normal
document, so scroll is enough. No wallet, no "generate" button on this page.

**Watch.** The same beats played through the existing `TitleSequence`
(`components/generation/title-sequence.tsx`). Map each beat to a `TitleCard`:
`title` = beat title, `label` = beat body, no `imageUrl` (typographic cards
are already the component's empty-image path). Interval about 4 seconds so a
sentence can be read. First card holds until the visitor presses play; after
the last card, stop on the last card and show **Walk this story** back to
`/worlds/[slug]`. `prefers-reduced-motion` already collapses `TitleSequence`
to a still card — also render the beat list underneath so the film is readable
without motion.

Copy on the film page says this is the story, cut as title cards. It does not
say the world was filmed. Motion (the existing `video-montage` / `video-upsell`
paths) stays a paid continuation on a game, and is out of scope here.

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
