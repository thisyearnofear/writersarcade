# WritArcade

Transform articles into playable, mintable games where readers can spend writer coins to generate unique game interpretations—all natively within Farcaster.

## Vision

Give AVC readers a new way to engage: turn Fred Wilson's articles into playable, mintable games using $AVC tokens. Users select genre (Horror/Comedy/Mystery) + difficulty (Easy/Hard), pay 100 $AVC, generate unique game interpretations, and optionally mint as Base NFTs for 50 $AVC.

## Core Flow

```
User in Farcaster → Select Writer Coin → Paste Article URL → Customize Game → Pay & Generate → Play → Mint as NFT
```

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
**Phase 3 (Week 4): Feature Parity & Unified Architecture** - 85% complete
- ✅ Mini App SDK migration (Frames v2 → Mini Apps)
- ✅ 4-step user flow (coin → article → customize → play)
- ✅ Game generation API + unified endpoints
- ✅ Smart contracts (WriterCoinPayment + GameNFT)
- ✅ Wallet abstraction layer (Farcaster + browser wallets)
- ✅ True feature parity: web app + mini app share 95% business logic
- ⏳ Browser wallet support for web app (Phase 2)

## Documentation

Our documentation is organized for clarity and actionability:

### 📋 [Architecture & System Design](./docs/ARCHITECTURE.md)
- Farcaster-native identity architecture
- Database schema and purpose
- Writer coin economics and revenue distribution
- Smart contracts (Base blockchain)
- Deployment checklist and environment setup

### 🛠️ [Development Guide](./docs/DEVELOPMENT.md)
- Local setup and configuration
- Mini App SDK migration guide (Frames v2 → Mini Apps)
- File structure and key components
- Common issues and troubleshooting
- Testing procedures and success metrics

### 🗺️ [Roadmap & Status](./docs/ROADMAP.md)
- Complete product vision and strategic planning
- Current development status and completed tasks
- Implementation phases (5-week MVP timeline)
- Go-to-market strategy and success metrics
- Future vision and competitive advantages

### 🔗 [Feature Parity Implementation](./docs/FEATURE_PARITY_IMPLEMENTATION.md) ⭐ **NEW**
- Option C implementation: True feature parity between web + mini app
- Wallet abstraction layer (Farcaster + browser wallets)
- Unified payment service & shared components
- Phase 1 complete ✅ / Phase 2 roadmap

### 📊 [Web vs Mini App Analysis](./docs/WEB_VS_MINIAPP_PARITY.md)
- Current state: Significant divergence → Unified architecture
- Feature comparison and code duplication analysis
- Post-MVP vision with browser wallet support

## Tech Stack

### Frontend
- **Mini App**: `@farcaster/miniapp-sdk` (November 2025 standard)
- **Framework**: Next.js 16 + TypeScript
- **Styling**: TailwindCSS

### Backend
- **API**: Next.js API routes
- **Database**: PostgreSQL + Prisma ORM
- **Game Generation**: Infinity Arcade pipeline + OpenAI

### Blockchain
- **Network**: Base mainnet
- **Contracts**: WriterCoinPayment.sol + GameNFT.sol
- **Wallet**: Farcaster Wallet (built-in)

## Architecture Principles

- **Single Source of Truth**: Farcaster owns social identity
- **Privacy by Design**: No PII storage, users control their data
- **Simplified Architecture**: Direct wallet → Farcaster API → Display
- **Modular Design**: Composable, testable components

## Writer Coins (MVP)

### $AVC (Fred Wilson)
- **Address**: `0x06FC3D5D2369561e28F261148576520F5e49D6ea`
- **Game Generation**: 100 $AVC
- **NFT Minting**: 50 $AVC
- **Revenue Split**: 60% writer, 20% platform, 20% community pool

### Additional Tokens
- Writer Coin #2: TBD
- Writer Coin #3: TBD

## Success Metrics (MVP)

### Week 5 Launch Goals
- 50+ Farcaster users
- 20+ games generated
- 5+ games minted as NFTs
- Zero critical bugs

### Week 8 Post-Launch
- 100+ users
- 100+ games generated
- 30+ minted NFTs
- <5 minutes for complete flow

## Current Implementation Status

| Phase | Status | Completion |
|-------|--------|------------|
| **Week 1-2**: Mini App Foundation | ✅ Complete | 100% |
| **Week 3**: Game Generation | ✅ Complete | 100% |
| **Week 4a**: Smart Contracts & Payments | ✅ Complete | 100% |
| **Week 4b**: Feature Parity & Unification | ✅ Complete | 100% |
| **Week 5**: NFT Minting & Browser Wallets | ⏳ In Progress | 20% |

### Week 4b Achievements (Feature Parity Implementation)
- ✅ Wallet abstraction layer (`/lib/wallet/` - Farcaster + MetaMask)
- ✅ Shared payment service (`/domains/payments/` - unified cost calculation)
- ✅ Shared UI components (`/components/game/` - GenreSelector, DifficultySelector, PaymentFlow)
- ✅ Unified endpoints (`/api/games/generate`, `/api/payments/`)
- ✅ Mini-app GameCustomizer refactored to use shared components (-42% code)
- ✅ Web app supports optional customization
- ✅ Single source of truth for all business logic

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