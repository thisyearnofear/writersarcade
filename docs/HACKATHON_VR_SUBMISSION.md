# Submission package — AI Builder Hackathon 2026 (Victoria VR)

Everything needed for the Kaggle Writeup submission. Copy the sections into
the Kaggle writeup form at
<https://www.kaggle.com/competitions/ai-builder-hackathon-2026/writeups>.

---

## Required attachments

| Item | Value |
|---|---|
| **Public repository** | https://github.com/thisyearnofear/writersarcade |
| **Live demo** | https://writersarcade.vercel.app/worlds/a-lighthouse-on-a-cliff-at-dusk-its-beam-sweepi-l2vt |
| **Demo video (file)** | `docs/demo/writersarcade-prompt-to-world.mp4` — 41s, H.264 1280×720 |
| **Video (public URL)** | https://raw.githubusercontent.com/thisyearnofear/writersarcade/main/docs/demo/writersarcade-prompt-to-world.mp4 |
| **Cover image** | `docs/demo/prompt-to-world-cover.png` (1280×720) |
| **Focus category** | Prompt-to-world creation (Kaggle track: *AI 3D Scene Generation*) |

> The video URL serves the file with `content-type: application/octet-stream`.
> If Kaggle's Media Gallery rejects it, upload the local `.mp4` to the gallery
> instead — the gallery accepts video attachments.

## Track / focus category

Kaggle exposes a single track, **AI 3D Scene Generation**. Victoria VR's own
focus list includes *prompt-to-world creation*, which is what this project is.
Pick the closest available option; if there is a free-text field, use
`prompt-to-world creation`.

## Writeup

The full writeup is in [`docs/HACKATHON_VR.md`](HACKATHON_VR.md) (1,364 words,
limit 1,500). It is structured as:

1. Title / subtitle
2. The problem
3. What we built
4. Three decisions that made it work (+ a fourth, "measure, don't assume")
5. Engineering notes
6. What is real, and what is next
7. Licence and attribution

## Title and subtitle

- **Title:** Prompt → World
- **Subtitle:** Describe a place in plain language. Walk into it as an explorable 3D world.

## One-paragraph summary (for the gallery / overview)

> A browser-native prompt-to-3D system. Open a finished lighthouse, walk it,
> check off the goal, and change it with a second sentence. The same sentence
> returns that world immediately. A new sentence plans another. No account,
> no wallet, no credits, no GPU.

## Live demo — what a judge should do

1. Open <https://writersarcade.vercel.app/worlds/a-lighthouse-on-a-cliff-at-dusk-its-beam-sweepi-l2vt>. No sign-in. The sentence is in the header. The goal is on the card.
2. Press **Step in** and walk with WASD. Q and E turn if the browser will not lock the pointer. Esc steps back. Click a glowing object to check off a thread. Click the keeper or the harbormaster to hear them.
3. In **Change this world**, type *"make it night and add the missing ship"* and press **Reshape**. The lighthouse stays until the revision lands (~a minute). A failed call leaves it unchanged.
4. To build another place, go back to <https://writersarcade.vercel.app/worlds>. The lighthouse sentence returns this world. Any other sentence plans a new one (~50s).
5. Press **Make a comic** to turn the same source into an interactive comic.

Judges are encouraged to try their own prompts — the planner is prompted to
work from any plain-language scene description, per the rules.

## Verifying the claims

| Claim | How to check |
|---|---|
| No account needed | Open `/worlds` in a private window; nothing is asked for. |
| Works from arbitrary prompts | Any sentence works; the demo used five unrelated prompts. |
| Real logic, not a static mesh | The quest card lists the goal and each thread. Clicking one checks it off. |
| You can walk in | **Step in**, then WASD. Q and E turn if the browser will not lock the pointer. Esc returns to orbit. |
| The lighthouse sentence is instant | On `/worlds`, submit “A lighthouse on a cliff at dusk, its beam sweeping the fog where a ship is missing”. It opens The Missing Ship without a new generation. |
| You can change it | **Change this world**, then **Reshape**. A failed call leaves the current scene up. |
| Video | The 41s mp4 is The Missing Ship: the sentence, the goal card, a short walk, then the reshape sentence typed and not sent, so the world judges walk stays the lighthouse. |

## Repo notes for judges

- `lib/fal-provider.ts` — the fal `any-llm` provider (wire-format translation).
- `domains/games/services/scene-planner.service.ts` — the schema, the repair
  pass, the asset-recovery pass, and `reviseScenePlan`.
- `app/api/worlds/[slug]/revise/route.ts` — the follow-up prompt. A failure
  does not blank the stored world.
- `components/scene/diorama-viewer.tsx` — the renderer: local IBL, contact
  shadows, screen-space camera framing, gradient sky, quest card, Step in.
- `components/scene/walker.tsx` — desktop first-person movement.
- `components/scene/ground-surface.tsx` — baked PBR maps for the grounds.
- `components/generation/title-sequence.tsx` — the shared loading reel.
- `lib/scene-assets.ts` — the 303-model CC0 manifest.
- `docs/DIORAMA_RESEARCH.md` — prior art and design decisions.

## Known limitations (state them; judges reward honesty)

- ~39% of objects still render as category-shaped primitives — there is no CC0
  model for every subject, and procedural forging is future work. Reshaping
  and walking do not change that number. Structure and landmark fallbacks
  use oak maps, props use iron, and flora and characters stay a flat color.
  Kenney models keep their own textures.
- Grass, meadow, sand, snow, stone, and water use baked PBRgen maps.
  Void has no ground disc.
- "Step in" is desktop first-person. "Enter VR" only appears when the browser
  reports a headset, and we have not exercised it on a headset.
- The planner occasionally mis-assigns an asset; the recovery pass corrects
  most of it, not all.
- The AI provider is a single funded route (fal). Every other configured
  provider rejected our key at the time of writing.
