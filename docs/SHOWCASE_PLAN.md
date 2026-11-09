# Landing Showcase Plan — "one story, many forms"

Goal: replace the static-feeling landing with a dynamic showcase of the
product's real output modalities (comic, film, 3D world, wordle, daily
canvas), using only real generated artifacts — no mockups.

Constraints discovered in audit (prod DB, 2026-11-09):
- 51 games / 12 public / 2 total plays / 4 users
- Film assets: 1 montage (`peles-picks`), 1 game with panel clips (5 panels)
- 3D scenes completed: **0** — world card impossible until Phase 1 generates one
- Public wordle games: **0** (4 exist, all private)
- Always-available fresh asset: BasePaint daily canvas image + timelapse MP4
  (`getBasePaintCanvasProxyUrl(day)`, `getBasePaintAnimationUrl(day)`)
- `artifactBadges` ('film' | 'world') already computed per game in
  `getPublicGamesWithClips` — reuse for card eligibility

Best-in-class patterns applied (Linear/Vercel/Raycast/Loom research):
- Real product media in motion above/below fold, never mockups
- Muted autoplay, deferred loading, save-data + reduced-motion safe
  (HeroBackdrop already implements this — mirror it)
- Passive showcase for the masses + one real playable entry point
- Static fallback for every media card; hide cards with no asset (empty-state policy)

## Phase 0 — ship now, zero new assets

- [x] **0.1 Hero artifact goes live**: add optional `clipUrl` to
  `HeroTransformationProps`; render a muted autoplay panel-clip tile at the
  end of the article→panels→world row. Plumb `sourceGame.clipVideoUrl`
  through `app/page.tsx` → `HomeClient` → `featuredArtifact`.
  Fallback: stills only when no clip (current behavior).
- [x] **0.2 "One story, many forms" strip**: new server-fetched section
  directly under the hero (above DailyChallengeBanner). Cards, each
  deep-linked to the real instance, hidden when asset missing:
  - Comic — panel-image collage of a featured game → `/games/[slug]`
  - Film — `montageVideoUrl` muted loop → `/games/[slug]`
  - World — `scene.thumbnailUrl` → `/games/[slug]/scene` (hidden: 0 scenes)
  - Daily canvas — BasePaint image + timelapse MP4 → `/basepaint` (always fresh;
    HEAD-probes today→yesterday since timelapses lag ~a day)
  - Wordle — only when a public wordle game exists (hidden today)
  Data: extended `app/page.tsx` queries (montage + wordle + shared scene
  lookups). Verified live: 3 cards render (comic/film/daily), both videos
  autoplay muted, lazy-mount on scroll, reduced-motion/save-data/mobile
  fall back to posters.
- [x] **0.3 Verify**: `pnpm type-check`, `pnpm lint`, `pnpm vitest run`
  (319 pass), dev-server visual check via agent-browser. `pnpm build`
  verified implicitly by CI on push.

## Phase 1 — manufacture missing assets (ops, uses ego browser)

- [ ] **1.1 3D worlds**: run scene generation for 2–3 strongest public games
  (`POST /api/games/[slug]/scene`; bundled retry is free, legacy
  `generate-scene` is 20cr — check which path applies per game). Verify
  `GameScene.status='completed'` + `thumbnailUrl` lands.
- [ ] **1.2 Films**: ensure montage coverage on the same showcase games
  (auto-film subsidy queue or `video-montage` 100cr path — confirm
  `filmAutoQueuedAt` behavior first).
- [ ] **1.3 Wordle**: publish one public wordle game (or annotate stills
  into a card if generation is impractical).
- [ ] **1.4 Re-audit**: re-run asset counts; confirm ≥2 games carry
  film+world badges.

## Phase 2 — full modality wall (unblocked by Phase 1)

- [ ] **2.1 Bento "What a story becomes" section**: one card per modality
  driven by `artifactBadges`, real media thumbs, deep links. Replaces or
  extends the Phase 0 strip.
- [ ] **2.2 Optional flex**: scroll-driven article→comic→world→film
  sequence, and/or embedded playable micro-game (`/embed/[slug]`) in hero.

## Tracking

- Phase 0 = commits on `main`, verified by green CI + local build.
- Phase 1 progress = DB counts (`GameScene` completed, montage count,
  public wordle count) — re-run `/tmp/audit-assets.ts` equivalent.
- Phase 2 starts when Phase 1 audit shows ≥2 games with film+world badges
  and ≥1 public wordle game.
