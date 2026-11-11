# Diorama / Prompt-to-3D Scene Generation — Research Notes

Researched 2026-11-08 (Parallel API sweep + DEV community). Context: adding an
explorable 3D diorama generated from a game's `agentPlan` (StoryPlan). This doc
captures what's worth stealing before we build `ScenePlannerService` + renderer.

## The direct precedent: three.ws (Apache-2.0)

<https://github.com/nirholas/three.ws> — open-source "speak a little world into
being": one sentence → LLM set-designer → strict JSON plan → per-object GLB
forge → progressive assembly → permalink/gallery/export. Engineering docs:
`docs/diorama.md`, `docs/forge-pipeline.md` on the repo. Apache-2.0 — patterns
are free to borrow with attribution.

### Schema lessons (adopt these)

- **Constrained vocabularies over free-form.** `mood` is an enum
  (`dawn|day|dusk|night`), `ground` an enum (`grass|sand|snow|stone|water|
  meadow|void`), `island` an enum (`round|craggy|plateau`), and `palette` is a
  fixed `{ sky: string[], ground, fog, accent }` shape. The LLM composes inside
  rails — this is the biggest repeatability win reported by practitioners.
- **"Each object is exactly one physical thing"** — hard prompt constraint
  ("a single tree, never a scene and never 'and'") + spacing enforcement on
  `(x, 0, z)` positions. Prevents layout collapse.
- **Per-object status in the plan**: `pending → forging → ready|failed` with
  in-place retry. Same shape as our `videoStatus` per-panel jobs — progressive
  arrival is a feature.
- **`game` block**: when the prompt names a goal ("collect the three
  lanterns"), the composer emits gameplay referencing object indices,
  normalized to ids. Maps to our `dilemmas` / interactable `narrativeHook`.
- **Forge backends** (their engine grid): self-hosted reconstruction worker,
  Microsoft TRELLIS on Replicate, Meshy / Tripo / Rodin (BYOK), auto-rigging.
  Text→image stays on cheap lanes first.

## Academic / agentic lineage

- **SceneTeller** (MIT, ECCV 2024) — LLM emits *constraints*; a 3D pipeline
  executes them. Validates our planner/renderer split.
- **SceneCraft** (ICML 2024) — LLM writes Blender code directly. Higher ceiling,
  much heavier; not our path.
- **Holodeck** (AI2) — contrarian approach: **retrieval over generation**.
  Scenes composed from Objaverse assets + spatial rules; no meshes generated.
  Fast, cheap, reliable — the model for our v1 asset tier.
- **OptiScene / Scenethesis / SceneBloom** — coarse-to-fine layout JSON,
  multi-stage preference optimization, and **agentic critique→revise loops**
  (generate → render → critique → fix). "Contract-guided compilation" framing:
  constrain the LLM to a validated contract to eliminate geometric
  hallucinations — exactly what zod schemas give us (same as `StoryPlan`).
- **HunyuanWorld-1.0** (Tencent) — full explorable-world model; needs
  4090-class GPU. Frontier reference only, not deployable for us.

## Commercial object-gen APIs (v2 tier candidates)

- **Meshy** — async image→3D and text→3D task APIs returning GLB; job model
  (`pending → completed`) matches our video pipeline conventions.
- **Tripo / Rodin** — same category, BYOK-friendly.
- **TRELLIS** — open-source image→3D, available on Replicate.

## Design decisions for WritersArcade

1. **Schema**: mood/ground/island enums, fixed palette shape, single-object
   constraint, per-object `status`/`glbUrl` inside `sceneJson`, `game`/goal
   block referencing object ids. Zones still derive from `agentPlan.arc` beats.
2. **Two-tier assets**:
   - v0: primitives + flat colors (spike demo).
   - v1: **retrieval-first** — curated CC0/Kenney-style low-poly pack per biome;
     LLM picks asset + layout. Instant, ~free, deterministic, clean licensing
     story for NFT/IP provenance. Shipped grounds (grass, meadow, sand, snow,
     stone, water) and the structure, landmark, and prop fallbacks use baked
     PBRgen maps. Flora and characters stay flat color. Kenney models keep
     their own textures.
   - v2 (optional): premium objects via image-gen → Meshy/Tripo image→3D → GLB,
     billed as a higher credit tier.
3. **Critique loop**: ✅ implemented as `SceneCritiqueService` — a second
   structured pass scores the plan against the story (fidelity, layout,
   interactivity, palette/mood) and emits a sanitized `revisedScenePlan` only
   when issues are material. Runs inline in `POST /api/games/[slug]/scene`,
   non-fatally. VLM-on-thumbnail upgrade remains future work (needs a render;
   client-side thumbnails now exist via the viewer's "Save thumbnail").
4. **Progressive jobs**: per-object generation with `pending/forging/ready/
   failed`, mirroring `GameArtifactPanel.videoStatus`.
5. **Hosting**: planner + DB + credits stay in Next.js/Vercel (same weight
   class as `StoryPlannerService`). VPS (`snel-bot`) only if we add server-side
   headless-GL thumbnail rendering later — same rationale as `/api/montage/concat`.

## Sources

- three.ws repo + docs (Apache-2.0): github.com/nirholas/three.ws
- SceneTeller: github.com/sceneteller/SceneTeller (MIT), ECCV 2024
- SceneCraft: PMLR v235, ICML 2024
- OptiScene: NeurIPS 2025 / arXiv 2506.07570
- Scenethesis: arXiv 2505.02836
- SceneBloom: dev.to architectural deep-dive
- HunyuanWorld-1.0: github.com/Tencent-Hunyuan/HunyuanWorld-1.0
- Meshy API docs: docs.meshy.ai/en/api/image-to-3d
- DEV community: dev.to/3ddesignai JSON-schema-for-text-to-3D post;
  dev.to/mikweb2025design website→3D-city n8n workflow
