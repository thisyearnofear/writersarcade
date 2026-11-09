# WritersArcade → 8/10

## Before anything: I found a live security hole, and it's not a style issue

While sizing the "duplicate mini-app routes" item from my review, it turned out to have teeth.

**`app/mini-app/api/games/generate/route.ts` is an unauthenticated, unpaid AI generation endpoint.**

- `grep` for `getActor|requireAuth|PAYMENT_REQUIRED|fundingLookup|verifyOnChainPayment|getVerifiedCreationPayment` in that file returns **0 matches**.
- It calls `GameAIService.generateGame(...)` and `GameDatabaseService.createGame(...)` directly.
- Compare the main route, which enforces `PAYMENT_REQUIRED` (402) and resolves funding via `GameFundingService.getVerifiedCreationPayment`.
- It has **no callers** in the repo (the mini-app client calls `/api/games/generate`), but it is a live route on the deployed app. Anyone can POST to it and spend your AI budget and write rows.

**`app/mini-app/api/payments/verify/route.ts` is a hand-rolled verifier that checks almost nothing.**

It confirms only that the receipt exists, succeeded, and `receipt.to` equals the payment contract. It does **not** call the hardened `verifyOnChainPayment`, does not decode calldata, does not check the emitted event, does not check the amount, does not check `chainId`, has no auth, and never writes a `Payment` row.

Accurate impact: because it writes no `Payment` row, it cannot unlock the server-side verified-funding path (that needs `status: 'verified'` in the DB). So this is a **broken endpoint that reports false success to its client**, not a confirmed fund-drain. Its client (`PaymentButton.tsx`, used only by the mint flow in `GamePlayer.tsx`) receives a false positive. That's still worth fixing today, and it's the reason I'm doing Phase 0 before any scoring work.

Both are the same root cause I flagged in the review: duplicate API routes for one domain.

---

## Phase 0 — Security (first, non-negotiable)

1. **Delete** `app/mini-app/api/games/generate/route.ts` — unauthenticated free generation, zero callers.
2. **Replace** `app/mini-app/api/payments/verify/route.ts` with a thin delegate to the shared hardened verifier (`verifyOnChainPayment` + `Payment` row + auth), or delete it and point `PaymentButton` at `/api/payments/verify`. `initiate` already reuses `PaymentCostService`, so it gets consolidated rather than rewritten.
3. Confirm no regression in the mini-app mint path.

## Phase 1 — Architecture 7 → 8

4. **Consolidate `components/game/` into `domains/games/components/`.** 14 live files, 22 import sites. This kills the worst smell in the repo: `domains/` currently imports *back* into `components/game/` for its own domain components.
5. **Delete 3 dead files** found during sizing: `article-fidelity-review.tsx`, `ModelSelector.tsx`, `radioCard.ts` — zero importers, zero references repo-wide.
6. **Empty the `components/ui/` junk drawer.** 39 files, only ~14 are primitives. Move feature code to its domain: `buy-credits` (701 lines), `balance-display`, `revenue-forecast`, `asset-*` (6 files, 5 unused), `wallet-connect`, `share-dropdown`, `user-attribution`, `play-trend-chart`.
7. **Apply `apiHandler` to the money routes** (`credits/spend`, `payments/verify`, `payments/initiate`, `payments/refund`, `ramp/webhook`, `credits/purchase-musd`). It's documented as the standard and adopted in 0 of 84 routes.

## Phase 2 — UI/UX 6.5 → 8

8. **Add the missing semantic tokens** to `globals.css` + `tailwind.config.ts`: `brand`, `success`, `warning`, `info` (each with `-foreground`), light **and** dark. I verified Tailwind's alpha syntax works with these variables in this exact config (`bg-primary/90` → `hsl(var(--primary) / 0.9)`), so `/opacity` modifiers keep working.
9. **Migrate primitives + layout to tokens** by hand — `button`, `dialog`, `card`, `input`, `badge`, `tabs`, `select`, `switch`, `textarea`, `overlay`, `toaster`, `header`, `footer`, `NetworkIndicator`. `dialog.tsx` is the poster child: correct `bg-background`, then hardcoded `ring-purple-500` three lines later.
10. **Codemod the high-confidence palette colors.** Distribution is 763 purple, 313 amber, 208 emerald, 147 red, 123 green, 114 slate, 85 blue, 41 yellow, 41 cyan, 35 zinc. One brand hue (purple) means this is mostly mechanical: purple→`brand`, emerald/green→`success`, amber/yellow→`warning`, red→`destructive`, slate/zinc/gray→`muted-foreground`/`border`. I'll map the unambiguous ones and hand-review the rest rather than blind-replacing 1,891 occurrences.
11. **Add an ESLint guard** so the 1,891 can't come back: warn on new hardcoded palette utilities outside the token layer.
12. **Fix `<img>` → `next/image`** at the 3 sites whose hosts are already in `remotePatterns` (ipfs.io, pinata). The other 2 stay plain `<img>` with a comment, since their hosts aren't allowlisted and I won't widen the pattern.

## Phase 3 — Verify

13. `pnpm type-check` → `npx eslint` → `pnpm test` (41 test files). Nothing ships until all three are green.

---

## What I am NOT doing, and why

- **Not touching `prisma/schema.prisma`.** The additive-migration rule in AGENTS.md is correct and there's no schema change this needs.
- **Not running migrations or deploying.** Code changes only; you push when you're happy.
- **Not renaming `/studio`, `/workshop`, `/generate`.** Real product-design debt, but it's a product decision with redirect and SEO consequences, not a refactor. Flagging it, not doing it.
- **Not chasing 100% token coverage.** The goal is that the *system* is token-driven and drift is blocked, not that every one-off gradient is converted. I'd rather leave a deliberate gradient than flatten it into a token that lies about what it is.

## Honest expectation on the score

Architecture 7 → 8 is solid: items 4–7 are the exact things that cost it points. UI/UX 6.5 → 8 is achievable but the a11y gap (67 aria-labels, 38 alts across 240 files) is the part I can't fully close in one pass — I'll fix what the migration touches and tell you what's left. Product design is already 8; I'm leaving it alone.