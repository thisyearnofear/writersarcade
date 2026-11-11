# Prompt → World — writersarcade

**Describe a place in plain language. Walk into it as an explorable 3D world.**

Live demo: https://writersarcade.vercel.app/worlds
Code: https://github.com/thisyearnofear/writersarcade
Track: **AI 3D Scene Generation**

---

## The problem

Turning a sentence into a 3D scene is easy. Turning it into a *scene you can
explore* — with places to visit, objects that carry story, characters who
answer back, and a thread that leads somewhere — is not. Most "text-to-3D"
demos generate a mesh and stop. The result is a static object, not a place.

The other half of the problem is reachability. The tools that do generate
interactable scenes are research pipelines: a local notebook, a GPU, a
multi-step CLI. A writer with an article and no engineering time cannot use
any of them.

## What we built

A browser-native prompt-to-world system. One sentence in; a walkable diorama
out. No account, no wallet, no credits, no GPU.

The pipeline is a **contract, not a prompt**:

```
plain-language prompt
  → ScenePlannerService   one structured-output call → validated ScenePlan
  → critique → revise     a second pass scores and repairs the plan
  → ScenePlan JSON        zones, objects, NPCs, interactables, objective
  → React Three Fiber     walkable scene, click-to-inspect, talk-to-NPC
```

The LLM never emits geometry. It composes inside a Zod schema with enums and
bounds — mood, ground type, palette, object categories, primitives — and the
renderer assembles deterministically. A fixed 303-model CC0 asset library
(Kenney) supplies the visuals; anything unmatched falls back to a primitive
that is shaped by category.

**The world has working logic, not just geometry.** Every scene carries a
goal derived from its own premise ("find the three keys to understanding why
the station stopped"). Objective objects glow. Clicking one reveals a
narrative hook tied to the prompt. Clicking a character opens their
dilemma. Finding every objective completes the world.

## Three decisions that made it work

**1. The schema is the interface.** We tried free-form descriptions first;
the model invented objects that had no position, no size, and no category.
Constraining the vocabulary — `mood: dawn|day|dusk|night`, `ground:
grass|sand|snow|stone|water|meadow|void`, eight primitives, six categories
— moved the failure mode from "renders nothing" to "renders slightly wrong",
which is repairable.

**2. Repair drift, don't reject it.** Structured output does not reliably
honour numeric bounds. Anthropic (via fal) returned `y: -3` for a field
capped at `min(0)`, and six objectives for a field capped at five. Each
violation failed the whole parse and discarded a 40–60 second generation. A
repair pass now clamps numbers, truncates arrays, and coerces unknown enum
values *before* validation — while the schema the model sees stays strict,
so the model is still guided correctly.

**3. Derive the goal from the premise.** The planner is instructed to emit a
concrete objective from the story's central conflict, with
`objectiveIds` pointing at clickable objects. This is what separates a
diorama from a place: there is something to *do*.

## Engineering notes

**The model layer.** Every previously configured LLM route was rejected by
its provider (no subscription, invalid key, exhausted balance), which left
story generation failing in production. fal's `any-llm` became the primary
route. It is not OpenAI-compatible, so we borrow the AI SDK's OpenAI
provider and translate the wire format in a custom `fetch`: messages → a flat
prompt, `response_format` as a JSON string, fal's cumulative SSE → OpenAI
delta chunks, and `$ref` inlining (Anthropic rejects refs pointing outside
`$defs`).

**Rendering.** Image-based lighting is rendered *locally* from lightformers
via a cube camera, so the scene has something to reflect without downloading
an HDR — it works offline and in a sandboxed judging environment. Camera
distance is solved in screen space against the real viewport aspect, with
percentile clipping so one stray prop cannot shrink the scene.

**Assets.** Seven Kenney CC0 packs, 303 models. Coverage of generated
scenes rose from ~55% to ~74% of objects using a real model rather than a
fallback primitive.

**Loading states.** Generation takes 40–60 seconds. Instead of a spinner we
flick through a title reel of real artefact covers — comics, worlds, films
the platform has actually produced. The wait becomes a preview of the
product. One shared component, used by every generation surface.

## What is real, and what is next

Live and working: plain language → explorable 3D world with a goal, an
objective, interactive objects and talking characters; the same source
becoming an interactive comic; a shared title-reel loading state; VR entry.

Next: richer asset coverage (procedurally forged models for subjects with no
CC0 equivalent), per-object voice, and letting a world become a film's
shot list. The article → comic → world → film pipeline already exists and
now shares one loading language and one artefact vocabulary.

## Licence and attribution

Application code: MIT. All 3D assets are Kenney, CC0 (public domain) —
credits in `THIRD_PARTY_NOTICES.md`. Design prior art is credited in
`docs/DIORAMA_RESEARCH.md` (three.ws, SceneTeller, SceneCraft, Holodeck,
OptiScene).
