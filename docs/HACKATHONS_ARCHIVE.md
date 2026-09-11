# Hackathons Archive

> **Status: archived.** Everything in this file is a past hackathon submission preserved for reference. It is not actively maintained and not part of the live product surface.
>
> **Live exception:** Flynn, the Photon iMessage agent, is the only live hackathon-derived surface. See [`docs/IMESSAGE_AGENT.md`](./IMESSAGE_AGENT.md). Do not move Photon content here.

## Why this file exists

WritersArcade accumulated one doc/section per hackathon (BasePaint, Inco Game Jam, Mezo, CDR, Etherfuse, SuperRare, Arbitrum, Bitso). That scattered the product narrative across `README.md`, `docs/ROADMAP.md`, `docs/BASEPAINT.md`, `docs/INCO_INTEGRATION.md`, `docs/FEATURES.md`, and `docs/ARCHITECTURE.md`.

Consolidation rule going forward:

- **Live product docs** (`README.md`, `FEATURES.md`, `ARCHITECTURE.md`, `ROADMAP.md`) describe what is live today. Historical hackathon detail lives here.
- **Deep technical references** (`docs/BASEPAINT.md`, `docs/INCO_INTEGRATION.md`) are kept as-is for implementation detail but are marked archived at the top and point back here.
- **New hackathons** get a section here first. Only graduate to live docs when the feature ships as a maintained product surface.

---

## 1. BasePaint Hackathon (Aug 1–8, 2026) — archived

**Category:** Art projects — games and remixes made with BasePaint.
**Live residue:** Daily Challenge (`/basepaint`, `/daily` redirects there) still exists as a product surface, but the hackathon submission framing is retired.

**What it was:** Daily Challenge staged a featured writer's Paragraph article *inside today's BasePaint canvas*. Everyone played the same world each day; each player drew a private hand of five encrypted modifier cards held in Inco vaults on Base mainnet. Canvas art was read from BasePaint's own APIs (theme endpoint + `api/art/image`), fed to a vision model so comics were grounded in actual pixels.

**Built during the window** (42 commits, Aug 4–8): dual-source Daily (Paragraph auto-pick + BasePaint world), vision-grounded comics, encrypted modifier deck + NFT-gated panels migrated to on-chain Inco vaults, BasePaint generate flow + deck-shuffle fallbacks, Daily vault redeploy on Base mainnet + VPS cron, canvas URL fix / Base-as-default / client feature flag, paid-session resume + money-safe onboarding, landing-page rebuild around today's canvas.

**Technical reference:** [`docs/BASEPAINT.md`](./BASEPAINT.md) (archived header) — dual-source design, `lib/basepaint/` modules, env vars, Paragraph auto-pick + ops routes, demo script.
**Contracts (Base mainnet):** `DailyChallengeVault` v3 `0xcc271a53e4286012f3289273fdaa32f66fa64a33`, `SecretPanelVault` `0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8`.

## 2. Inco Summer Game Jam 2026 (Inco Prize Track) — archived

**Chain:** Base mainnet. **SDK:** `@inco/lightning-js` + Solidity `@inco/lightning`.
**Technical reference:** [`docs/INCO_INTEGRATION.md`](./INCO_INTEGRATION.md) (archived header).

**What it was:** Confidential-compute game loop — encrypted 52-card modifier deck (`e.shuffledRange`), per-player 5-card hands via `allow(player)`, FHE gradient scoring (10 | 6 | 3 | 1 via branch-free ring distance), player-initiated `completeAndReveal()`, NFT-gated encrypted epilogues in `SecretPanelVault` via `attestedDecrypt`.

## 3. Mezo Hackathon, MUSD track (Apr–May 2026) — archived

**What it was:** Bitcoin-backed MUSD payments on Mezo Matsnet (chainId 31611): `MUSDStrategy` (approve → `payForGeneration` / `payAndMintGame`), atomic on-chain splits, Mezo Passport + MUSD UI toggles, `useMUSDBalance` / `useMezoBalance` + "MEZO Holder" badge, one-click pay flow, `/mezo/analytics` dashboard.

**Contracts (Mezo Matsnet, testnet):**
- `MezoPaymentSplitter` `0x32D0356f533cC429F94Db73f383bBb21a459E16b`
- `MezoBoostedSplitter` v2 (10% creator boost for MEZO holders) `0x56Ee5A3f122da00B635DdbB319708e24450aEB89`
- `GameNFTMezo` `0xb6001687e4700843e0a04a442031525f669465e7`
- MUSD token `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`, MEZO (read-only perks) `0x7B7c000000000000000000000000000000000001`

Code remains (`domains/payments/strategies/musd.strategy.ts`, `lib/writer-coins.ts` MUSD/MEZO config) but the track is not live.

## 4. CDR Hackathon by Story Protocol (May 27–Jun 5, 2026, $3k) — archived

**What it was:** Move "Secret Panel" logic from Lit Protocol (ERC-721 gating) to Story Confidential Data Rails (CDR) — TEE-backed vaults (`promptVaultUuid`), `tokenGate` read conditions on the Game NFT contract, unlock on completed 5-panel session + exact `nftTokenId` ownership; Wordle answers vaulted as secondary proof point; planned confidential asset marketplace. Superseded by Inco (see §2).

## 5. General-track sponsor targets (deprecated, never live product) — archived

From the old `README.md` "Hackathon Targets" table, preserved here so the README can stay product-focused:

| Sponsor | Track | Prize | What was built |
|---------|-------|-------|----------------|
| Etherfuse | General | $1,000 USD | Fiat onramp → game credits (`lib/etherfuse.ts`, `app/api/ramp/*`) — deprecated |
| SuperRare | General | $700 USDC | NFT collectibles for game artifacts (`lib/superrare.ts`, `app/api/superrare/mint`) — deprecated |
| SuperRare | Startups | $700 USDC | Premium game collectibles — deprecated |
| Arbitrum | General | $380 USDC | Base (Arbitrum Nova family) — existing Base integration |
| Arbitrum | Startups | $650 USDC | Cross-chain DeFi (aspirational) |
| Bitso | General | $1,100 USDC | Stablecoin payments via Etherfuse USDC on Base — deprecated |

## 6. What stays live (not in this archive)

- **Flynn / Photon iMessage agent** — `docs/IMESSAGE_AGENT.md`. Live PM2 `flynn-imessage`, cloud-only entrypoint, `?ref=flynn` attribution. The only hackathon surface treated as live.
- **Daily Challenge as a product feature** (sans hackathon framing) — `/basepaint`, Inco vaults, VPS cron. Product description lives in `docs/FEATURES.md`; hackathon history lives in §1 above.
- **Inco vaults as infrastructure** (sans Game Jam framing) — contract addresses in `docs/ARCHITECTURE.md`; jam history lives in §2 above.
