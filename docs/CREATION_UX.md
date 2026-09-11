# Creation UX Contract

## Purpose

WritersArcade should feel like a game-making product first, not an AI media configuration tool. The first-run creation flow must get a user from source to a playable story with the fewest meaningful decisions.

## Product promise

> Give us a source. Choose the story direction. Get a playable experience.

The primary creation path is intentionally compact and mobile-first. More control remains available, but it appears when the user has enough context to use it.

## Core creation flow

The first-run flow has three user jobs:

1. **Source** — paste a public article URL or provide supported source text.
2. **Story direction** — choose the format, tone, story intensity, and optionally the visual finish.
3. **Generate** — complete the required payment or free path, then generate the playable story.

The interface may retain implementation steps for payment and generation progress, but the user-facing mental model remains three stages: **Source → Direction → Generate**.

### Primary controls

Show these controls without opening an advanced panel:

- Playable Story as the default format
- Tone: Horror, Comedy, or Mystery
- Story intensity: Faster progression or Deeper branches
- One primary generation action

Use outcome-based language. Users should understand what changes when they choose an option without knowing which model or provider is behind it.

### Advanced controls

Keep these discoverable but collapsed or secondary:

- Payment rail selection (MUSD versus Writer Coin)
- Specific writer selection
- Technical model/provider details
- Fine-grained generation settings
- IP registration and marketplace enrichment

The default path must not require a user to understand wallets, chains, tokens, model names, Inco, NFTs, or Story Protocol.

## Progressive optionality

> Reveal control when the user has earned the context to use it.

### Before generation

Optimize for confidence and clarity:

- Show the source preview.
- Show the five-beat story shape, not the exact ending.
- Explain that reader choices shape the resolution.
- Keep the primary CTA obvious.

### During play

Optimize for agency and consequence:

- Choices should be the main interaction.
- Narrative and choices become available as soon as the response text is ready; image generation continues progressively in the panel background.
- Story signals may be shown as feedback, but should not become a technical score wall or imply a hidden penalty.
- Play remains untimed; reading speed is never a core-game penalty.

### After completion

Optimize for expansion:

- Share the playable story and ending first.
- Replay another story or start a new creation path.
- Own and unlock the secret epilogue where applicable.
- View reader insights for creators.
- Optionally turn the completed comic into a short cinematic animation.
- Offer refinement and alternate-ending tools only when those workflows are real and understandable.

## Feature placement decisions

### Video and animation

Animation is a post-generation derivative, not a first-run creation choice. It belongs after the user has completed a story and has an artifact worth extending:

> Turn your completed comic into a short cinematic cut.

Do not add an animation checkbox to the initial generator until a separate, clearly named cinematic creation mode exists.

### Model optionality

Expose outcomes, not providers:

- **Explore quickly** — faster generation for iteration.
- **Refined visuals** — more visual detail and potentially longer generation.

Do not expose provider names, model IDs, or separate narrative/image/video model decisions in the first-run path.

### Ending preview

Do not reveal the exact ending before play. Show a non-spoiler story shape:

1. Opening
2. Rising action
3. Your choice
4. Climax
5. Resolution

The user should know that the ending is shaped by choices without losing the curiosity that drives completion. A true ending editor or alternate-ending preview belongs in a future refinement workflow.

### Workshop and Studio

- **Generate** is the compact path from source to playable story.
- **Studio** is the wallet-free copy-to-story path for marketers and campaign creators.
- **Workshop / Creator Studio** is for deeper refinement, asset editing, IP, and creator controls—not a prerequisite for a first playable story.

## Mobile interaction rules

- One primary decision and one primary CTA per stage.
- Minimum 48px touch targets.
- Keep the primary action reachable without scrolling back to the top.
- Use a persistent mobile step bar for progression and back navigation.
- Do not put payment rails, model details, and output formats in the same visual group as the main story direction.
- Prefer compact summaries and disclosure panels over long explanatory cards.

## Mobile validation checkpoint

The first mobile usability pass was completed against `/generate` at a 390×844 viewport.

- Source, direction, and payment/generation progression remains compact and readable.
- The persistent mobile step bar is reachable and does not obscure the form; the form reserves bottom space for it.
- The source URL input and preview action use 48px touch targets.
- The page had no horizontal overflow (`scrollWidth` matched the 390px viewport width).
- An invalid public-looking article URL failed safely at preview with a clear backend error; it did not bypass the payment gate.
- Development-only chunk/Lit warnings were observed during local testing and were not reproduced as product-flow failures.

Keep this checkpoint as the baseline for future mobile funnel comparisons. Repeat the audit after any change to the generator hierarchy, sticky navigation, payment gate, or source preview.

## Feedback triage rule

When feedback arrives, classify it before implementing it:

| Request | Likely underlying need | Default response |
|---|---|---|
| "Make it more compact" | The next action is unclear | Reduce simultaneous decisions and copy |
| "Make it mobile optimized" | The flow is scroll-heavy or hard to advance | Improve step navigation and CTA reachability |
| "Let me choose the model" | Need control over speed, quality, or cost | Expose outcome-based quality presets |
| "Let me preview the ending" | Need confidence in the result | Show story shape, not the spoiler |
| "Let me make a video" | Need a richer shareable artifact | Offer animation after completion |
| "Let me take different directions" | Need authorship | Increase meaningful story-direction choices, not technical toggles |

## Success metrics

Measure the compact flow before adding more options:

- Mobile source submission rate
- Article preview completion
- Direction-step completion
- Payment abandonment by stage
- Generation completion rate
- Time to first meaningful action
- Play-start rate after generation
- Five-panel completion rate
- Share and animation uptake after completion
- Creator insight visits and repeat creation

A new option earns a place in the primary path only if it improves a user outcome without reducing source-to-playable-story completion.

The client funnel events are persisted as sanitized `ProductAnalyticsEvent` records. The persistence boundary validates known event names, stores selected outcome-safe properties, the pathname, and a server timestamp; it deliberately drops raw URLs, wallet addresses, article text, and unapproved properties. The admin report exposes event-volume ratios, not unique-user or session conversion, because the baseline intentionally does not identify users. Add a retention/cleanup policy before event volume grows materially.

## Sequencing

### Now

- ✅ Compact mobile creation hierarchy
- ✅ Outcome-based labels
- ✅ Non-spoiler story-shape preview
- ✅ Clear post-generation expansion language
- ✅ Instrument the funnel
- ✅ Complete the first 390×844 mobile usability checkpoint

### Next

- ✅ Build the first admin-only internal funnel report from persisted events (`GET /api/admin/analytics/funnel?days=30`, bounded to 1–90 days)
- Test Fast versus Refined visual presets
- Improve the completion tray for share, ownership, insights, and animation
- Measure demand for alternate endings and refinement

### Later

- Ending editor
- Alternate-ending preview/generation
- Creator-grade model controls
- Dedicated cinematic story creation mode

---

## UX Principles

Guiding standard for WritersArcade interfaces. Keep the product calm: lead with one primary action, reveal detail on demand, and never let an advanced or optional feature compete with the core loop.

### Time to joy (the governing metric)

The single most important product metric is **time from landing → interacting with something delightful**. Every flow is designed against it:

1. **Play before create.** A visitor's first click should reach a playable game — no wallet, no signup, no payment. The hero CTA deep-links into play mode (`/games/[slug]?play=1`), not an artifact page or a form.
2. **Try before you pay.** The first story generation is free (`DemoEntitlementService` — one per actor). The generate flow must attempt generation *before* showing payment UI; only a `PAYMENT_REQUIRED` response routes the user to the payment step. Never put a payment gate in front of a first-time user who is demo-entitled.
3. **Generate just ahead of consumption.** Content appears in the order the player reaches it: stream panel text, start its image the moment the narrative portion is complete (don't wait for stream end), and let post-completion work (cover art, secret panel, hypercert) run in the background — never block the player on it.
4. **Every shared artifact lands playable.** Share links open into the experience (play mode, or an autoplaying run recap), then offer "make yours." The shared object demonstrates the product instead of describing it.
5. **Waiting is part of the game.** When a wait is unavoidable, show living progress (panel streaming, staged overlays) — never a silent spinner.

These rules rank above Progressive Disclosure when they conflict: a fast path to joy beats a tidy step sequence.

### Core rules

1. **Defaults first, details on demand.** Every screen should complete its primary job with sensible defaults visible. Anything optional, advanced, or ownership-related (payment rails, IP registration, contracts, export formats) belongs behind a disclosure: `<details>/<summary>`, a tooltip (`ConceptTooltip`), a modal, or a progressive tab.
2. **One primary next action per screen.** A view should have at most one visually dominant CTA (the "share your ending" card, the "Play game" button, the hero "Create" field). Secondary paths are smaller, lower-emphasis rows — never a second big card competing for attention.
3. **Max 3 visible footer/nav links per group.** The footer Explore column lists the four core pillars only; everything else lives behind the "More" disclosure. Never duplicate a link that already exists in the header or user menu.
4. **No raw URLs or hashes as visible content.** Show the hostname for source links (`paragraph.com`), a shortened address for wallets/tx hashes, and put the full value in `title` or on the explorer page.
5. **Two-sentence explanations.** Descriptive copy gets one sentence of context plus one sentence of value. Longer mechanics go in a tooltip or a "How it works" disclosure, not a paragraph block.
6. **Clamp long content with an explicit affordance.** Generated descriptions use `line-clamp-2` with a "Read more" toggle. Never render a multi-paragraph blob inside a card or hero.

### Disclosure patterns already in the product

- Footer "More" and contract links in the bottom bar (`components/layout/footer.tsx`)
- Game landing: cinematic cover + panel strip; synopsis, credits, NFT, and play activity sit in `<details>` (`game-artifact-view.tsx`)
- Play start screen: tagline only — no synopsis dump (`hero-screen.tsx`)
- Related plays: same-writer / same-genre covers plus the source essay, shown on the landing, during panel waits, and after the finale — never beside the four choices (`related-play-strip.tsx`)
- Generate flow: "Advanced payment options" and "Adjust direction" panels (`customize-step.tsx`), payment "Details" (`payment-step.tsx`)
- My Games "Vault & collectibles" progressive tabs (`my-games-client.tsx`)
- `ConceptTooltip` inline term definitions (`components/ui/concept-tooltip.tsx`)
- Post-completion referral + export cards collapsed by default (`post-game-completion.tsx`)

### Anti-patterns to avoid

- A second full-screen onboarding coach when one exists (consolidate, don't stack).
- Showing payment, IP, or contract details before the user has reached that step.
- Three equally-weighted CTAs in a row (equal weight = no priority).
- Long paragraphs in heroes or cards; full articles belong on the source page.

### Behavioral design — honest levers only

We use behavioral economics to make the real product feel as good as it is — never to manufacture false urgency. Rules:

1. **Only true claims.** Scarcity, rarity, and social proof must be derived from real data (e.g. ending-path rarity comes from actual choice-path signatures across sessions). No fake countdowns, no "3 left!", no invented demand.
2. **Gift the artifact, charge for ownership.** The peak-end artifact (the montage film of a run) is produced automatically after a completed run — watching and sharing are free; monetization sits on *claiming* it (mint). Endowment effect applied honestly: the thing already exists.
3. **Rarity over pressure.** "You're the only player who took this path" beats "buy now." Uniqueness is the shareable claim.
4. **Completion earns.** A finished run is the unlock condition for the free film — effort → reward, not checkout → reward.
5. **Show progress, don't nag.** Unfinished runs, streaks, and "your credits can still make one more story" are informational surfaces, not dark patterns.
