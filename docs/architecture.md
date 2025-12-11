# WritArcade Architecture

**Last Updated:** December 12, 2025
**Status:** Phase 7 - Customization MVP (Surreal World Assets Buildathon)

## Overview

WritArcade is a **dual-loop platform** designed to maximize the value of content:

1.  **The Attention Loop (Base Chain)**:
    *   **User Action**: "I like this article. Generate a game."
    *   **Value**: Immediate engagement, fun, writer attribution.
    *   **Tech**: AI Content Decomposer + Quick Game Engine.
    *   **Status**: Live & Mature.

2.  **The IP Loop (Story Protocol)**:
    *   **User Action**: "I want to own this Character. I'll mint it."
    *   **Value**: Permanent asset ownership, composability, future royalties.
    *   **Tech**: Asset Workshop + Story Protocol IP Registry.
    *   **Status**: Live (Hackathon Beta).

Both loops share the same codebase but serve different user needs: *Consumption* vs. *Creation*.

## Unified Architecture

### Core Design Principles

#### **Single Source of Truth**
- `Asset` model in Database serves both "Drafts" (off-chain) and "Registered IP" (on-chain).
- Middleware determines if an asset is "Local" or "Story-backed".

#### **Aggressive Consolidation**
- We avoided creating separate `MarketplaceItem` and `UserAsset` tables.
- A single `Asset` table handles:
  - `type: 'pack'` (Collections of assets)
  - `type: 'character'` (Individual atomic assets)
  - `storyIpId` (The on-chain link)

## Dual-Product System Design

### Asset Marketplace Architecture (The "Workshop")

The Workshop is the bridge between *Reading* and *Owning*.

```
Article URL
  │
  ▼
Decomposition Engine (AI)
  │── Extracts Characters (Profiles, Motivations)
  │── Extracts Mechanics (Rules, Items)
  │── Extracts World (Setting, Visuals)
  │
  ▼
Workshop UI (The Editor)
  │── User edits/refines extracted assets
  │── User injects "Community Assets" (Marketplace Sidebar)
  │── User SAVES Draft (Database Persistence)
  │
  ▼
Minting Pipeline (Story Protocol)
  │── Hashing: Creates content hash of the Asset JSON
  │── Storage: Uploads IP Metadata + NFT Metadata to IPFS
  │── Registration: Calls Story Protocol SDK (SPG) to Mint IP
  │
  ▼
Game Compilation
  │── The Final Game is registered as a DERIVATIVE of the Assets
  │── Royalties flow to original Asset Creators
```

## Technology Stack

### Frontend
- **Mini App**: `@farcaster/miniapp-sdk` (November 2025 standard)
- **Web App**: Next.js 16 + TypeScript + TailwindCSS
- **State Management**: React Context + Custom Hooks
- **Styling**: TailwindCSS with custom design system

### Backend
- **API**: Next.js API routes
- **Database**: PostgreSQL + Prisma ORM
- **Game Generation**: Infinity Arcade pipeline + OpenAI
- **Caching**: Redis for frequently accessed data
- **Queuing**: BullMQ for background jobs

### Blockchain
- **Primary Network**: Base mainnet
- **Secondary Network**: Story Protocol testnet
- **Contracts**: 
  - WriterCoinPayment.sol (payments)
  - GameNFT.sol (game NFTs)
  - StoryIPAuthor.sol (IP registration)
- **Wallet**: Farcaster Wallet (built-in) + Browser wallets (MetaMask, etc.)

## Dual-Chain Architecture (Base + Story)

### Current State (Base Chain)
WritArcade's existing system handles:
- **Writer Coins** ($AVC, etc.) - ERC-20 tokens on Base
- **GameNFT Contract** - Minting games as NFTs on Base
- **Revenue Distribution** - On-chain configurable per coin. Current AVC default: Generation 60% writer, 20% platform, 20% creator pool; Minting 30% creator, 15% writer, 5% platform (remainder returned to payer). No on-chain burn.
- **Wallet**: Farcaster (Base chain native)

### Proposed Enhancement (Story Chain)
Story Protocol adds:
- **IP Asset Registry** - Register games as permanent IP assets
- **License Terms** - Set usage permissions (e.g., "allow derivatives, 10% royalty")
- **Royalty Automation** - Revenue flows to parent IP creators forever
- **Derivative Tracking** - Full lineage graph (who used whose work)

### Integration Points
```
┌─────────────────────────────────────────────────────────────┐
│                   WritArcade Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FRONTEND LAYER                                              │
│  ├─ Game Builder UI                                          │
│  ├─ IP Registration Modal                                   │
│  ├─ Royalty Dashboard                                       │
│  └─ Derivative Discovery                                    │
│                                                               │
│  API LAYER (Next.js Routes)                                 │
│  ├─ /api/games/generate        (WritArcade AI)             │
│  ├─ /api/games/[id]/mint       (Base minting)              │
│  ├─ /api/assets/save           (Save Draft)                │
│  ├─ /api/assets/marketplace    (Fetch Community Assets)    │
│  ├─ /api/assets/register       (Mint to Story Protocol)    │
│  ├─ /api/royalties/claim       (Story royalties)           │
│                                                               │
│  SERVICE LAYER                                              │
│  ├─ GameService                                             │
│  ├─ AssetService                                            │
│  ├─ BaseContractService ────┬─────────────────┐            │
│  └─ StoryProtocolService ───┤                 │            │
│                              ▼                 ▼            │
└─────────────────────────────────────────────────────────────┘
                                │                 │
                 ┌──────────────┘                 └──────────────┐
                 │                                               │
            BASE CHAIN                                     STORY CHAIN
         (Chain ID: 8453)                           (Chain ID: 1516 testnet)
                 │                                               │
         ┌───────┴──────────┐                           ┌────────┴──────────┐
         │                  │                           │                   │
    GameNFT          WriterCoin              IPAssetRegistry      Licensing
   Contract          Contracts               (ERC-721)           Module
                                                      │
                                             IP Account (ERC-6551)
                                                      │
                                          ┌──────────┬┴────────────┐
                                          │          │             │
                                      License    Royalty      Dispute
                                      Module     Module       Module
```

## Data Models

### Core Entities
```
User
├─ id (UUID)
├─ farcasterId (string)
├─ walletAddress (string)
└─ createdAt (timestamp)

Game
├─ id (UUID)
├─ userId (foreign key)
├─ articleUrl (string)
├─ title (string)
├─ genre (enum)
├─ difficulty (enum)
├─ gameState (JSON)
├─ nftId (string, optional)
└─ createdAt (timestamp)

WriterCoin
├─ id (UUID)
├─ name (string)
├─ symbol (string)
├─ contractAddress (string)
├─ publicationUrl (string)
└─ createdAt (timestamp)

Asset
├─ id (UUID)
├─ userId (foreign key)
├─ articleUrl (string)
├─ title (string)
├─ assetData (JSON)
├─ storyIpId (string, optional)
└─ createdAt (timestamp)
```

## Payment Flow

1. User selects writer coin ($AVC) and connects wallet
2. User pastes article URL and customizes game style
3. User pays 100 $AVC tokens to generate game
4. AI generates game with 4 unique options
5. User can play immediately or mint as NFT for 50 $AVC
6. Revenue distributed via 0xSplits:
   - 60% → Writer (content collaboration)
   - 20% → Creator pool (ongoing revenue for creators)
   - 20% → Platform (operations)
   - 10% → Platform (development)

## Security Considerations

- All user data is stored encrypted
- Wallet connections use secure protocols
- Smart contracts have been audited
- Rate limiting on API endpoints
- Input validation on all user-submitted data
- Regular security audits and penetration testing

## Scalability Patterns

- Horizontal scaling of API servers
- Database read replicas for heavy queries
- CDN for static assets
- Caching layer for frequently accessed data
- Background job processing for heavy operations
- Load balancing across multiple regions

## Monitoring & Observability

- Application performance monitoring (APM)
- Infrastructure monitoring
- Error tracking and alerting
- Business metrics dashboards
- User behavior analytics
- Smart contract event monitoring