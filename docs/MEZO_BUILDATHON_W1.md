# Mezo Buildathon — Wave 1 submission kit (WritersArcade)

Paste-ready copy for the AKINDO form, the deck outline, and the 2-minute
video script. Track: **2 — Access and Distribution for MUSD/MEZO**.

## AKINDO form

**Project name:** WritersArcade

**Category (3-5 words):** MUSD payments, creator games

**TL;DR:** Turn any article into a playable, mintable mini-game — pay with
Bitcoin-backed MUSD on Mezo, or top up arcade credits with MUSD in a single
transaction.

**How it works:**
Writers and readers paste an article URL; WritersArcade generates a playable
5-panel story game. Payments run on a dual rail: off-chain credits for
wallet-free users, and MUSD on Mezo for on-chain users. MUSD game payments go
through `MezoBoostedSplitter`, which splits revenue atomically between
platform, writer, and creator — and applies an on-chain **+10% writer/creator
boost when the payer holds ≥1 MEZO** (read via the MEZO precompile, enforced
in-contract). New this wave: a **"buy credits with MUSD" onramp** — a plain
`MUSD.transfer` to the treasury, verified on-chain (calldata + Transfer event
+ sender binding), grants credits idempotently by tx hash, with a +10% bonus
for MEZO holders. This makes MUSD the funding layer for the entire product
economy — the most direct possible answer to "make MUSD easier to use."

**Target group:** Writers, newsletter creators, and casual readers who want to
play/mint games from articles — desktop and mobile, wallet-optional
(credits/fiat for newcomers, MUSD for crypto-native users).

**Tech stack:** Next.js 16 (App Router), wagmi + viem + RainbowKit + Mezo
Passport, Solidity 0.8.x contracts on Mezo testnet (Foundry), Postgres/Neon +
Prisma, Fastify backend, iMessage agent (Flynn).

**Track:** Track 2 — Access and Distribution.

**Chain deployed on:** Mezo testnet (chainId 31611); mainnet-ready —
`deploy-mezo-mainnet.sh` ships in-repo.

**Project status:** Existing live product (https://writersarcade.vercel.app)
with new MUSD/MEZO features added during the hackathon window.

**What's new in Wave 1 (Oct 2026):**
- Corrected `generate-game` MUSD payments to `payForGeneration` (previously
  routed through `payAndMintGame` with placeholder metadata — minted junk
  NFTs and failed backend verification).
- MEZO-holder boost surfaced in the payment UI and **extended to the credit
  onramp**: MEZO holders earn +10% credits on MUSD top-ups.
- New `POST /api/credits/purchase-musd`: verified MUSD→credits onramp,
  idempotent by tx hash, retryable on RPC index lag.
- Auto chain-switch on MUSD selection; chain-agnostic payment labels.
- Live proof: E2E against the production deployment — real `payForGeneration`
  tx with `boosted=true` and a real treasury transfer that granted credits.

**Project readiness:** Testnet deployment, verified end-to-end on the live
app. Explorer evidence:
- `payForGeneration` (boosted): https://explorer.test.mezo.org/tx/0x43893294991ffa921f0c026251b7a988328602b481b9d00cd549577efb6c430b
- MUSD treasury transfer → credits: https://explorer.test.mezo.org/tx/0x67246c1504cca1ac99d7638c641a52a866f47f9b86aa17f1f220b605f1839ce1

**Future milestones (Wave 2+):**
1. Mezo mainnet deployment of `MezoBoostedSplitter` + `GameNFTMezo`
   (deploy script ready; needs mainnet BTC gas).
2. Flynn iMessage MUSD top-ups — "text a link, pay with MUSD, get a game" —
   extending MUSD access to a messaging surface.
3. Cross-chain MUSD entry (Base/Ethereum) so EVM users fund credits without
   bridging manually.

## Deck outline (6 slides)

1. **Problem** — writers can't monetize content as interactive media;
   stablecoin payments are high-friction for non-crypto audiences.
2. **Product** — paste a link → playable game → mintable NFT. Live today.
3. **Mezo integration** — MUSD payment rail (atomic splits), MEZO-holder
   boost on-chain, MUSD→credits onramp. Show the splitter contract + event.
4. **Economics** — 1 credit = $0.10, generate = 10 credits ≈ 1 MUSD;
   ~85–99% margins; MUSD funds the whole economy.
5. **Proof** — the two explorer links above + screenshot of the boost badge.
6. **Roadmap** — mainnet, Flynn iMessage MUSD, cross-chain top-ups.

## 2-minute video script (shot list)

- 0:00–0:20 — Hook: "Any article becomes a game you can own — paid for with
  a Bitcoin-backed stablecoin." Show landing → paste a Paragraph URL.
- 0:20–0:45 — Wallet-free path: generate with credits. One line: "no wallet
  required to start."
- 0:45–1:15 — **The onramp**: green credits pill (top bar, left of the wallet
  chip; or kebab menu → "Buy credits") → Buy Credits modal opens on the
  "MUSD on Mezo" tab → "Pay 10 MUSD on Mezo" →
  wallet confirm → "+110 credits added — incl. +10% MEZO holder bonus" →
  explorer link. (This is the demo's centerpiece: one tx, verified on-chain.)
- 1:15–1:40 — Crypto-native path: pick MUSD in the payment selector → auto
  chain-switch (MEZO Holder badge shows under the selector) → payForGeneration
  → generation overlay shows "Payment confirmed on-chain · View transaction ↗"
  → explorer shows `boosted=true`.
- 1:40–2:00 — Close: "MUSD funds the whole arcade. MEZO holders get more.
  Live on Mezo testnet, mainnet-ready." Show contract addresses + live URL.
