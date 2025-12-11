# WritArcade

Transform articles into playable, mintable games where readers can spend writer coins to generate unique game interpretations—all natively within Farcaster.

## Vision

**Collaborative Content Creation with Newsletter Authors on Paragraph.xyz**

WritArcade enables readers to collaborate with their favorite newsletter authors by transforming articles into unique, playable games. Starting with Fred Wilson's AVC newsletter, users spend $AVC tokens to generate novel game experiences based on Fred's content, creating a new revenue stream that benefits everyone:

- **Writers** (Fred Wilson): Earn 35% of all transaction revenue from games based on their content
- **Game Creators**: Earn 35% revenue share when others play their generated games  
- **Token Burn**: 20% of all transactions burned for deflationary tokenomics
- **Platform**: Sustains development with 10% platform fee

This creates a sustainable ecosystem where high-quality content drives new forms of engagement, writers monetize their archives, and readers become creative collaborators rather than passive consumers.

## Core Flow

```
User in Farcaster → Select $AVC → Paste Fred's Article URL → Customize Game Style → Pay 100 $AVC → AI Generates Game → Play → Mint as NFT (50 $AVC)
```

**Revenue Distribution (via 0xSplits):**
- 35% → Fred Wilson's treasury (writer collaboration)
- 35% → Game creator (for future plays of their specific game)  
- 20% → Token burn (deflationary mechanism)
- 10% → Platform development & operations

## Quick Start

### 1. Local Development
```bash
cd /Users/udingethe/Dev/WritArcade
npm install --legacy-peer-deps
npm run dev
# Opens: http://localhost:3000/mini-app
```

### 2. Key Setup Requirements
- **Environment**: PostgreSQL database connection
- **API Keys**: OpenAI, Anthropic for game generation
- **Wallet**: Farcaster Wallet (built into Mini App SDK)


## Documentation

Our documentation is consolidated into 4 comprehensive guides:

### 📋 [Architecture & System Design](./docs/architecture.md)
- Unified architecture for web app + mini-app
- **New:** Dual-Loop Design (Attention vs. IP)
- Database schema and payment tracking
- Dual-chain integration (Base + Story Protocol)

### 🛠️ [Development Guide](./docs/development.md)
- Local setup and configuration
- Mini App SDK integration and wallet setup
- API endpoints and smart contract deployment

### 🗺️ [Roadmap & Status](./docs/roadmap.md)
- Complete implementation phases and timeline
- **New:** Phase 6 Delivery (Workshop & Marketplace)

### 🏆 [Hackathon Participation](./docs/hackathon.md)
- Story Protocol hackathon implementation
- **New:** "Surreal World" track features (Asset composability)
- SDK usage examples and best practices

## Tech Stack

### Frontend
- **Mini App**: `@farcaster/miniapp-sdk`
- **Web App**: Next.js 16 + TypeScript + TailwindCSS
- **State**: Framer Motion + React Context

### Backend
- **API**: Next.js API routes (Serverless)
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI / Anthropic (Content Decomposition)

### Blockchain
- **Base (L2)**: Payments ($AVC), Revenue Splits (0xSplits)
- **Story Protocol (L1)**: IP Registration (SPG), Licensing, Royalties

## Architecture Principles

- **Single Source of Truth**: Farcaster identity + Story IP Registry
- **Privacy by Design**: No PII storage, users control their data
- **Asset First**: Everything is a remixable primitive

## Writer Coins (MVP)

### $AVC (Fred Wilson) - Collaboration Model
- **Address**: `0x06FC3D5D2369561e28F261148576520F5e49D6ea`  
- **Paragraph Publication**: https://avc.xyz/ (Fred Wilson's newsletter)
- **Revenue Split** (via 0xSplits + Story Protocol):
  - 35% → Fred Wilson (Source Material)
  - 35% → Game creator / Asset Remixers
  - 20% → Token burn
  - 10% → Platform
- **IP Layer**: Story Protocol manages derivative rights and ongoing royalties

## Current Implementation Status

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1-4**: Core Game Engine | ✅ Complete | 100% |
| **Phase 5**: Wallet & Monetization | ✅ Complete | 100% |
| **Phase 6**: Asset Workshop & IP Minting | ✅ Complete | 100% |
| **Phase 7**: Mainnet Launch | ⏳ Pending | 0% |


## Deployment Status

| Environment | Status | Details |
|-------------|--------|---------|
| Dev | ✅ Ready | Local testing working |
| Vercel (staging) | ✅ Ready | Auto-deploy on main branch |
| Base Mainnet | ✅ Live | Contracts deployed & verified |
| - GameNFT | ✅ Verified | [0x778C87dAA2b284982765688AE22832AADae7dccC](https://repo.sourcify.dev/8453/0x778C87dAA2b284982765688AE22832AADae7dccC) |
| - WriterCoinPayment | ✅ Verified | [0xf4d556E6E739B4Aa065Fae41f353a9f296371a35](https://repo.sourcify.dev/8453/0xf4d556E6E739B4Aa065Fae41f353a9f296371a35) |

---

**WritArcade: Turn any article into a playable game, instantly.** 🎮

*For complete technical details, architecture decisions, and implementation guidance, see our consolidated documentation files.*