# Mainnet Deployment Checklist

Complete checklist for deploying WritArcade payment system to Base mainnet.

## Smart Contract Deployment

- [ ] **GameNFT Contract**
  - [ ] Use Remix to deploy `contracts/GameNFT.sol`
  - [ ] Set constructor parameters (if any - currently none)
  - [ ] Verify contract on Basescan
  - [ ] Save contract address to `.env.local` as `NEXT_PUBLIC_GAME_NFT_ADDRESS`

- [ ] **WriterCoinPayment Contract**
  - [ ] Use Remix to deploy `contracts/WriterCoinPayment.sol`
  - [ ] Set constructor parameters:
    - `_platformTreasury`: Your WritArcade treasury address
    - `_creatorPool`: Community pool address
  - [ ] Verify contract on Basescan
  - [ ] Save contract address to `.env.local` as `NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS`

## Contract Configuration

- [ ] **Whitelist AVC Writer Coin**
  ```solidity
  whitelistCoin(
    "0x06FC3D5D2369561e28F261148576520F5e49D6ea", // AVC address on Base
    100000000000000000000, // 100 $AVC for game generation
    50000000000000000000,  // 50 $AVC for minting
    "0x...", // Fred Wilson's treasury
    6000, // 60% to writer
    2000, // 20% to platform
    2000  // 20% to creator pool
  )
  ```
  - [ ] Call via Remix with contract owner account
  - [ ] Verify whitelisting succeeded

- [ ] **Add More Writer Coins (Optional)**
  - [ ] Repeat whitelist process for each new coin
  - [ ] Update `lib/writerCoins.ts` with new coin configurations

## Environment Variables

- [ ] Create `.env.local` with:
  ```bash
  BASE_RPC_URL="https://mainnet.base.org"
  NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS="0x..."
  NEXT_PUBLIC_GAME_NFT_ADDRESS="0x..."
  NEXT_PUBLIC_NEYNAR_API_KEY="your-key"
  NEYNAR_API_KEY="your-key"
  ```

## Testing

- [ ] **Manual Payment Flow Testing**
  - [ ] Test game generation payment with small amount (1-5 $AVC)
  - [ ] Verify transaction appears in Basescan
  - [ ] Verify backend verification endpoint works
  - [ ] Check revenue distribution to treasuries

- [ ] **Error Handling**
  - [ ] Test wallet rejection
  - [ ] Test insufficient balance
  - [ ] Test invalid contract address
  - [ ] Test wrong network

- [ ] **Backend Verification**
  - [ ] Verify transaction lookup works on Base
  - [ ] Verify contract address validation
  - [ ] Check block info retrieval
  - [ ] Test RPC error handling

## Security Review

- [ ] **Contract Review**
  - [ ] ReentrancyGuard is active
  - [ ] Owner-only functions have proper access control
  - [ ] No hardcoded addresses (all configurable)
  - [ ] Token transfers handle return values

- [ ] **Frontend Review**
  - [ ] No private keys exposed
  - [ ] All contract addresses use environment variables
  - [ ] Proper error handling and user feedback
  - [ ] Transaction hash verification implemented

- [ ] **API Review**
  - [ ] Verify endpoint validates all inputs
  - [ ] Check RPC timeout handling
  - [ ] Test rate limiting (if needed)
  - [ ] Verify server-side validation

## Monitoring

- [ ] Set up Basescan alerts for contract events
- [ ] Monitor transaction success/failure rates
- [ ] Track revenue distribution
- [ ] Watch for failed transactions

## Go-Live

- [ ] Final security review with team
- [ ] Deploy with monitoring active
- [ ] Have rollback plan ready
- [ ] Monitor first 24 hours closely
- [ ] Be ready to pause payments if issues arise

## Post-Launch

- [ ] Collect metrics on payment success rate
- [ ] Monitor gas usage and optimize if needed
- [ ] Plan revenue distribution claims
- [ ] Gather user feedback
- [ ] Plan next writer coins to add

## Updating Costs

After deployment, costs can be updated using `updateCoinConfig()`:

```solidity
updateCoinConfig(
  "0x06FC3D5D2369561e28F261148576520F5e49D6ea", // token address
  150000000000000000000, // new generation cost
  75000000000000000000   // new mint cost
)
```

This allows adjusting economics without redeploying contracts.
