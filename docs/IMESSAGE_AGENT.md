# Flynn — iMessage Agent

A Spectrum-based iMessage agent that turns a link to prose into a playable story — and, later, hands back the film of the run.

## Status: live

- **Running** as PM2 process `flynn-imessage` on `snel-bot` (`/home/deploy/imessage-agent/current`), connected outbound to Photon's managed iMessage lines via the cloud provider.
- Deploy: `pnpm deploy:imessage` (first run: `--seed-env`). Dependencies install **on the remote** — do not install locally into the release (darwin binaries crash Linux).
- Production DB runs Prisma 6.19.3 engine-free (`engineType: "client"` + Neon WS adapter) — no native `libquery_engine` in function bundles.
- **In-app surface:** set `NEXT_PUBLIC_FLYNN_IMESSAGE` to the managed line's address (phone `+1…` or iMessage email) to light up "text it to Flynn" links on the landing + generate pages (`sms:` deep link with prefilled body). Unset → links hide.
- Video providers: `VIDEO_PROVIDER=fal` in prod (fal H3 primary, Runware kling secondary).

## Why it exists (strategy)

Flynn is **distribution built into the product**, not a marketing stunt:

- WritersArcade's core thesis is that published prose is *latent interactive IP* — every article is a game, a film, and a mintable artifact waiting to happen. Flynn injects new artifacts into that corpus at near-zero activation energy: the user forwards a link — an existing behavior — instead of visiting a site and understanding a product.
- **Group chats are the surface.** Every invocation in a group is a demonstration to everyone watching; the game link and the film that follows are self-propagating share objects. This is the smallest working version of *"games arrive wherever the conversation is"* — the same muscle generalizes to WhatsApp, Telegram, and Farcaster (Spectrum providers).
- **The loop, not the stunt:** Flynn links carry `?ref=flynn` so inbound plays and downstream creates are attributable. If iMessage-sourced artifacts get played and shared, Flynn is the first node of the distribution graph. If not, it was cheap R&D plus a canonical demo asset.
- **Brand:** Flynn is the concierge character for "reading becomes play" — a persona surface the website can't provide (theater of transformation: *reading* → *reveal* → *film*).

## What it does

Text a Paragraph.xyz article, essay, or post to **Flynn**. Flynn reads it, runs the same game-generation pipeline as the WritersArcade studio, and replies with a rich link to the playable game.

The agent is built for **smoothness, utility, and shareability**:

- The reply is a real, playable WritersArcade game with its own URL and Open Graph card.
- The writer can add a free-form mood: *"make it a fable,"* *"keep it close to the text,"* or *"let it be strange."*
- iMessage-native touches (tapback + bubble/screen effects) signal that something has happened without feeling gimmicky.
- Once the cover image lands, Flynn sends it as an inline attachment — the reveal is visual, not just a link.
- **"film"** — after a finished run has panel clips, texting *"film it"* returns the montage MP4 as an attachment (or the `?watch=1` replay landing while the film assembles).

## Flow

1. User sends a link to Flynn in iMessage.
2. Flynn sends an `emphasis` tapback and a gentle *"Flynn is reading this now"* bubble effect.
3. Flynn calls `POST /api/imessage/generate` with the URL and optional tone.
4. The internal API extracts the article, builds a generation prompt, runs `GameAIService`, and saves a new `Game` through `GameDatabaseService`.
5. A cover image is generated in the background via `ImageGenerationService`.
6. Flynn sends the title with a `spotlight` effect, a `richlink` to `?ref=flynn` play link, then the cover image attachment once it resolves.
7. Later, *"film it"* → Flynn checks `montageVideoUrl` / panel clips via `GET /api/games/[slug]/status` and sends the film as an attachment.

## Code

- `apps/imessage-agent/src/flynn.ts` — shared agent loop: message parsing, generation call, reveal choreography, film command.
- `apps/imessage-agent/src/index.ts` — local/dev entrypoint (local Mac provider + terminal).
- `apps/imessage-agent/src/cloud.ts` — production entrypoint: cloud `imessage` provider only. Kept separate per Spectrum docs so `@spectrum-ts/imessage-local`'s native SQLite dep never enters the deploy graph.
- `app/api/imessage/generate/route.ts` — internal, auth-guarded endpoint that reuses the studio game pipeline.
- `.env.example` and `apps/imessage-agent/.env.example` — required environment variables.

## Deploy

Flynn runs as a PM2 process on the VPS (`snel-bot`) against Photon's managed lines — `deploy:imessage` syncs `apps/imessage-agent` and starts `cloud.ts` under PM2. It needs `SPECTRUM_PROJECT_ID`/`SPECTRUM_PROJECT_SECRET`, `IMESSAGE_API_SECRET`, and `WRITERSARCADE_API_URL` pointing at production.

## Setup

Add to the root `.env.local`:

```bash
IMESSAGE_API_SECRET="change-me-to-a-long-random-string"
```

Copy `apps/imessage-agent/.env.example` to `apps/imessage-agent/.env` and fill in the same secret:

```bash
IMESSAGE_API_SECRET="change-me-to-a-long-random-string"
WRITERSARCADE_API_URL="http://localhost:3000"

# Optional: cloud iMessage provider from Photon. Leave unset for local Mac Messages.
SPECTRUM_PROJECT_ID=""
SPECTRUM_PROJECT_SECRET=""

# Optional: enable the terminal provider for local testing.
ENABLE_TERMINAL="true"
LOCAL_IMESSAGE="true"
```

## Run

Start the web app:

```bash
pnpm dev
```

In another terminal, run the agent in terminal-only test mode:

```bash
cd apps/imessage-agent
LOCAL_IMESSAGE=false ENABLE_TERMINAL=true bun run src/index.ts
```

For real iMessage, use a Photon cloud line or the local Mac Messages provider:

```bash
# Cloud iMessage (required for message effects)
SPECTRUM_PROJECT_ID=... SPECTRUM_PROJECT_SECRET=... bun run src/index.ts

# Local Mac iMessage (no screen/bubble effects)
LOCAL_IMESSAGE=true ENABLE_TERMINAL=false bun run src/index.ts
```

## Notes

- iMessage bubble and screen effects require the **cloud** `@spectrum-ts/imessage` provider. The local provider accepts the same API but no-ops effect sends.
- Content extraction currently supports Paragraph URLs via `ContentProcessorService`.
- `IMESSAGE_API_SECRET` is shared between the agent and the internal generate route. It must be kept private.
- This is the submission for the Photon iMessage agent hackathon.
