# Roadmap & Status

## Current Status

**Live**: https://writersarcade.vercel.app/  
**Contracts**: Base mainnet (see addresses in [docs/FEATURES.md](./FEATURES.md))  
**Story Protocol**: Aeneid testnet (Chain ID: 1315)

## Completed Phases

### Phase 1-6: Foundation & MVP
- ✅ Article-to-game generation pipeline
- ✅ Comic panel rendering
- ✅ NFT minting on Base
- ✅ Writer coin payments
- ✅ Smart contracts deployed to Base mainnet
- ✅ Asset Workshop UI (WYSIWYG editor)
- ✅ Decomposition Engine (articles → assets)
- ✅ One-click IP minting to Story Protocol
- ✅ Marketplace sidebar (community assets)

### Phase 7: MVP Enhancements
- ✅ Asset preview & edit (Workshop page with inline editing)
- ✅ Image regeneration ("New Image" button per panel)
- ✅ Prompt visibility (view/edit prompts)
- ✅ Copy editing (narrative text editable in finale)
- ✅ Toast notifications for all actions
- ✅ Real-time downloads with edited text

### Phase 8: Quality & UX
- ✅ Narrative Preview Modal (before payment/gameplay)
- ✅ Article Fidelity Review (approve/reject workflow)
- ✅ Post-Game Feedback (NPS scoring)
- ✅ Database schema: `approvalStatus`, `articleFidelityScore`, `GameFeedback`, `PanelRating`
- ✅ ErrorBoundary wrapping gameplay components

### Phase 9: Production Polish
- ✅ 5 writer coins (AVC, DEBBIE, JAKE, TSO, PARAPAPA)
- ✅ Writer profile pages (`/writers/[coinId]`)
- ✅ Editorial redesign (typography-first UI)
- ✅ LicenseConfigurator wired to real `registerPILTerms`
- ✅ Creator Dashboard link (whitelisted writer wallets)
- ✅ IPAttribution bar above fold on game pages
- ✅ Homepage live stat (game count from API)
- ✅ Context-aware empty states
- ✅ DRY cleanup (zero `@ts-expect-error` suppressions)

### Phase 10: Asset Marketplace
- ✅ Marketplace discovery (`/assets` in navigation)
- ✅ API pagination + filtering (limit, offset, genre)
- ✅ End-to-end genre filtering
- ✅ Create page fix (API fetch pattern)

### Phase 11: Asset Derivation
- ✅ Post-mint asset extraction (`extractAndSaveGameAssets()`)
- ✅ PATCH handler wiring in `/api/games/mint`
- ✅ Story Protocol derivative path (`registerDerivativeIp()`)

### Phase 12: PL Genesis (Lit Protocol + Hypercerts)
- ✅ Lit Protocol service (encrypt/decrypt with ERC721 ACCs)
- ✅ Secret Panel component (locked/unlocked UI, blur-to-reveal)
- ✅ Secret Panel API (NFT ownership verification → decrypt)
- ✅ Hypercerts service (AT Protocol impact certificates)
- ✅ Hypercert Badge component
- ✅ Background enrichment (`enrichGameInBackground()` - non-blocking)
- ✅ Config & schema updates

### Mezo Hackathon Integration (MUSD) — April–May 2026 — archived
- Full submission history lives in [`docs/HACKATHONS_ARCHIVE.md`](./HACKATHONS_ARCHIVE.md#3-mezo-hackathon-musd-track-aprmay-2026--archived).
- Shipped at the time: Mezo Matsnet chain config, Tenderly simulation, MUSD strategy + splitter contracts, Mezo Passport/MUSD UI, MEZO holder badge + boosted splitter, on-chain MUSD balances, one-click pay flow, `/mezo/analytics` dashboard, Wordle revival alongside.

### Phase 13: Wordle Revival + Farcaster — May 2026
- ✅ Wordle toggle restored as free tier alongside Story (premium)
- ✅ Farcaster sharing on Wordle win screen (share results as casts)
- ✅ Daily Wordle section on homepage
- ✅ CDR Hackathon work archived (May 27–June 5) — see HACKATHONS_ARCHIVE §4; secret panels now Inco-based

### Phase 18-21: Identity, Resonance & Embeds (July 2026)

A four-phase push to remove wallet friction at the top of the funnel and give creators analytics on how their stories perform.

#### Phase 18 — Progressive Identity ✅
- Nullable `walletAddress`; new `email` and `guestKey` columns on `User`
- HMAC-signed cookies for wallet, email, and guest sessions
- `getActor()` precedence: wallet → email → guest
- Automatic merge of games, credits, and payments on identity upgrade

#### Phase 19 — Server-Verified Credits & Magic Link ✅
- Credit balance derived from signed session, not request body
- `credits:<hash>` sentinel `Payment` rows unify credit and on-chain funding lookups
- Magic-link email auth via Resend; required at fiat credit purchase time (409 → email link → merge)
- Guest/email users can buy credits and generate games without a wallet

#### Phase 20 — `/studio` Free Demo ✅
- `/studio` page: paste marketing copy, pick tone, generate a playable story
- First story is free; subsequent stories prompt for credits
- No crypto required to create or play

#### Phase 21 — Resonance, Embeds & Insights ✅
- `GamePlayEvent` extended with `type`, `sessionId`, `panelIndex`, `choiceIndex`, `choiceText`, `referrer`, `embedded`
- `/embed/[slug]` wallet-free iframe player with `?ref=` attribution and "Made with WritersArcade" backlink
- `/games/[slug]/insights` owner dashboard: resonance score, panel funnel, choice splits, referrers, embed snippet

---

### Phase 1-4: 8.5/10 Product Polish (June 2026)

Complete rewrite of the product foundation across 4 phases:

#### Phase 1 — Foundation ✅
- ✅ Payment flow tests (37 tests: cost service, strategies, initiate route)
- ✅ Pruned dead code — down to 30 intentional warnings
- ✅ Sentry error monitoring (client/server/edge config files + @sentry/nextjs)
- ✅ CI workflow (`.github/workflows/ci.yml` — type-check, lint, test, build on push)
- ✅ Cache consolidation — removed duplicate `__splitCache` in `lib/contracts.ts`, shared `lib/cache.ts`
- ✅ Feature flags (`config.features` in `lib/config.ts`) — non-core features default OFF

#### Phase 2 — Architecture ✅
- ✅ `lib/` → `services/` split — moved analytics, error-handler, rate-limit, auth to `services/` with backward-compatible re-exports
- ✅ `PaymentStrategyFactory` — singleton DI for payment strategies, replaces direct `new WriterCoinStrategy()` / `new MUSDStrategy()`
- ✅ `lib/api-response.ts` — standardized `ok()`, `fail()`, `notFound()`, `unauthorized()`, `forbidden()`, `serverError()`, `paginated()` helpers

#### Phase 3 — UX & Product ✅
- ✅ Progressive disclosure entry flow — wallet/chain/payment removed from first view. URL → game in 2 clicks
- ✅ Simplified `SimpleGameForm` — removed PaymentPath, wagmi hooks, payment toggle, chain warnings
- ✅ Contextual micro-copy — "Why pay?" explanation in generator form
- ✅ Writer ticker on homepage — just names + symbols, no chain/coin mentions

#### Phase 4 — Polish ✅
- ✅ `loading.tsx` + `error.tsx` at 5 route segments (`games/`, `my-games/`, `profile/`, `generate/`, `writers/[coinId]/`)
- ✅ `lib/request-dedup.ts` — `deduplicate<T>()` with LRU eviction (max 500)
- ✅ `lib/ai-cache.ts` — AI generation cache keys + deduplication wrapper, wired into `POST /api/games/generate`
- ✅ `lib/latency-monitor.ts` — `monitorLatency()` wrapper with 10K ring buffer, p50/p95/p99 reporting
- ✅ Bundle optimization — `GameGeneratorForm` dynamically imported on `/generate` page (`next/dynamic`, `ssr: false`)
- ✅ Global ToastProvider + Toaster already wired in `ClientProviders.tsx`

### CDR Hackathon Strategy (May 27 – June 5, 2026) — archived

Full submission history lives in [`docs/HACKATHONS_ARCHIVE.md`](./HACKATHONS_ARCHIVE.md#4-cdr-hackathon-by-story-protocol-may-27jun-5-2026-3k--archived). At the time: TEE-backed secret panels (`promptVaultUuid`, `tokenGate` on the Game NFT contract, completed-session + exact-`nftTokenId` unlock), vaulted Wordle answers, planned confidential asset marketplace. Superseded by Inco.

## Current Initiative: Creation UX (August 2026)

The first-run creation flow follows the [Creation UX Contract](./CREATION_UX.md): **Source → Story direction → Generate**. Creation is compact and mobile-first; advanced payment/model controls stay progressively disclosed; animation and ending expansion happen after a playable story exists.

### Delivered: Compact Creation & Progressive Optionality
- [x] Collapse the first-run creation surface to source, tone, story intensity, and one primary generate action
- [x] Make mobile continuation persistent and keep primary CTAs within reach
- [x] Use outcome-based visual presets instead of technical model names
- [x] Show a non-spoiler five-beat story shape before generation
- [x] Keep animation, alternate endings, and deep model controls in post-generation/refinement paths
- [x] Instrument and persist the mobile funnel, generation completion, play start, and post-completion expansion
- [x] Validate the flow at 390×844: no horizontal overflow; source input and preview action meet the 48px touch-target rule


### Delivered: Measurement
- [x] Add the bounded admin-only funnel report over persisted `ProductAnalyticsEvent` records (`GET /api/admin/analytics/funnel?days=30`, 1–90 day window)
- [x] Document the report as event-volume ratios rather than unique-user/session conversion

### Next: Post-Generation Expansion
- [ ] Add a retention/cleanup policy for `ProductAnalyticsEvent` before production volume grows materially
- [ ] Make the completion tray the home for share, ownership, reader insights, and animation
- [ ] Test demand for alternate endings before building a full ending editor
- [ ] Promote Workshop/Creator Studio as refinement, not a prerequisite for first play

## Phase 22: Generation UX & Payment Reliability (September 2026)

### Delivered: Generation Timeout & Cancellation
- [x] `GameGenerationOverlay` shows a slow warning at 45s and a stall warning at 90s with an explicit Cancel action
- [x] Generation fetch is wired to an `AbortController`; user cancellation stops the active HTTP request
- [x] `fetchWithTimeout` distinguishes timeout aborts (retryable) from user cancel aborts
- [x] `services/error-handler.ts` classifies `AbortError` so deliberate cancellation does not surface as a generic failure

### Delivered: Money-Moving API Response Standardization
- [x] `POST /api/credits/spend` returns `ok()` / `fail()` from `lib/api-response.ts` with stable codes (`SPEND_CONFLICT`, etc.)
- [x] `POST /api/payments/verify` returns structured errors for unauthorized, wallet mismatch, hash conflicts, missing payments, and validation failures
- [x] Credit spend uses an atomic Prisma update to prevent concurrent double-spend on the same balance

### Delivered: Cross-Instance Duplicate Generation Guard
- [x] Added `GenerationLock` Prisma model with `key (unique)`, `status`, `resultData`, and `expiresAt`
- [x] Added `lib/generation-lock.ts` `withSharedGenerationLock()` for Postgres-backed shared locking across Vercel instances
- [x] Updated `lib/ai-cache.ts` so `buildGenerationCacheKey()` includes `actorId` / `paymentId` and `deduplicateGeneration()` uses the shared lock
- [x] Added `@@unique([paymentId])` to `Game` and updated `GameDatabaseService.createGame()` to return the existing game on a payment-id unique violation
- [x] Added `tests/generation-lock.test.ts` covering owner, waiter, stale-lock takeover, and failure paths

## Platform Maturity

| Component | Status | Notes |
|-----------|--------|-------|
| Game Generation | ✅ Production | Multi-model AI pipeline; cross-instance `GenerationLock` dedup; `paymentId` unique per game |
| Asset Workshop | ✅ Production | Full WYSIWYG editor |
| NFT Minting | ✅ Production | Base mainnet |
| Story Protocol IP | ✅ Testnet | Aeneid (not yet on Base mainnet) |
| Lit Protocol | ✅ Production | NFT-gated secret panels |
| Story CDR | 📦 Archived | Vaulted Wordle answers + token-gated secret panels — see HACKATHONS_ARCHIVE |
| Hypercerts | ✅ Production | Impact certificates |
| Image Generation | ✅ Production | Multi-provider fallback |
| Payments | ✅ Production | 5 writer coins; standardized `/api/credits/spend` and `/api/payments/verify` responses |
| Marketplace | ✅ Production | Browse + compose |
| Panel Narration | ✅ Shipped | ElevenLabs TTS with auto-play (`useNarration`) |
| Panel Animation (I2V) | ✅ Shipped | Runware/Luma/Fal/Replicate registry (`useVideoMotion`), 50-credit upsell; fal MiniMax H3 family available (see VIDEO_ARTIFACT_PIPELINE.md) |

## Future Roadmap

### Phase 13: Media Expansion
- ~~ElevenLabs audio narration for panels~~ (shipped — `useNarration` + `NarrationControls`)
- ~~Video export of comics~~ (shipped — per-panel I2V animation via `useVideoMotion`; full-game trailer fusing panels remains)
- **Time-to-joy program** (see `docs/UX_PRINCIPLES.md` → "Time to joy"):
  - ~~Play-first hero CTA (`?play=1`)~~ — shipped
  - ~~Try-free-first generation (demo entitlement attempted before payment UI)~~ — shipped
  - ~~Post-generate lands in play mode; share links land playable~~ — shipped
  - ~~Panel image starts at stream 'options' event (overlaps stream tail)~~ — shipped
  - ~~Record-first generation (stub → navigate → async finalize, `generationStatus` + retry surface)~~ — shipped
  - ~~Replayable-run landing (`?watch=1` plays the run's clips/film before the play CTA)~~ — shipped
  - Next: per-panel prefetch hints
- **Flynn — iMessage distribution** (see `docs/IMESSAGE_AGENT.md` → "Why it exists"):
  - ~~Cloud-only entrypoint (`cloud.ts`) + PM2 deploy (`deploy:imessage`)~~ — shipped
  - ~~Cover-image attachment reveal + "film it" command + `?ref=flynn` attribution~~ — shipped
  - ~~Live on Photon managed lines (`flynn-imessage` on snel-bot)~~ — deployed
  - ~~In-app surface: "text it to Flynn" sms: links (gated on `NEXT_PUBLIC_FLYNN_IMESSAGE`)~~ — shipped
  - Next: measure flynn-attributed plays → creates; group-chat demo beat; Photon submission
- **H3-era video tiers** (fal MiniMax H3, faster-than-playback generation):
  - ~~Per-panel "animate this panel" micro-upsell (10 credits, mid-session)~~ — shipped
  - ~~Montage as continuous film — `end_image_url` chaining + VPS ffmpeg concat → `montageVideoUrl`~~ — shipped
  - ~~Auto-film on run completion (subsidized, `AUTO_FILM_DAILY_CAP`) + "claim your film" mint path (`animation_url`) + honest ending-path rarity on the share card~~ — shipped
  - Directed cut — player-prompted clip over their own panel stills (`reference-to-video`)
  - Animated BasePaint canvas for Daily Challenge
  - See `docs/VIDEO_ARTIFACT_PIPELINE.md` → "H3-era economics"
- Social sharing integrations
- Animated panel transitions

### Phase 14: Advanced Gameplay
- Branching narratives with consequences
- Character stats that affect outcomes
- Multiplayer story contributions
- Persistent game worlds across sessions

### Phase 15: Farcaster Integration
- Farcaster webhook notifications
- Push notifications for new games from followed writers
- `NotificationToken` model in Prisma schema
- Social sharing to Farcaster casts

### Phase 16: Story Protocol Mainnet
- Deploy to Story Protocol mainnet (when available on Base)
- Multi-asset derivative games
- Royalty payment automation
- Cross-chain IP verification

### Phase 17: Platform Scaling
- Redis caching for frequently accessed data
- BullMQ background job processing
- Database read replicas
- CDN for static assets
- Load balancing across regions
- Application performance monitoring (APM)
- Smart contract event monitoring

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI generation failures | Retry logic, multiple model fallbacks |
| Duplicate paid generations | `GenerationLock` (Postgres) + `@@unique([paymentId])` on `Game` |
| Story Protocol testnet issues | Mock mode for demos, graceful degradation |
| Image generation slow | Parallel generation, optimistic UI |
| Network dependency | Multi-provider fallback chain |
| User confusion | Progress indicators, tooltips, empty states |
| Inconsistent API errors | `lib/api-response.ts` standard; money-moving routes migrated |

## Collaboration Model

**On-chain revenue distribution** (configurable per writer coin):
- **Generation**: 60% Writer / 20% Platform / 20% Creator Pool
- **Minting**: 50% Creator / 15% Writer / 5% Platform (30% refunded to minter)

This ensures:
- Writers earn from readers using their content creatively
- Creators are rewarded for personalization work
- Platform sustainability for ongoing development

## Key Resources

- **Live Site**: https://writersarcade.vercel.app/
- **Story Protocol Docs**: https://docs.story.foundation/
- **Story Protocol Explorer**: https://aeneid-testnet-explorer.story.foundation/
- **Base Explorer**: https://basescan.org/
- **Farcaster Mini-App Docs**: https://docs.farcaster.xyz/mini-apps
