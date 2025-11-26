# Story Protocol Integration Setup Guide

This document explains how to properly integrate and use Story Protocol v1.4.2+ with WritArcade.

## Status

**Current:** Framework and skeleton code ready for full SDK integration
**SDK Version:** @story-protocol/core-sdk@^1.4.0
**Last Updated:** November 26, 2025

## Overview

Story Protocol is the world's first blockchain designed for intellectual property (IP). WritArcade uses Story Protocol to:

- **Register games as IP Assets** - Each game becomes an immutable, on-chain intellectual property asset
- **Attach License Terms** - Define how others can create derivatives of games
- **Manage Royalties** - Configure revenue sharing between authors, creators, and the platform
- **Track Derivatives** - Enable game creators to build on top of other games with automatic royalty distribution

## Architecture

Story Protocol SDK v1.4.0+ provides these key modules:

- **IPAsset Module** - Register and manage IP assets on-chain
- **License Module** - Create license terms and mint license tokens
- **Royalty Module** - Claim royalties and manage payment distributions
- **Dispute Module** - Handle IP disputes through on-chain governance

## Environment Configuration

### Required Environment Variables

Add these to your `.env.local` or deployment environment:

```env
# Story Protocol RPC endpoint (testnet: Aeneid)
STORY_RPC_URL=https://aeneid.storyrpc.io

# Private key for Story transactions (wallet with some $IP tokens for gas)
STORY_WALLET_KEY=0x...  # 64 hex chars, no 0x prefix preferred

# Optional: Custom SPG NFT contract (defaults to public collection on testnet)
NEXT_PUBLIC_STORY_SPG_CONTRACT=0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc
```

### Getting Testnet Tokens

1. Go to [Story Faucet](https://faucet.story.foundation/)
2. Fund your wallet with testnet tokens
3. Use that wallet's private key for `STORY_WALLET_KEY`

## API Reference

### Core Functions

#### `registerGameAsIP(input: IPRegistrationInput): Promise<IPRegistrationResult>`

Registers a game as an IP Asset on Story Protocol.

**Input:**
```typescript
interface IPRegistrationInput {
  title: string;                    // Game title
  description: string;              // Game description
  articleUrl: string;               // Original article URL
  gameCreatorAddress: Address;      // Game creator's wallet
  authorParagraphUsername: string;  // e.g. "fredwilson"
  authorWalletAddress: Address;     // Original author's wallet
  genre: "horror" | "comedy" | "mystery";
  difficulty: "easy" | "hard";
  gameMetadataUri: string;          // IPFS URI to game metadata
  nftMetadataUri: string;           // IPFS URI to NFT metadata
}
```

**Response:**
```typescript
interface IPRegistrationResult {
  storyIPAssetId: string;           // Unique IP Asset ID
  ipId: string;                     // Same as storyIPAssetId
  txHash: string;                   // Transaction hash
  registeredAt: number;             // Unix timestamp
  licenseTermsIds: string[];        // Attached license term IDs
}
```

**License Terms Attached:**
- Commercial Remix: 20% revenue share to creators
- Transferable: Can be traded/sold
- Derivatives Allowed: Others can build on this game

#### `attachLicenseTermsToIP(ipId: string, licenseTermsId: string | number)`

Attach additional license options to an existing IP Asset.

#### `mintLicenseTokens(licensorIpId: string, licenseTermsId: string | number, receiver: Address, amount?: number)`

Mint license tokens for an IP. Others use these to create derivatives.

#### `registerDerivativeIP(parentIpId: string, licenseTokenId: string | number, title: string, description: string)`

Register a new game as a derivative of an existing IP Asset.

**Behavior:**
- Inherits parent's license terms (immutable)
- Creator must have minted a license token from parent
- Revenue automatically flows to parent based on license terms

#### `claimRoyalties(ancestorIpId: string, claimer: Address, childIpIds: string[], ...)`

Claim accumulated royalties from derivative IPs.

**Returns:**
- Transaction hash
- Claimed amounts distributed to wallet

#### `getClaimableRevenue(royaltyVaultIpId: string, claimer: Address, token: Address)`

Query how much revenue is available to claim for an IP.

## Network Information

### Aeneid Testnet (Development)

- **Chain ID:** 1315
- **RPC:** https://aeneid.storyrpc.io
- **Explorer:** https://aeneid-testnet-explorer.story.foundation/
- **Faucet:** https://faucet.story.foundation/

### Story Mainnet (Production)

- **Chain ID:** 1513
- **RPC:** https://story-rpc.xyz (or other providers)
- **Explorer:** https://www.storyscan.io/
- **Status:** Live as of 2024

## Default Contract Addresses

### Aeneid Testnet

```typescript
// Public SPG NFT Collection (use this for testing)
SPG_NFT_CONTRACT = "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc"

// $IP Token (native Story token)
IP_TOKEN = "0x1514000000000000000000000000000000000000"

// $WIP Token (wrapped IP for DeFi)
WIP_TOKEN = "0x1514000000000000000000000000000000000000"

// RoyaltyPolicyLAP (Linear Amount Per)
ROYALTY_POLICY = "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E"
```

## Story Protocol Flow in WritArcade

```
1. Article → Game Generation
   └─> Create game metadata (IPFS)

2. IP Registration
   └─> registerGameAsIP()
   └─> Story creates IP Asset
   └─> Attach commercial remix license
   └─> Game becomes tradeable on Story

3. Derivative Creation
   └─> User creates game based on another game
   └─> mintLicenseTokens() from parent
   └─> registerDerivativeIP() with license token
   └─> Royalty stream established

4. Royalty Distribution
   └─> When derivative game sold/traded
   └─> Platform splits revenue:
       ├─> 20% to parent IP creator
       ├─> 60% to original article author
       ├─> 20% to game creator
   └─> claimRoyalties() to withdraw

5. Revenue Claiming
   └─> getClaimableRevenue() to check balance
   └─> claimAllRevenue() to transfer to wallet
```

## License Term Breakdown

### Default: Commercial Remix

Used when registering new games. Allows:

- ✅ Commercial Use
- ✅ Derivatives Allowed
- ✅ Revenue Sharing (20% to parent)
- ❌ Derivative Reciprocal (derivatives don't force same terms on their derivatives)
- ⏱️ No Expiration

```typescript
{
  transferable: true,
  royaltyPolicy: RoyaltyPolicyLAP,
  defaultMintingFee: "0",           // Free to mint license
  expiration: 0,                    // Never expires
  commercialUse: true,
  commercialRevShare: 20,           // 20% to parent
  derivativesAllowed: true,
  derivativesReciprocal: false,     // Children not forced to share same way
  currency: WIP_TOKEN_ADDRESS,
}
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `STORY_RPC_URL not configured` | Missing env var | Add to `.env.local` |
| `STORY_WALLET_KEY not configured` | Missing env var | Add to `.env.local` |
| `IP registration failed` | Network issue or insufficient funds | Check faucet, wait for confirmations |
| `License terms already attached` | Trying to attach duplicate terms | Use different license terms ID |
| `Invalid metadata hash` | Corrupted metadata | Regenerate IPFS URI |

### Debugging

Enable verbose logging:

```typescript
// In story-protocol.service.ts
const client = initializeStoryClient();
console.log("Story Client initialized for chain:", chainId);

// Log transaction details
console.log("IP Registration result:", {
  ipId: response.ipId,
  txHash: response.txHash,
  licenseTermsIds: response.licenseTermsIds,
});
```

## IPFS Metadata Standards

### IP Metadata Format

```json
{
  "title": "Game Title",
  "description": "Game description",
  "createdAt": "1740005219",
  "creators": [
    {
      "name": "Author Name",
      "address": "0x...",
      "contributionPercent": 100
    }
  ],
  "attributes": [
    {
      "key": "articleUrl",
      "value": "https://..."
    }
  ]
}
```

### NFT Metadata Format (ERC-721 Standard)

```json
{
  "name": "Game Title",
  "description": "This NFT represents ownership of the IP Asset",
  "image": "https://...",
  "animation_url": "https://...",
  "attributes": [
    {
      "key": "genre",
      "value": "horror"
    }
  ]
}
```

## Testing

### Local Testing

1. **Fund testnet wallet:**
   ```bash
   # Get tokens from faucet
   curl https://faucet.story.foundation/api/faucet -X POST \
     -H "Content-Type: application/json" \
     -d '{"address": "0x..."}'
   ```

2. **Test registration:**
   ```bash
   curl http://localhost:3000/api/ip/register -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "gameId": "game-1",
       "title": "Test Game",
       "description": "Test description",
       "articleUrl": "https://example.com",
       "gameCreatorAddress": "0x...",
       "authorParagraphUsername": "testauthor",
       "authorWalletAddress": "0x...",
       "genre": "horror",
       "difficulty": "easy",
       "gameMetadataUri": "ipfs://Qm...",
       "nftMetadataUri": "ipfs://Qm..."
     }'
   ```

3. **Check transaction:**
   - Visit [Aeneid Explorer](https://aeneid-testnet-explorer.story.foundation/)
   - Search for transaction hash
   - Verify IP Asset creation

## Best Practices

1. **Metadata Hashing:**
   - Always compute SHA256 hash of metadata
   - Use `createHash('sha256')` from Node.js crypto module

2. **IPFS Uploads:**
   - Use Pinata, Web3.Storage, or similar
   - Ensure metadata is accessible for verification

3. **Gas Management:**
   - Keep some testnet tokens for transaction fees
   - Monitor gas usage in testnet explorer

4. **License Terms:**
   - Use commercial remix for most games
   - Consider non-commercial for educational content

5. **Error Recovery:**
   - Store IP Asset IDs in database after registration
   - Implement retry logic for failed transactions
   - Monitor transaction status with waitForTransaction

## Implementation Status & Next Steps

### Current Implementation (Skeleton)

The Story Protocol service (`lib/story-protocol.service.ts`) provides:
- ✅ Type definitions and interfaces
- ✅ Function signatures for all core operations
- ✅ Environment configuration structure
- ✅ Error handling framework
- 🔄 Placeholder implementations (need SDK API calls)

### TODO: Full SDK Integration

1. **Update `registerGameAsIP()` in `lib/story-protocol.service.ts`:**
   ```typescript
   // TODO: Replace placeholder with actual SDK call
   // 1. Initialize StoryClient
   // 2. Generate IP metadata using client.ipAsset.generateIpMetadata()
   // 3. Hash metadata and compute verification hashes
   // 4. Call client.ipAsset.registerIpAsset()
   // 5. Extract ipId and licenseTermsIds from response
   ```

2. **Create Prisma Schema for Story IP Assets:**
   ```prisma
   model StoryIPAsset {
     id String @id @default(cuid())
     ipId String @unique
     gameId String
     game Game @relation(fields: [gameId], references: [id])
     txHash String
     registeredAt DateTime @default(now())
     licenseTermsIds Json // Array of license term IDs
     status String @default("pending") // pending, confirmed, failed
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

3. **Update API Route:**
   - Uncomment database storage logic in `app/api/ip/register/route.ts`
   - Add transaction status tracking
   - Implement polling for transaction confirmation

4. **Add License Term Management:**
   - Implement `attachLicenseTermsToIP()`
   - Support attaching multiple license options to an IP
   - Manage license term IDs returned from registration

5. **Implement Derivative Registration:**
   - User flow: Game creator mints license token → registers derivative
   - Track parent-child relationships in database
   - Verify license token before allowing derivative registration

6. **Add Royalty Tracking:**
   - Monitor claimable revenue for IP owners
   - Display in creator dashboard
   - Implement claiming mechanism

7. **Error Handling Improvements:**
   - Specific handling for "license terms already attached"
   - Transaction retry logic
   - Wallet funding checks before registration

## Resources

- **Story Protocol Docs:** https://docs.story.foundation/
- **SDK Reference:** https://docs.story.foundation/sdk-reference/overview
- **TypeScript Tutorial:** https://github.com/storyprotocol/typescript-tutorial
- **Deployed Contracts:** https://docs.story.foundation/developers/deployed-smart-contracts
- **Network Info:** https://docs.story.foundation/network/network-info/aeneid
- **Registration Example:** https://github.com/storyprotocol/typescript-tutorial/blob/main/scripts/registration/register.ts
- **Royalty Example:** https://github.com/storyprotocol/typescript-tutorial/blob/main/scripts/royalty/

## Troubleshooting

### Transaction takes too long
- Testnet can be slow during high traffic
- Check gas price on explorer
- Wait up to 2-3 minutes for confirmation

### License terms already attached
- Check if you're trying to attach the same license terms twice
- Use different `licenseTermsId` or skip if already attached

### Insufficient balance
- Visit faucet again
- Check balance on explorer

### IP Asset not found
- Verify correct `ipId` format
- Wait for blockchain confirmation
- Check on Story Explorer

---

**Last Updated:** November 2025
**SDK Version:** @story-protocol/core-sdk@^1.4.0
