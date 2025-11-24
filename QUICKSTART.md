# WritArcade Quick Start

**Current Status**: Phase 2 (85%) - Game generation API & UI complete

**You are here**: Week 3 Testing Phase

---

## 🚀 Start Here

### 1. Local Setup
```bash
cd /Users/udingethe/Dev/WritArcade

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev

# Opens: http://localhost:3000/mini-app
```

### 2. Understand Current State
```bash
# Read these in order:
cat docs/STATUS.md          # Current progress (70%)
cat docs/WEEK3_PLAN.md      # What you're building next
cat docs/ROADMAP.md         # Full 5-week vision
```

### 3. Week 3 Complete
**What's done**:
- ✅ API endpoint: `app/mini-app/api/games/generate/route.ts`
- ✅ GameCustomizer: Genre (Horror/Comedy/Mystery) + Difficulty (Easy/Hard)
- ✅ GamePlayer component: Interactive gameplay with streaming UI
- ✅ Main flow: 4-step progression (coin → article → customize → play)
- ✅ Database schema: Added articleUrl, writerCoinId, difficulty fields

**Current task**: Test all 6 combinations + verify error handling

---

## 📁 Key Files

### Configuration
```
lib/writerCoins.ts          Writer coin whitelist (AVC, etc.)
lib/farcaster.ts            Mini App SDK integration
lib/paragraph.ts            Article fetching
```

### UI Components
```
app/mini-app/page.tsx                          ✅ Main flow (4 steps)
app/mini-app/components/WriterCoinSelector.tsx ✅ User picks coin
app/mini-app/components/ArticleInput.tsx       ✅ User pastes URL
app/mini-app/components/GameCustomizer.tsx     ✅ User picks genre/difficulty
app/mini-app/components/GamePlayer.tsx         ✅ DONE (Week 3)
```

### API Endpoints
```
app/mini-app/api/games/generate/route.ts      ✅ DONE (Week 3) - Writer coin validation
app/mini-app/api/games/mint/route.ts          ⏳ CREATE THIS (Week 5)
```

### Smart Contracts (To Create)
```
contracts/WriterCoinPayment.sol                ⏳ CREATE THIS (Week 4)
contracts/GameNFT.sol                          ⏳ CREATE THIS (Week 4)
```

---

## 🎯 Week 3 Progress

**Completed**:
- [x] Create `app/mini-app/api/games/generate/route.ts`
- [x] Connect to GameAIService for generation
- [x] Create `app/mini-app/components/GamePlayer.tsx`
- [x] Add `play-game` step to main flow
- [x] Update database schema for games (articleUrl, writerCoinId, difficulty)
- [x] Handle errors gracefully

**Remaining**:
- [ ] Test all 6 genre/difficulty combos
- [ ] Database migration (pending DB access)
- [ ] Deploy to staging

**Effort spent**: ~5 hours | **Remaining**: ~3-5 hours

---

## 🔑 Critical Implementation Notes

### 1. The `ready()` Call
```typescript
// MUST call this when Mini App loads
await readyMiniApp()

// Without it: infinite splash screen
// Status: Already done in app/mini-app/page.tsx ✅
```

### 2. Writer Coin Whitelist
```typescript
// Defined in lib/writerCoins.ts
// Currently: AVC by Fred Wilson only
// Game cost: 100 AVC
// Mint cost: 50 AVC
```

### 3. Revenue Split
```
Game generation (user pays 100 AVC):
├─ 60 AVC → Fred Wilson's treasury
├─ 20 AVC → WritArcade platform
└─ 20 AVC → Creator pool

Only implement Week 4+ (payment integration)
```

---

## 📚 Documentation Map

```
README.md                          Project overview
├── docs/STATUS.md                Live progress (start here)
├── docs/WEEK3_PLAN.md            What to build next (start here)
├── docs/ROADMAP.md               Full 5-week plan
├── docs/NEXT_STEPS.md            Detailed technical tasks
├── docs/ARCHITECTURE.md          System design
├── docs/IMPLEMENTATION.md        Setup guide
└── MINI_APP_MIGRATION.md         SDK upgrade notes

QUICKSTART.md (this file)          Quick reference
```

---

## 🧪 Testing the Current Setup

### Test Writer Coin Selection
1. Open http://localhost:3000/mini-app
2. Select "AVC" from dropdown
3. Should show "Fred Wilson's AVC"

### Test Article Input
1. Click next step
2. Paste valid AVC article: `https://avc.xyz/blog/...`
3. Should fetch and preview content

### Test Game Customizer
1. Click next step
2. Select genre (Horror/Comedy/Mystery)
3. Select difficulty (Easy/Hard)
4. See cost preview (100 AVC)

### Test Error Handling
1. Paste invalid URL
2. Should show error message
3. Try again with valid URL

---

## 🛠️ Development Tools

### Check Types
```bash
npm run type-check
```

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
git push origin main
# Auto-deploys to Vercel
```

### View Database
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

---

## 🚨 Common Issues & Fixes

### "splash screen shows forever"
- **Cause**: `readyMiniApp()` not called
- **Fix**: Check `app/mini-app/page.tsx` has `await readyMiniApp()`
- **Status**: ✅ Already fixed

### "article preview not showing"
- **Cause**: Paragraph API fetch failed
- **Fix**: Check URL format, verify author matches writer coin
- **Status**: Test with valid AVC article

### "Mini App not loading in Farcaster"
- **Cause**: Manifest signature invalid
- **Fix**: Placeholder works for MVP. Sign for production.
- **Status**: ✅ Placeholder in place

### "TypeScript errors on build"
- **Cause**: SDK type mismatch
- **Fix**: Run `npm install --legacy-peer-deps`
- **Status**: ✅ Already resolved

---

## 📞 Key Contacts/References

**Farcaster Mini Apps Docs**:
- Main: https://miniapps.farcaster.xyz/
- SDK Reference: https://miniapps.farcaster.xyz/docs/specification
- Context API: https://miniapps.farcaster.xyz/docs/sdk/context

**Writer Coin Info**:
- AVC by Fred Wilson: https://avc.xyz/
- Paragraph: https://paragraph.com/

**Base Blockchain**:
- Docs: https://docs.base.org/
- Faucet: https://www.base.org/faucet (for testing)

---

## ✅ Session Complete

- ✅ Mini App SDK migrated to November 2025 standard
- ✅ Phase 1 (70%) architecture in place
- ✅ All documentation updated
- ✅ Code committed and pushed to GitHub

**Next**: Start Week 3 game generation integration

---

**Questions?** Check `docs/WEEK3_PLAN.md` or review specific component files.

Good luck! 🚀
