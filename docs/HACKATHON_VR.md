# Prompt → World — writersarcade

**Describe a place in plain language. Walk into it as an explorable 3D world.**

Live demo: https://writersarcade.vercel.app/worlds/a-lighthouse-on-a-cliff-at-dusk-its-beam-sweepi-l2vt
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

Open the lighthouse. The sentence that made it is on the screen. Step in and
walk. The goal is on the card: find what happened to the ship. Click a glowing
object and it checks off. Talk to the keeper. Type a second sentence — “make
it night and add the missing ship” — and the world you are standing in
changes. If that call fails, the world stays.

That is the product. One sentence in, a walkable diorama out. No account, no
wallet, no credits, no GPU. The same lighthouse sentence opens the saved
world immediately. A different sentence still plans a new one.

Walk, Read, and Watch are three views of that one plan: the diorama, a comic
strip of its beats, and a title-card cut of the same sentences. Reading and
watching call no model and spend no credits.

The pipeline underneath is a **contract, not a prompt**:

```
plain-language prompt
  → ScenePlannerService   one structured-output call → validated ScenePlan
  → repair pass           clamps drift, recovers missing asset keys
  → ScenePlan JSON        zones, objects, NPCs, interactables, objective
  → React Three Fiber     walkable scene, click-to-inspect, talk-to-NPC
```

The LLM never emits geometry. It composes inside a Zod schema with enums and
bounds — mood, ground type, palette, object categories, primitives — and the
renderer assembles deterministically. A fixed 303-model CC0 asset library
(Kenney) supplies the visuals; anything unmatched falls back to a primitive
that is shaped by category.

(The game pipeline additionally runs a critique-and-revise pass — a second
structured call that scores the plan against the story and repairs it. The
standalone prompt path skips it deliberately: it would double a 50-second
wait, and the repair pass already covers the failure modes we measured.)

**The world has working logic, not just geometry.** Every scene carries a
goal derived from its own premise ("find the three keys to understanding why
the station stopped"). A quest card stays on screen: the goal, each thread
by name, and who you can talk to. Objective objects glow. Clicking one
checks it off. Clicking a character opens their dilemma. Finding every
objective completes the world.

**You can walk into it, and you can change it.** "Step in" is a first-person
view on a normal laptop: WASD, mouse look (Q and E turn if the browser will
not lock the pointer), the same click-to-inspect. Esc returns to orbit. A
headset still gets the WebXR entry when the browser reports one. Under the
title, a second prompt reshapes the world you are
standing in ("make it night and add the missing ship") — one more structured
call through the same repair path. The current scene stays up until the new
plan validates, so a failed reshape never blanks the world.

## Four decisions that made it work

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
repair pass now clamps numbers, truncates arrays, coerces unknown enum
values, and recovers a missing asset key from the object's own name —
*before* validation — while the schema the model sees stays strict, so the
model is still guided correctly.

**3. Derive the goal from the premise.** The planner is instructed to emit a
concrete objective from the story's central conflict, with
`objectiveIds` pointing at clickable objects. This is what separates a
diorama from a place: there is something to *do*.

**4. Measure, don't assume.** Our first two asset packs looked like they
would fix the "everything is a coloured box" problem. Measuring across 32
generated worlds showed they did not — coverage moved 55% → 51%. The gain was
diversity (40 → 67 distinct models used), not coverage. It took a
measurement-driven fix (the label-matching recovery pass) to move the number
that actually mattered.

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

**Assets.** Seven Kenney CC0 packs, 303 models. Adding the packs alone did
*not* raise coverage — the model simply had more to choose from and used it
(67 distinct models instead of 40), but the share of objects using a real
model stayed at ~53%. The fix was a recovery pass: when the planner names an
object but omits its asset key ("safety rail", "exit sign"), we match the
label against the manifest and recover the key. Coverage went 53% → 61%, and
an object the model hallucinated a key for is replaced rather than dropped.

**Loading states.** Generation takes 40–60 seconds. Instead of a spinner we
flick through a title reel of real artefact covers — comics, worlds, films
the platform has actually produced. The wait becomes a preview of the
product. One shared component, now used by the prompt surface, the game
generation overlay and the in-game 3D world gate.

## What is real, and what is next

Live and working: plain language → explorable 3D world with a goal, an
objective, interactive objects and talking characters; a desktop first-person
walk; a follow-up sentence that reshapes the same world; one scene plan read
three ways — walked, read as a comic, watched as title cards; a shared
title-reel loading state. Also
implemented: a WebXR "Enter VR" entry point on the diorama (R3F owns the
session lifecycle) — the button appears only on a device that reports
`immersive-vr` support, so we could not exercise it on the hardware we had.
The walk judges can use without a headset is the "Step in" control.

Grass, meadow, sand, snow, stone, and water grounds use a baked tileable
PBR set (color, roughness, normal), tinted by the scene mood so a night
world does not sit on a noon lawn. Structure
and landmark fallbacks use oak, and props use iron; flora and characters
stay flat color.

Next: procedurally forged
models for subjects with no CC0 equivalent (the remaining ~39% of objects
are still primitives), per-object voice, and
letting a world become a film's shot list. The article → comic → world →
film pipeline already exists and now shares one loading language and one
artefact vocabulary.

## Licence and attribution

Application code: MIT. All 3D models are Kenney, CC0 (public domain) —
credits in `THIRD_PARTY_NOTICES.md`. Ground maps, and the oak and iron maps
on fallback primitives, were generated in PBRgen under a Pro commercial
licence and shipped as static files; the app does not call PBRgen when a
judge opens a world. Design prior art is credited in
`docs/DIORAMA_RESEARCH.md` (three.ws, SceneTeller, SceneCraft, Holodeck,
OptiScene).
