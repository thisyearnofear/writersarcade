# WritArcade

Turn Paragraph.xyz articles into interactive, mintable games. Players pay with writer coins, creators mint and share games, and revenue splits are enforced on-chain.

## What it does
- Generate playable games from article URLs (mini-app and web)
- **Advanced Customization**: Edit extracted assets (characters, story beats) in the Workshop
- **Creative Control**: Regenerate panel images and edit narrative text before minting
- Mint games as NFTs on Base; browse and play recent games
- Pay with writer coins (ERC-20 on Base) using RainbowKit/WC
- **Story Protocol Integration**: Register games and assets as IP with configurable licenses
- Configurable, on-chain revenue splits for generation and minting

## Core flow
1) **Input**: Paste article URL → AI extracts assets
2) **Customize (Optional)**: Edit characters & mechanics in Workshop
3) **Generate**: Compile assets into 5-panel comic story
4) **Refine**: Regenerate images with custom prompts + edit text
5) **Register**: Mint NFT & register IP on Story Protocol (user-owned)
6) **Revenue**: Splits executed on-chain (Writer/Platform/Creator)

## Why it matters
- Writers earn from reader creativity; readers become collaborators
- Games are IP assets with transparent splits and remixability
- **Story Protocol enables**: User-owned IP, derivative works with royalties, and composable assets
- Contracts are deployed and immutable; economics are programmatic

## Story Protocol Integration

WritArcade integrates deeply with Story Protocol (L1 blockchain for IP) to enable:

### 🔗 IP Registration
- **User-owned IP**: Users sign transactions with their wallet - they own the IP
- **Automatic metadata**: Game details, attribution, and assets stored on IPFS
- **PIL Licenses**: Commercial Remix licenses attached by default (10% royalty)

### 💰 Royalty System
- **Derivative royalties**: Original creators earn from remixes
- **On-chain tracking**: Parent-child relationships recorded
- **Claimable revenue**: Royalty claiming UI for IP owners

### 🧩 Asset Compatibility
- **Marketplace assets**: Characters, mechanics, and plots as standalone IP
- **Derivative games**: Games can reference parent assets
- **Composability**: Build on existing IP with proper attribution

### 📜 Technical Details
- **Network**: Story Aeneid testnet (Chain ID: 1315)
- **SDK**: `@story-protocol/core-sdk@^1.4.2`
- **Integration**: Client-side wallet signing (no platform keys)
- **Explorer**: https://aeneid-testnet-explorer.story.foundation/

## Architecture (quick view)
- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind + Framer Motion
- Web3: wagmi + viem + RainbowKit / WalletConnect
- Backend: Next.js API routes + Prisma + PostgreSQL
- AI: OpenAI/Anthropic via ai-sdk; image generation via Venice API
- IP: Story Protocol (testnet/mainnet configurable) + IPFS (Pinata)

See docs for details:
- Architecture: ./docs/architecture.md
- Development Guide: ./docs/development.md
- Roadmap: ./docs/roadmap.md
- Hackathon Details: ./docs/hackathon.md

## Smart contracts (Base mainnet)
- GameNFT: 0x778C87dAA2b284982765688AE22832AADae7dccC
- WriterCoinPayment: 0xf4d556E6E739B4Aa065Fae41f353a9f296371a35

Revenue model is enforced on-chain and configurable per writer coin by the owner:
- Game generation: writer/platform/creatorPool in basis points (must sum to 100%)
- NFT minting: creator/writer/platform in basis points (can be <100%; remainder returns to payer)


## Current defaults in code (can differ from on-chain)
- Static coin config lives in lib/writerCoins.ts (used for UX copy and cost formatting)
- Generation split in UI defaults to writer/creator/platform numbers from that file
- Minting split in code is 30% creator, 15% writer, 5% platform, 50% returned to payer (matches contract example)

Recommendation: fetch on-chain splits (getRevenueDistribution and mintDistributions) and render those values in UI to avoid drift.

## Quick start
1) Install and run
   - npm install --legacy-peer-deps
   - npm run dev
   - Open http://localhost:3000/mini-app
2) Configure env (see .env.example)
   - DATABASE_URL (PostgreSQL)
   - WalletConnect project ID (NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID)
   - Venice AI key (VENICE_API_KEY)
   - Story Protocol (STORY_RPC_URL, STORY_WALLET_KEY, STORY_NETWORK)
   - Pinata JWT + IPFS gateway
   - Base contract addresses (NEXT_PUBLIC_* in .env)

## Minimal API map (key routes)
- POST /api/games/generate → AI game generation
- POST /api/games/mint → mint via WriterCoinPayment + GameNFT
- GET /api/games/my-games → list user games
- POST /api/payments/initiate → prepare client payment flow
- POST /api/payments/verify → server-side verification
- POST /api/assets/generate|save|marketplace → asset pipeline
- POST /api/story/register → Story Protocol IP registration (client-side wallet signing)
- GET /api/story/royalties → Check royalty balances for user's IP
- POST /api/story/claim → Claim royalties from derivatives


## Development tips
- Prisma: npm run db:push | db:migrate | db:studio
- Contracts configured via env in lib/contracts.ts
- Images: next/image allows any https host (see next.config.js)

## Status
- Dev: ready
- Base mainnet: contracts live and verified (see addresses above)

—
WritArcade: Turn articles into playable, ownable games.
