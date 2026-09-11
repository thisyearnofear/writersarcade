# README

# writersarcade

Turn Paragraph.xyz articles into interactive, mintable games. Players pay with writer coins, creators mint and share games, and revenue splits are enforced on-chain.

## Daily Challenge (`/basepaint`)

The shared daily ritual: a featured writer's Paragraph article staged inside today's BasePaint canvas — same world for everyone, unique encrypted Inco modifier hand per player, leaderboard. Implementation notes live in [`docs/BASEPAINT.md`](docs/BASEPAINT.md); hackathon submission history lives in [`docs/HACKATHONS_ARCHIVE.md`](docs/HACKATHONS_ARCHIVE.md).

## What it does

- **Generate playable stories** from article URLs, marketing copy, or any pasted text (`/studio`)
- **iMessage agent (Flynn)**: text a link to prose and get a playable story back, with optional natural-language tone
- **No wallet required to start**: try one free story, then upgrade with credits or crypto
- **Interactive comic player**: 5-panel narratives where reader choices shape the outcome
- **Embeddable player**: wallet-free iframe (`/embed/[slug]`) with `?ref=` attribution and a "Made with WritersArcade" backlink
- **Resonance analytics**: creator dashboard showing starts, completions, panel funnel, and which choices framings readers prefer
- **Advanced Customization**: Edit extracted assets (characters, story beats), endings, and IP in the Workshop after the core story exists
- **Creative Control**: Regenerate panel images and edit narrative text before minting
- Mint games as NFTs on Base; browse and play recent games
- Pay with writer coins (ERC-20 on Base) using RainbowKit/WalletConnect, or buy credits with fiat
- **Story Protocol Integration**: Register games and assets as IP with configurable licenses
- **Inco Integration**: NFT-gated secret panels + Daily Challenge modifier deck on Base mainnet
- **Video Animation**: Post-completion hero clip + whole-comic montage upsell (Runware/Luma/fal/Replicate)
- **Panel Narration**: ElevenLabs TTS with cinematic auto-play

## Core flow

The first-run creation path is intentionally compact: **Source → Story direction → Generate**.

1. **Source**: Paste an article URL or supported copy and preview it
2. **Story direction**: Choose tone and story intensity; visual finish and payment details are optional advanced controls
3. **Generate**: Complete the required payment/free path and create a 5-panel playable story
4. **Play**: Make choices that shape the narrative and resolution
5. **Expand**: Share, own/unlock, inspect reader insights, or optionally animate the completed comic
6. **Refine**: Use Workshop/Creator Studio for deeper asset, ending, model, and IP controls

The first-run path does not require users to understand wallets, chains, tokens, model providers, NFTs, or Story Protocol.

## Quick start

```bash
pnpm install
cp .env.example .env.local  # Edit with your API keys
pnpm dev
# Open http://localhost:3000
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for full setup.

## Documentation

| Doc | Purpose |
|-----|---------|
| [Architecture](./docs/ARCHITECTURE.md) | System design, tech stack, data models, smart contracts, Inco mechanics |
| [Features](./docs/FEATURES.md) | Platform features, roadmap, integrations, video pipeline |
| [Creation UX](./docs/CREATION_UX.md) | Creation contract, UX principles, feedback triage, mobile rules |
| [Development](./docs/DEVELOPMENT.md) | Setup, commands, environment, API endpoints, troubleshooting |
| [BasePaint](./docs/BASEPAINT.md) | Daily Challenge dual-source design, `lib/basepaint/` modules, ops routes |
| [iMessage Agent (Flynn)](./docs/IMESSAGE_AGENT.md) | **Live** — Spectrum iMessage agent that turns article links into playable stories |
| [Hackathons Archive](./docs/HACKATHONS_ARCHIVE.md) | All past hackathon history (BasePaint, Inco Jam, Mezo, CDR, sponsors) |

## Tech stack

- **Frontend**: Next.js 16 + TypeScript + TailwindCSS + Framer Motion
- **Web3**: wagmi + viem + RainbowKit / WalletConnect
- **Backend**: Next.js API routes + Prisma + PostgreSQL
- **AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Modal + Netmind (images); Runware + Luma + fal + Replicate (hero video fallbacks)
- **IP**: Story Protocol (testnet) + IPFS (Pinata primary, Grove metadata fallback; Pinata binary storage required for durable hero video)
- **Access Control**: Inco (`@inco/lightning-js` + `@inco/lightning`) — secret panels, Wordle answers, daily challenge sessions
- **Impact**: Hypercerts (AT Protocol) — deprecated / not actively maintained

## Smart contracts

**Base mainnet** (production writer-coin payments)
- **GameNFT**: `NEXT_PUBLIC_GAME_NFT_MAINNET` — [`0x32D0356f533cC429F94Db73f383bBb21a459E16b`](https://basescan.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b)
- **WriterCoinPayment**: `NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET`
- **SecretPanelVault**: [`0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8`](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8)
- **DailyChallengeVault** (v3 — per-panel FHE verdicts, gradient scoring, 2026-08-12): [`0xcc271a53e4286012f3289273fdaa32f66fa64a33`](https://basescan.org/address/0xcc271a53e4286012f3289273fdaa32f66fa64a33)
- Deployment guide: [contracts/deploy.md](./contracts/deploy.md)

**Mezo Matsnet (testnet)** — archived hackathon track, see [`docs/HACKATHONS_ARCHIVE.md`](docs/HACKATHONS_ARCHIVE.md#3-mezo-hackathon-musd-track-aprmay-2026--archived). Contracts (`MezoPaymentSplitter`, `MezoBoostedSplitter` v2, `GameNFTMezo`) and MUSD/MEZO config remain in code for reference.

Revenue splits enforced on-chain, configurable per writer coin.

## Status

- **Live**: https://writersarcade.vercel.app/
- **Contracts**: Base mainnet (verified on Sourcify)
- **Story Protocol**: Aeneid testnet (IP registration)

---

## Past hackathons (archived)

All hackathon history except the live Flynn / Photon iMessage agent lives in [`docs/HACKATHONS_ARCHIVE.md`](docs/HACKATHONS_ARCHIVE.md): BasePaint (Aug 2026), Inco Summer Game Jam, Mezo MUSD track, CDR, Etherfuse, SuperRare, Arbitrum, Bitso.

---

**writersarcade**: Turn writing into playable, ownable games — Daily Challenge stages a featured article inside today's BasePaint canvas, with your secret Inco hand.
