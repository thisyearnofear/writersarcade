# UX Principles — Progressive Disclosure & Verbosity

Guiding standard for WritersArcade interfaces. Keep the product calm: lead with one
primary action, reveal detail on demand, and never let an advanced or optional feature
compete with the core loop.

## Time to joy (the governing metric)

The single most important product metric is **time from landing → interacting with
something delightful**. Every flow is designed against it:

1. **Play before create.** A visitor's first click should reach a playable game —
   no wallet, no signup, no payment. The hero CTA deep-links into play mode
   (`/games/[slug]?play=1`), not an artifact page or a form.
2. **Try before you pay.** The first story generation is free
   (`DemoEntitlementService` — one per actor). The generate flow must attempt
   generation *before* showing payment UI; only a `PAYMENT_REQUIRED` response
   routes the user to the payment step. Never put a payment gate in front of a
   first-time user who is demo-entitled.
3. **Generate just ahead of consumption.** Content appears in the order the
   player reaches it: stream panel text, start its image the moment the
   narrative portion is complete (don't wait for stream end), and let
   post-completion work (cover art, secret panel, hypercert) run in the
   background — never block the player on it.
4. **Every shared artifact lands playable.** Share links open into the
   experience (play mode, or an autoplaying run recap), then offer "make yours."
   The shared object demonstrates the product instead of describing it.
5. **Waiting is part of the game.** When a wait is unavoidable, show living
   progress (panel streaming, staged overlays) — never a silent spinner.

These rules rank above Progressive Disclosure when they conflict: a fast path
to joy beats a tidy step sequence.

## Core rules

1. **Defaults first, details on demand.**
   Every screen should complete its primary job with sensible defaults visible.
   Anything optional, advanced, or ownership-related (payment rails, IP registration,
   contracts, export formats) belongs behind a disclosure: `<details>/<summary>`,
   a tooltip (`ConceptTooltip`), a modal, or a progressive tab.

2. **One primary next action per screen.**
   A view should have at most one visually dominant CTA (the "share your ending"
   card, the "Play game" button, the hero "Create" field). Secondary paths are
   smaller, lower-emphasis rows — never a second big card competing for attention.

3. **Max 3 visible footer/nav links per group.**
   The footer Explore column lists the four core pillars only; everything else lives
   behind the "More" disclosure. Never duplicate a link that already exists in the
   header or user menu.

4. **No raw URLs or hashes as visible content.**
   Show the hostname for source links (`paragraph.com`), a shortened address for
   wallets/tx hashes, and put the full value in `title` or on the explorer page.

5. **Two-sentence explanations.**
   Descriptive copy gets one sentence of context plus one sentence of value. Longer
   mechanics go in a tooltip or a "How it works" disclosure, not a paragraph block.

6. **Clamp long content with an explicit affordance.**
   Generated descriptions use `line-clamp-2` with a "Read more" toggle. Never render
   a multi-paragraph blob inside a card or hero.

## Disclosure patterns already in the product

- Footer "More" and contract links in the bottom bar (`components/layout/footer.tsx`)
- Game landing: cinematic cover + panel strip; synopsis, credits, NFT, and
  play activity sit in `<details>` (`game-artifact-view.tsx`)
- Play start screen: tagline only — no synopsis dump (`hero-screen.tsx`)
- Related plays: same-writer / same-genre covers plus the source essay, shown
  on the landing, during panel waits, and after the finale — never beside
  the four choices (`related-play-strip.tsx`)
- Generate flow: "Advanced payment options" and "Adjust direction" panels
  (`customize-step.tsx`), payment "Details" (`payment-step.tsx`)
- My Games "Vault & collectibles" progressive tabs (`my-games-client.tsx`)
- `ConceptTooltip` inline term definitions (`components/ui/concept-tooltip.tsx`)
- Post-completion referral + export cards collapsed by default
  (`post-game-completion.tsx`)

## Anti-patterns to avoid

- A second full-screen onboarding coach when one exists (consolidate, don't stack).
- Showing payment, IP, or contract details before the user has reached that step.
- Three equally-weighted CTAs in a row (equal weight = no priority).
- Long paragraphs in heroes or cards; full articles belong on the source page.

## Behavioral design — honest levers only

We use behavioral economics to make the real product feel as good as it is —
never to manufacture false urgency. Rules:

1. **Only true claims.** Scarcity, rarity, and social proof must be derived
   from real data (e.g. ending-path rarity comes from actual choice-path
   signatures across sessions). No fake countdowns, no "3 left!", no invented
   demand.
2. **Gift the artifact, charge for ownership.** The peak-end artifact (the
   montage film of a run) is produced automatically after a completed run —
   watching and sharing are free; monetization sits on *claiming* it (mint).
   Endowment effect applied honestly: the thing already exists.
3. **Rarity over pressure.** "You're the only player who took this path" beats
   "buy now." Uniqueness is the shareable claim.
4. **Completion earns.** A finished run is the unlock condition for the free
   film — effort → reward, not checkout → reward.
5. **Show progress, don't nag.** Unfinished runs, streaks, and "your credits
   can still make one more story" are informational surfaces, not dark
   patterns.
