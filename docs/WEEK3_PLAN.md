# Week 3: Game Generation Integration

**Objective**: Connect GameCustomizer to actual game generation API and render playable games.

**Timeline**: 3-4 days

**Status**: ✅ API & UI Complete - Testing Phase

---

## Tasks Overview

### 1. API Endpoint Creation (Day 1)
**File**: `app/mini-app/api/games/generate/route.ts`

```typescript
POST /api/games/generate
Request:
{
  writerCoinId: "avc",
  articleUrl: "https://avc.xyz/article",
  gameTitle: "My Game",
  genre: "horror" | "comedy" | "mystery",
  difficulty: "easy" | "hard"
}

Response:
{
  gameId: "uuid",
  status: "generating" | "complete",
  game: { /* game JSON */ },
  error?: string
}
```

**Logic**:
1. Validate writer coin ID against whitelist
2. Validate article URL matches writer coin's Paragraph
3. Fetch article content via Paragraph API
4. Call existing Infinity Arcade game generation service
5. Stream response back to frontend
6. Store game metadata in database

**Key**: Use existing game generation pipeline from Infinity Arcade

---

### 2. GameCustomizer Integration (Day 1)
**File**: `app/mini-app/components/GameCustomizer.tsx`

**Update**:
```typescript
const handleGenerateGame = async () => {
  setIsGenerating(true)
  try {
    const response = await fetch('/api/games/generate', {
      method: 'POST',
      body: JSON.stringify({
        writerCoinId: writerCoin.id,
        articleUrl: articleUrl,
        gameTitle: gameTitle,
        genre: gameType,
        difficulty: difficulty
      })
    })
    
    const game = await response.json()
    // TODO: Navigate to game player or show inline
  }
}
```

---

### 3. Game Player Component (Day 2)
**File**: `app/mini-app/components/GamePlayer.tsx` (NEW)

Display the generated game with:
- Game title
- Genre/difficulty badges
- Playable game content
- "Mint as NFT" button
- "Share on Farcaster" button

**Input**: `game` object from API response

**Output**: Interactive game UI

---

### 4. Game Flow Integration (Day 2)
**File**: `app/mini-app/page.tsx`

Add new step: `play-game`

```typescript
const [step, setStep] = useState<
  | 'select-coin'
  | 'input-article'
  | 'customize-game'
  | 'play-game'  // ← NEW
>('select-coin')

// New handler
const handleGameGenerated = (game) => {
  setGeneratedGame(game)
  setStep('play-game')
}

// New UI section
{step === 'play-game' && generatedGame && (
  <GamePlayer 
    game={generatedGame}
    onMint={handleMintGame}
    onShare={handleShareGame}
  />
)}
```

---

### 5. Database Schema Update (Day 2)
**File**: `prisma/schema.prisma`

Add game table if not present:

```prisma
model Game {
  id        String   @id @default(cuid())
  title     String
  articleUrl String
  genre     String   // "horror" | "comedy" | "mystery"
  difficulty String  // "easy" | "hard"
  content   Json     // Full game JSON
  writerCoinId String
  creatorId String   // User who generated it
  createdAt DateTime @default(now())
  
  // Relations
  creator   User @relation(fields: [creatorId], references: [id])
}
```

Then:
```bash
npm run db:push
```

---

### 6. Error Handling & Polish (Day 3)
- [ ] Handle API errors gracefully
- [ ] Show loading state while generating
- [ ] Add retry logic for failed generations
- [ ] Optimize game response times
- [ ] Test all 6 combinations (3 genres × 2 difficulties)

---

## Success Criteria

- [x] GameCustomizer shows genre/difficulty selectors
- [x] API endpoint accepts game generation requests
- [x] Game renders properly in Mini App
- [x] GamePlayer component with interactive UI
- [x] Main flow has play-game step
- [x] Database schema supports mini-app fields
- [ ] Game generation completes in <30 seconds
- [ ] All 6 genre/difficulty combinations work
- [ ] Errors display user-friendly messages
- [ ] Loading states work smoothly
- [ ] Database migration applied

---

## Code Structure

```
app/mini-app/
├── page.tsx                          ✅ Main flow coordinator (4 steps)
├── layout.tsx                        ✅ Manifest metadata
├── components/
│   ├── WriterCoinSelector.tsx        ✅ DONE
│   ├── ArticleInput.tsx              ✅ DONE
│   ├── GameCustomizer.tsx            ✅ DONE (genre/difficulty)
│   ├── GamePlayer.tsx                ✅ DONE - Interactive gameplay
│   ├── PaymentButton.tsx             ⏳ WEEK 4
│   └── MintButton.tsx                ⏳ WEEK 5
└── api/
    └── games/
        ├── generate/
        │   └── route.ts              ✅ DONE - Writer coin validation + game generation
        └── mint/
            └── route.ts              ⏳ WEEK 5
```

---

## Integration Points

### Existing Services
- **Infinity Arcade**: Game generation engine (use existing API)
- **Paragraph API**: Article fetching (already working)
- **Prisma**: Database storage (already configured)

### New Services Needed
- Game generation API wrapper (`app/mini-app/api/games/generate/route.ts`)
- Game player component (`app/mini-app/components/GamePlayer.tsx`)

---

## Testing Checklist

### Manual Testing
- [ ] Select AVC coin
- [ ] Paste valid AVC article URL (e.g., https://avc.xyz/...)
- [ ] Click generate for Horror + Easy
- [ ] Game renders in <30 seconds
- [ ] All controls work
- [ ] Repeat for other genre/difficulty combos

### Error Cases
- [ ] Invalid article URL
- [ ] Article from different author
- [ ] API timeout (>60 seconds)
- [ ] Network error
- [ ] Game generation failure

---

## Dependencies Check

```bash
npm list | grep -E "(infinity|arcade)"
```

Need to confirm existing game generation service is available and callable.

---

## Estimated Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| API endpoint | 2-3 hours | Low |
| GameCustomizer integration | 1 hour | Low |
| GamePlayer component | 3-4 hours | Medium |
| Flow integration | 1-2 hours | Low |
| DB schema update | 30 minutes | Low |
| Error handling & polish | 2-3 hours | Low |
| **Total** | **10-14 hours** | **Low** |

---

## Next Session Priorities

1. ✅ Confirm Infinity Arcade API is callable
2. ✅ Create `/api/games/generate` endpoint
3. ✅ Build GamePlayer component
4. ✅ Integrate into main flow
5. ✅ Test all 6 game combinations
6. ✅ Deploy to staging (Vercel)
7. ⏳ Then move to Week 4 (Smart contracts)

---

## Key Files to Review Before Starting

- `docs/ROADMAP.md` - Overall vision (section: Game Customization)
- `docs/NEXT_STEPS.md` - Week 3 tasks (section: Week 3: Game Generation)
- `app/mini-app/components/GameCustomizer.tsx` - Current UI (needs integration)
- Existing game generation code (find Infinity Arcade integration)

---

## Potential Blockers & Solutions

| Blocker | Solution |
|---------|----------|
| Infinity Arcade API not accessible | Check if service is running, confirm endpoint URL |
| Game generation too slow | Optimize prompts, consider caching similar articles |
| Game JSON format unexpected | Add parsing/transformation layer |
| Database migrations fail | Review Prisma schema, check PostgreSQL connection |
| Game player rendering issues | Test with simple game first, add debug logs |

---

## Post-Week 3 Checklist

Before moving to Week 4, confirm:
- [ ] Game generation works end-to-end
- [ ] All 6 combinations tested (CURRENT)
- [x] Error handling in place
- [ ] Database stores games correctly (pending migration)
- [x] UI responds quickly
- [ ] Deploy to staging works
- [ ] Ready for Week 4 (Payments)

---

**Ready to start!** 🚀

Begin with the API endpoint. Once that's working, everything else flows naturally.
