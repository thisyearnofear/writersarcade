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

### 3. Current Status
**Phase 6 (Week 12): Asset Marketplace & IP Minting** - 100% complete
- ✅ Core Game Engine (Articles -> Games)
- ✅ Smart Contracts ($AVC Payments + Revenue Splits)
- ✅ Asset Workshop (Decompose Articles -> Characters/Mechanics)
- ✅ Marketplace Sidebar (Inject Community Assets)
- ✅ Story Protocol Integration (One-Click IP Minting)
- ✅ Composability Layer (Derivatives & parent asset tracking)

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

### Week 5b Achievements (UI/UX Polish)
- ✅ Compact success modal (75% size reduction)
- ✅ Venice AI image generation for game cover art
- ✅ Visual game pages with hero images
- ✅ Embedded game display (no new tabs)
- ✅ Improved customization accuracy (genre/difficulty)
- ✅ Less verbose game interface
- ✅ Color-coded UI elements per game

### Week 5a Achievements (Browser Wallet Implementation)
- ✅ WalletConnectButton component (RainbowKit integration)
- ✅ PaymentOption wrapper for payment flows
- ✅ Game generator enhanced with payment UI
- ✅ Customization requires payment (optional)
- ✅ Free + premium game flows both working
- ✅ MetaMask, Coinbase Wallet, WalletConnect support
- ✅ WalletSync enhanced for browser wallet tracking
- ✅ Header updated with wallet connection button
- ✅ Feature parity: 95% code sharing with mini-app
- ✅ Unified endpoints: /api/games/generate, /api/payments/*
- ✅ All 8 core principles implemented

## Deployment Status

| Environment | Status | Notes |
|-------------|--------|-------|
| Dev | ✅ Ready | Local testing working |
| Vercel (staging) | ✅ Ready | Auto-deploy on main branch |
| Base Sepolia | ⏳ Week 4 | Contract deployment |
| Base Mainnet | ⏳ Week 5 | Production launch |

---

**WritArcade: Turn any article into a playable game, instantly.** 🎮

*For complete technical details, architecture decisions, and implementation guidance, see our consolidated documentation files.*