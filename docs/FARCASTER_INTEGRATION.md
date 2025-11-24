# Farcaster Wallet Integration

Complete guide to the Farcaster Wallet integration for handling payments on Base mainnet.

## Overview

The payment flow is fully integrated with Farcaster Wallet's `sendTransaction` method:

1. **Initiate Payment** - Backend prepares payment details and contract info
2. **Get User Address** - Retrieve wallet address from Farcaster context
3. **Encode Transaction** - Build transaction data for WriterCoinPayment contract
4. **Send Transaction** - Farcaster Wallet handles signing and submission
5. **Verify Payment** - Backend confirms transaction on Base network

## Architecture

### Components

#### `/lib/farcasterWallet.ts`
Core wallet integration utilities:
- `sendTransaction()` - Send transactions via Farcaster Wallet SDK
- `encodePayForGameGeneration()` - ABI encoding for game generation payments
- `encodePayForMinting()` - ABI encoding for NFT minting payments
- `getUserWalletAddress()` - Get user's address from Farcaster context
- `isFarcasterWalletAvailable()` - Check if wallet is available

#### `/app/mini-app/components/PaymentButton.tsx`
User-facing payment component:
- Handles entire payment flow
- Shows loading states and errors
- Integrates with Farcaster Wallet

#### `/app/mini-app/api/payments/initiate/route.ts`
Backend API to prepare payments:
- Returns contract address and chain info
- Calculates revenue distribution
- Validates writer coin configuration

#### `/app/mini-app/api/payments/verify/route.ts`
Backend API to verify transactions:
- Queries Base network via viem
- Confirms transaction success
- Validates contract address
- Returns block info and timestamp

## Environment Setup

Add to `.env.local`:

```bash
# Base Network RPC
BASE_RPC_URL="https://mainnet.base.org"

# Smart Contracts (after deployment)
NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x..." # Your deployed contract
NEXT_PUBLIC_GAME_NFT_ADDRESS="0x..." # GameNFT contract address

# Neynar API (for Farcaster profile lookup)
NEXT_PUBLIC_NEYNAR_API_KEY="your-api-key"
NEYNAR_API_KEY="your-api-key"
```

## Payment Flow Details

### 1. Initiate Payment (Frontend → Backend)

```typescript
POST /api/mini-app/payments/initiate
{
  writerCoinId: "avc",
  action: "generate-game" | "mint-nft"
}
```

**Response:**
```json
{
  "writerCoin": {
    "id": "avc",
    "name": "AVC",
    "symbol": "$AVC",
    "address": "0x06FC3D5D2369561e28F261148576520F5e49D6ea",
    "decimals": 18
  },
  "action": "generate-game",
  "amount": "100000000000000000000",
  "amountFormatted": "100.00",
  "distribution": {
    "writerShare": "60000000000000000000",
    "platformShare": "20000000000000000000",
    "creatorShare": "20000000000000000000"
  },
  "contractAddress": "0x...",
  "chainId": 8453
}
```

### 2. Get User Address (Frontend)

```typescript
const userAddress = await getUserWalletAddress()
// Returns: "0x1234567890123456789012345678901234567890"
```

### 3. Encode Transaction Data (Frontend)

For game generation:
```typescript
const data = encodePayForGameGeneration(
  "0x...", // contract address
  "0x06FC3D5D2369561e28F261148576520F5e49D6ea", // token address
  "0x1234..." // user address
)
// Returns: "0x7c4f5c5b" + encoded params
```

For NFT minting:
```typescript
const data = encodePayForMinting(
  "0x...", // contract address
  "0x06FC3D5D2369561e28F261148576520F5e49D6ea", // token address
  "0x1234..." // user address
)
// Returns: "0xd0e521c0" + encoded params
```

### 4. Send Transaction (Frontend)

```typescript
const result = await sendTransaction({
  to: "0x...", // WriterCoinPayment contract
  data: "0x7c4f5c5b...", // encoded function call
})

if (result.success) {
  console.log("Transaction hash:", result.transactionHash)
}
```

**Farcaster Wallet handles:**
- Showing approval dialog to user
- Signing transaction with user's key
- Submitting to Base network
- Returning transaction hash

### 5. Verify Payment (Frontend → Backend)

```typescript
POST /api/mini-app/payments/verify
{
  "transactionHash": "0x...",
  "writerCoinId": "avc",
  "action": "generate-game"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "message": "Payment for generate-game verified",
  "blockNumber": "18950000",
  "gasUsed": "85000",
  "timestamp": "1700000000",
  "blockHash": "0x..."
}
```

## Smart Contract Requirements

### WriterCoinPayment Contract

Must have these functions:
- `payForGameGeneration(address writerCoin, address user)` - Function selector: `0x7c4f5c5b`
- `payForMinting(address writerCoin, address user)` - Function selector: `0xd0e521c0`
- `whitelistCoin()` - Configure writer coins
- `updateCoinConfig()` - Update costs

### GameNFT Contract

Must have:
- `mintGame(address to, string memory tokenURI, GameMetadata memory metadata)` - Called by WriterCoinPayment

## Testing

### Local Testing with Mock Wallet

1. Update `farcasterWallet.ts` to use a test implementation
2. Mock transaction hash in tests
3. Verify backend validation works

### Testnet Testing

1. Deploy contracts to Base Sepolia
2. Update env vars to point to testnet
3. Use Farcaster testnet context
4. Test with real wallet signatures

### Mainnet Deployment

1. Deploy WriterCoinPayment contract to Base mainnet
2. Deploy GameNFT contract to Base mainnet
3. Whitelist writer coins in WriterCoinPayment
4. Update `.env.local` with contract addresses
5. Test with small amounts first

## Error Handling

The payment flow handles several error scenarios:

- **Wallet not available**: "Farcaster Wallet is not available in this context"
- **No wallet address**: "Failed to get wallet address from Farcaster"
- **Payment initiation failed**: Backend validation or config error
- **Transaction failed**: User rejected or network issue
- **Transaction not found**: Hash not on chain (wait and retry)
- **Wrong contract**: Transaction called different address
- **Verification failed**: Backend RPC error or network issue

## Revenue Distribution

### Game Generation (100 tokens)
- 60% → Writer treasury (Fred Wilson's wallet)
- 20% → Platform treasury (WritArcade)
- 20% → Creator pool (community rewards)

### NFT Minting (50 tokens)
- 30% → Creator pool
- 15% → Writer treasury
- 5% → Platform treasury
- 50% → User (returned to user)

These percentages are configurable via `updateCoinConfig()`.

## Future Enhancements

1. **Batch payments** - Process multiple payments in one transaction
2. **Approve + Transfer pattern** - Add ERC20 approval step if needed
3. **Payment retry logic** - Automatic retry on failure
4. **Webhook notifications** - Server-side payment tracking
5. **Escrow contracts** - Hold funds until game is generated
6. **Revenue claims** - Treasury owners claim their shares
