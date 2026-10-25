# WritersArcade — Agent Operating Guide

Operational guidance for AI agents (and humans) working in this repository. These
rules prevent silent data loss or unintended live changes. Follow them **before**
mutating anything that reaches production.

## Repo layout (deploy topology — know where your change ships)

This is a **monorepo with three deploy surfaces and one database**:

- **Next.js app (repo root)** — the main product: all `app/`, `domains/`, `lib/`,
  `components/` and `prisma/schema.prisma`. Deploys to **Vercel** (project
  `writersarcade`, git-integration autodeploy on push to `main`).
- **`apps/writersarcade-api/`** — a separate **Fastify backend**, deployed to the
  VPS (`snel-bot`) via `npm run deploy:api`.
- **`apps/imessage-agent/`** — Flynn, the iMessage agent (Photon/Spectrum cloud
  lines). Deployed to the VPS via `npm run deploy:imessage` as PM2 process
  `flynn-imessage` running `src/cloud.ts`. `src/index.ts` (local Mac + terminal
  providers) is dev-only — keep `@spectrum-ts/imessage-local` out of the deploy
  graph (native SQLite dep).
- **Production Postgres — Neon** (`DATABASE_URL` from the Vercel project env).
  This is the app database. The VPS's local Postgres is **not** WritersArcade's DB.

> Before assuming where a change deploys, confirm which surface owns the code. Do
> **not** run `deploy:api` for Next.js `app/` changes (that ships the Fastify backend).

## 🗄️ Prisma runs on the Neon driver adapter — no query-engine binary

- `lib/database.ts` builds `PrismaClient` with `@prisma/adapter-neon`
  (Prisma 6.x — `driverAdapters`/`queryCompiler` are GA, no preview flags).
  Queries go through the Neon JS driver over WebSocket (`ws`), fully
  Rust-free — no `libquery_engine` binary is loaded or needed.
- **`PrismaNeon` is a factory**: pass it a `PoolConfig`
  (`new PrismaNeon({ connectionString })`) — it creates the Pool itself on
  `connect()`. Passing a `Pool` instance (the 5.x signature) silently
  constructs `new Pool(pool)` and queries hit localhost defaults.
- This exists for **Vercel function storage**: the ~19MB engine binary was
  being traced into every DB-touching function (~1.4GB/deployment). Engine
  binaries and non-Linux sharp binaries are excluded via
  `outputFileTracingExcludes` in `next.config.js` — do not remove those globs.
- `prisma migrate deploy`/`dev` are unaffected (the CLI uses its own engines).
- If `DATABASE_URL` is unset the client falls back to the engine — only
  relevant for exotic build-time envs; every real env is Neon.

## 🗄️ CREDITS & user data are Postgres-persistent — treat the DB as the source of truth

- `User.credits`, `totalCreditsPurchased`, and every `CreditTransaction` / `Payment`
  row live in **Neon Postgres**, never in app memory. The client always reads the
  balance from the DB via `/api/ramp/credits` — there is **no in-memory cache** of
  balances, so redeploys / restarts / cold-starts preserve credit balances.
- **Deploys do not reset or wipe credits.** Normal redeploys only replace code.
- **Warnings:**
  - **Make all schema migrations additive.** Add columns with a `@default`, never
    drop/retype existing `users` columns (`credits`, `totalCreditsPurchased`).
  - Never `prisma db push --accept-data-loss`, wipe tables, or run destructive SQL
    against the Neon DB. If you must change credit data, add a new column / write a
    careful `tsx` migration script and review it.
  - **`video-montage`, `video-upsell`, and `animate-panel` debit credits directly** in their routes
    (same atomic `updateMany` pattern as `/api/credits/spend`). Only spend actions
    may go through `/api/credits/spend`; the spend zod enum is the whitelist.
  - `CreditTransaction` with `creditAmount < 0` = spend; `> 0` = purchase. Refunds
    are idempotency-gated (see `video-charge.service.ts`).

## 🔀 Git push identity (multi-account conflict)

This machine's GitHub keyring holds multiple accounts (`sneldao`, `udirobert`,
`thisyearnofear`). Only **`thisyearnofear`** can push to
`thisyearnofear/writersarcade`. If a push 403s, force the `gh` credential helper:

```bash
gh auth switch --user thisyearnofear
git -c credential.helper="!gh auth git-credential" push origin main
```

## 🪦 Story Protocol removed (Oct 2026)

Story Protocol rebranded to DATA Foundation / DATA Network (June 2026, AI-data
pivot) and was never used here (0 registrations in prod). All app code was
removed. Leftovers by design: `story*` columns + `AssetStoryRegistration` in
`schema.prisma` (additive-migration rule — do not drop), and
`STORY_PLATFORM_PRIVATE_KEY`, which is the **live platform signer key in
Vercel prod** — read it only via `getPlatformSignerKey()` in
`lib/platform-signer.ts` (`PLATFORM_SIGNER_PRIVATE_KEY` is the canonical name).
`@story-protocol/core-sdk` is still in package.json but unimported: removing
it needs a lockfile regen that pnpm 12's exotic-subdep check blocks — don't
work around it by disabling `blockExoticSubdeps`.

## ⛓️ Mezo network switch

`NEXT_PUBLIC_MEZO_NETWORK=testnet|mainnet` (default testnet) drives the MUSD
chain, token, explorer and Passport BTC wallets (`MEZO_NETWORK` in
`lib/wallet/chains.ts`, `getActiveMusdConfig()` in `lib/writer-coins.ts`).
MUSD-for-generate needs that network's `MezoPaymentSplitter`; without it the
selector disables MUSD and users top up credits with MUSD instead.

## 📈 Credit economics (current pricing, margins)

Peg: **1 credit = $0.10**. `CREDITS_CONFIG.cost` (in `lib/writer-coins.ts`) is the
single source of spend prices:

| Action | Credits | Revenue |
|---|---|---|
| `generate-game` | 10 | $1.00 |
| `mint-nft` | 5 | $0.50 |
| `play-wordle` | 1 | $0.10 |
| `video-upsell` (hero) | 50 | $5.00 |
| `video-montage` (whole comic) | 100 | $10.00 |
| `animate-panel` (single panel) | 10 | $1.00 |

Margins are strong (≥70%, mostly 85–99%). Update prices in `CREDITS_CONFIG` (plus
the `cost` map, `videoUpsellCost`/`videoMontageCost` bigints, and the spend zod enum
in `/api/credits/spend`) — they must stay in sync.

## 🚀 Deploy workflow (Vercel autodeploy)

1. Make changes, add to `prisma/migrations/` (additive), review locally:
   `pnpm install` → `pnpm type-check` → `pnpm test` → `npx eslint`.
2. Commit and push to `main` (`gh` helper above). Vercel autodeploys the web app.
3. For schema changes, run migrations against **Neon** (only if Vercel's build
   doesn't auto-apply them): pull env, then
   `DATABASE_URL="$(...)" pnpm exec prisma migrate deploy`, **not** the VPS DB.
4. Verify: `curl https://writersarcade.vercel.app` returns 200 and new API routes
   respond (unauth routes should 401, not 404).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
