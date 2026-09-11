# Hackathons Archive

> **Status: archived.** Everything here is past hackathon submission history preserved for reference. Not actively maintained.
>
> **Live exception:** Flynn, the Photon iMessage agent, is the only live hackathon-derived surface. See [`docs/IMESSAGE_AGENT.md`](./IMESSAGE_AGENT.md).

## 1. BasePaint Hackathon (Aug 1–8, 2026)

**What it was:** Daily Challenge staged a featured writer's Paragraph article inside today's BasePaint canvas. Everyone played the same world each day; each player drew a private hand of five encrypted modifier cards held in Inco vaults on Base mainnet.

**Built:** Dual-source Daily (Paragraph auto-pick + BasePaint world), vision-grounded comics, encrypted modifier deck + NFT-gated panels migrated to on-chain Inco vaults, VPS cron, landing-page rebuild. 42 commits.

**Live residue:** Daily Challenge (`/basepaint`) still exists as a product surface. Tech reference: [`docs/BASEPAINT.md`](./BASEPAINT.md).

## 2. Inco Summer Game Jam 2026 (Inco Prize Track)

**What it was:** Confidential-compute game loop — encrypted 52-card modifier deck (`e.shuffledRange`), per-player 5-card hands via `allow(player)`, FHE gradient scoring (10 | 6 | 3 | 1), player-initiated `completeAndReveal()`, NFT-gated encrypted epilogues in `SecretPanelVault`.

**Tech reference:** See the Inco section above in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

## 3. Mezo Hackathon, MUSD track (Apr–May 2026)

**What it was:** Bitcoin-backed MUSD payments on Mezo Matsnet (chainId 31611): `MUSDStrategy`, atomic on-chain splits, Mezo Passport + MUSD UI, `useMezoBalance` + "MEZO Holder" badge, one-click pay flow, `/mezo/analytics` dashboard.

**Contracts (Mezo Matsnet):**
- `MezoPaymentSplitter` `0x32D0356f533cC429F94Db73f383bBb21a459E16b`
- `MezoBoostedSplitter` v2 `0x56Ee5A3f122da00B635DdbB319708e24450aEB89`
- `GameNFTMezo` `0xb6001687e4700843e0a04a442031525f669465e7`

Code remains (`musd.strategy.ts`, MUSD/MEZO config) but the track is not live.

## 4. CDR Hackathon by Story Protocol (May 27–Jun 5, 2026, $3k)

**What it was:** Move "Secret Panel" logic from Lit Protocol to Story Confidential Data Rails — TEE-backed vaults (`promptVaultUuid`), `tokenGate` on the Game NFT contract, unlock on completed 5-panel session + exact `nftTokenId` ownership. Superseded by Inco.

## 5. Sponsor Targets (deprecated, never live product)

| Sponsor | Track | Prize | What was built |
|---------|-------|-------|----------------|
| Etherfuse | General | $1,000 USD | Fiat onramp → game credits — deprecated |
| SuperRare | General + Startups | $1,400 USDC | NFT collectibles for game artifacts — deprecated |
| Arbitrum | General + Startups | $1,030 USDC | Base integration (existing) |
| Bitso | General | $1,100 USDC | Stablecoin payments via Etherfuse USDC — deprecated |

## 6. What stays live (not archived)

- **Flynn / Photon iMessage agent** — [`docs/IMESSAGE_AGENT.md`](./IMESSAGE_AGENT.md). Live PM2 `flynn-imessage`.
- **Daily Challenge as a product feature** — `/basepaint`, Inco vaults, VPS cron. Description in [`docs/FEATURES.md`](./FEATURES.md).
- **Inco vaults as infrastructure** — contract addresses in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).
