# Phase 5b: Testing & Launch Prep

**Status:** Ready for execution  
**Timeline:** 1 week (1-2h migrations + 4-6h testing)  
**Owner:** WritArcade team  
**Target:** EOW go/no-go decision

---

## 1. Database Migrations

### Prerequisites
- PostgreSQL running on `localhost:5432`
- `.env` configured with valid `DATABASE_URL`
- No active connections to database (stop dev server)

### Execute Migrations

```bash
# 1. Stop dev server if running
npm run kill:dev

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify schema updated
npx prisma studio
# Check: 
# - New "payments" table created
# - Game model has nftTokenId, nftTransactionHash, nftMintedAt, paymentId fields
```

### Migration Contents

**New Payment Model:**
```prisma
model Payment {
  id               String   @id @default(cuid())
  transactionHash  String   @unique
  action           String   // 'generate-game' | 'mint-nft'
  amount           BigInt
  status           String   @default("pending")  // 'pending' | 'verified' | 'failed'
  userId           String?
  user             User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  writerCoinId     String
  games            Game[]
  createdAt        DateTime @default(now())
  verifiedAt       DateTime?
}
```

**Game Model Updates:**
```prisma
nftTokenId         String?       // ERC-721 token ID
nftTransactionHash String?       // Mint tx hash
nftMintedAt        DateTime?     // Timestamp
paymentId          String?       // Link to Payment
payment            Payment?      @relation(...)
```

### Rollback (if needed)
```bash
npx prisma migrate resolve --rolled-back add_payment_and_nft_tracking
```

---

## 2. Testing Checklist

### A. Web App - Free Flow

**Setup:**
```bash
npm run dev
# Navigate: http://localhost:3000/
```

**Test Case 1: Generate Game (No Customization)**
- [ ] Open web app
- [ ] Paste article URL or use demo text
- [ ] Click "Generate Game"
- [ ] Game generates successfully
- [ ] No wallet prompt appears
- [ ] Game can be played
- Database check:
  - [ ] New Game record created with `genre`, `subgenre`
  - [ ] `paymentId` is NULL
  - [ ] `writerCoinId` is NULL
  - [ ] `createdAt` is current time

**Test Case 2: Wallet Not Connected (Customization Hidden)**
- [ ] Open web app
- [ ] Verify "Customize Game" toggle is NOT visible (or disabled)
- [ ] Wallet not connected in header
- [ ] Generate free game

**Test Case 3: Free Flow Error Handling**
- [ ] Paste invalid URL → error message appears
- [ ] Empty prompt → error or default behavior
- [ ] Network timeout → graceful error
- [ ] API failure → user sees error message

---

### B. Web App - Paid Flow (Wallet Connected)

**Setup:**
```bash
# MetaMask/WalletConnect needed
# Base network configured in wallet
# Test account has ETH for gas
```

**Test Case 4: MetaMask Connection**
- [ ] Click "Connect Wallet" in header
- [ ] MetaMask popup appears
- [ ] Select account and approve
- [ ] Header shows connected address
- [ ] "Customize Game" toggle now appears

**Test Case 5: Generate Game with Customization**
- [ ] Toggle "Customize Game"
- [ ] Select genre (Horror/Comedy/Mystery)
- [ ] Select difficulty (Easy/Hard)
- [ ] Cost preview shows (100 AVC equivalent)
- [ ] Click "Generate Game for X tokens"
- [ ] MetaMask approval popup appears
- [ ] Approve transaction
- [ ] Game generates with selected constraints
- Database check:
  - [ ] New Game record with `genre`, `difficulty`, `writerCoinId`
  - [ ] `paymentId` links to Payment record
  - [ ] Payment record has `status: 'verified'`
  - [ ] Payment has `transactionHash`, `action: 'generate-game'`, `amount`

**Test Case 6: Game Minting (if implemented)**
- [ ] After game generation, look for "Mint NFT" button
- [ ] Click "Mint NFT"
- [ ] Payment approval (50 AVC equivalent)
- [ ] Transaction submitted
- [ ] Wait for confirmation
- Database check:
  - [ ] Game record updated: `nftTokenId`, `nftTransactionHash`, `nftMintedAt`
  - [ ] New Payment record with `action: 'mint-nft'`

**Test Case 7: Payment Error Handling**
- [ ] Insufficient balance → wallet rejects, clear error
- [ ] User rejects approval → graceful error
- [ ] Network error → transaction pending, error shown
- [ ] Transaction fails → status = 'failed' in DB

---

### C. Mini-App - Full Flow

**Setup:**
```bash
# Need Farcaster context (or use WarpCast dev mode)
# Navigate: http://localhost:3000/mini-app
# Or deploy to Vercel for real testing
```

**Test Case 8: Writer Coin Selection**
- [ ] Mini-app loads
- [ ] Step 1: WriterCoinSelector shows
- [ ] Select "AVC" from dropdown
- [ ] Shows "Fred Wilson's AVC"
- [ ] Click Next
- Database check:
  - [ ] No records yet (just UI)

**Test Case 9: Article URL Input**
- [ ] Step 2: ArticleInput component shows
- [ ] Paste valid AVC article URL: `https://avc.xyz/...`
- [ ] Article fetches and previews
- [ ] Preview shows title + excerpt
- [ ] Click Next
- Database check:
  - [ ] No records yet (validation stage)

**Test Case 10: Game Customization**
- [ ] Step 3: GameCustomizer shows
- [ ] Select genre (Horror/Comedy/Mystery)
- [ ] Select difficulty (Easy/Hard)
- [ ] Cost preview shows (100 AVC)
- [ ] Revenue distribution visible:
  - Writer: 60 AVC
  - Platform: 20 AVC
  - Creator: 20 AVC
- [ ] Click "Generate Game"
- Database check:
  - [ ] Payment record created with `status: 'pending'`
  - [ ] Status changes to `'verified'` after approval

**Test Case 11: Payment & Generation**
- [ ] Farcaster Wallet approval popup (if in real environment)
- [ ] Approve spending
- [ ] Game generates
- [ ] Step 4: GamePlayer shows with playable game
- Database check:
  - [ ] Game record created with all customization
  - [ ] `paymentId` links to Payment
  - [ ] `articleUrl`, `writerCoinId`, `difficulty` all set
  - [ ] Payment status = `'verified'`

**Test Case 12: Play & Mint**
- [ ] Play game successfully
- [ ] "Mint as NFT" button appears
- [ ] Click button → payment approval (50 AVC)
- [ ] Approve
- [ ] Wait for mint confirmation
- [ ] Toast message "NFT minted!"
- Database check:
  - [ ] Game record: `nftTokenId`, `nftTransactionHash` populated
  - [ ] `nftMintedAt` is current time
  - [ ] New Payment record for mint with `action: 'mint-nft'`

**Test Case 13: Mini-App Error Handling**
- [ ] Invalid article URL → error message
- [ ] Insufficient wallet balance → clear error
- [ ] User rejects payment → handled gracefully
- [ ] Network timeout → pending state, can retry

---

### D. Cross-Platform Validation

**Test Case 14: Cost Parity**
- [ ] Web app + Mini-app use same article
- [ ] Both show same cost (100 tokens for generation)
- [ ] Both show same revenue split
- [ ] Code check:
  - [ ] Both call same `/api/payments/initiate` endpoint
  - [ ] Both use `PaymentCostService.calculateCost()`
  - [ ] No duplication in cost logic

**Test Case 15: Payment Logic Unification**
- [ ] Both platforms use `/api/payments/verify`
- [ ] Both use `/api/games/generate`
- [ ] Both use same wallet detection
- [ ] Code check:
  - [ ] No mini-app specific endpoints
  - [ ] Shared payment domain used everywhere
  - [ ] Wallet abstraction layer functional

**Test Case 16: Database Consistency**
- [ ] Same article generated on web + mini-app
- [ ] Both create Game records
- [ ] Both link to Payment records
- [ ] Both calculate costs identically
- Database queries:
  ```sql
  -- Check all payments
  SELECT * FROM payments ORDER BY createdAt DESC LIMIT 10;
  
  -- Check game-payment links
  SELECT g.id, g.title, g.writerCoinId, g.difficulty, p.transactionHash, p.amount
  FROM games g
  LEFT JOIN payments p ON g.paymentId = p.id
  WHERE g.paymentId IS NOT NULL;
  
  -- Check NFT tracking
  SELECT g.id, g.title, g.nftTokenId, g.nftMintedAt
  FROM games g
  WHERE g.nftTokenId IS NOT NULL;
  ```

---

## 3. Database Verification

Run these SQL queries in Prisma Studio:

```sql
-- 1. Verify Payment table structure
\d payments

-- 2. Check recent payments
SELECT id, action, amount, status, createdAt, verifiedAt FROM payments ORDER BY createdAt DESC LIMIT 5;

-- 3. Check game-payment relationships
SELECT 
  g.id, g.title, g.writerCoinId, 
  p.id, p.action, p.status, p.amount
FROM games g
LEFT JOIN payments p ON g.paymentId = p.id
LIMIT 10;

-- 4. Check NFT minting tracking
SELECT id, title, nftTokenId, nftTransactionHash, nftMintedAt FROM games WHERE nftTokenId IS NOT NULL;
```

---

## 4. Success Criteria - MVP Ready

**✅ Database:**
- [ ] Migrations applied successfully
- [ ] Payment table created
- [ ] Game table updated with NFT + payment fields
- [ ] All foreign keys correct
- [ ] No data loss

**✅ Web App:**
- [ ] Free flow: Generate without wallet
- [ ] Paid flow: Generate with MetaMask + customization
- [ ] Cost parity: Same price as mini-app
- [ ] Wallet detection: Works in browser
- [ ] Payment tracking: Creates Payment records

**✅ Mini-App:**
- [ ] Article selection works
- [ ] Customization (genre/difficulty) works
- [ ] Payment flow complete
- [ ] Game generation succeeds
- [ ] NFT minting works

**✅ Cross-Platform:**
- [ ] Same endpoint for both (`/api/games/generate`)
- [ ] Same payment logic (no duplication)
- [ ] Cost calculation identical
- [ ] Database records linked properly

**✅ Error Handling:**
- [ ] Invalid URLs handled gracefully
- [ ] Payment rejections show user-friendly errors
- [ ] Network timeouts don't crash app
- [ ] Transaction failures tracked in DB

**✅ Code Quality:**
- [ ] No duplicate payment logic
- [ ] Unified wallet abstraction used
- [ ] Shared components (GenreSelector, etc.) functional
- [ ] All 8 core principles maintained

---

## 5. Go/No-Go Decision Criteria

### GO Conditions (All ✅)
- Database migrations successful
- All 16 test cases pass (both platforms)
- No critical bugs found
- Payment costs identical across platforms
- Error handling robust
- Performance acceptable (<2s generation time)

### NO-GO Conditions (Any ❌)
- Migration fails or data corrupted
- Either platform fails core flow
- Payment logic differs between platforms
- Critical bugs in error handling
- Generation time >5 seconds
- Database integrity issues

### Decision Timeline
- **Monday**: Run migrations + basic tests
- **Tuesday-Wednesday**: Complete all test cases
- **Thursday**: Final cross-platform validation
- **Friday EOD**: Go/no-go call

---

## 6. Deployment Checklist

**Pre-Launch:**
- [ ] All migrations applied to production DB
- [ ] Environment variables set correctly
- [ ] Smart contract addresses verified on Base mainnet
- [ ] Payment service configured
- [ ] Monitoring/logging enabled

**Launch:**
- [ ] Feature flag enabled for new payment system
- [ ] Old endpoints deprecated (keep as fallback)
- [ ] User communication sent
- [ ] Team on-call for issues

**Post-Launch (First 24h):**
- [ ] Monitor error rates
- [ ] Check payment success rates
- [ ] Verify database growth
- [ ] Gather user feedback

---

## References

**Database:**
- Prisma Docs: https://www.prisma.io/docs/
- PostgreSQL: https://www.postgresql.org/docs/

**Payment Tracking:**
- docs/ROADMAP.md (Week 5b section)
- docs/FEATURE_PARITY_IMPLEMENTATION.md
- lib/domains/payments/

**Testing:**
- Web: http://localhost:3000/
- Mini-app: http://localhost:3000/mini-app
- DB: `npm run db:studio`
