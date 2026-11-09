# Mezo Buildathon — Wave 2 strategy (WritersArcade)

Status: **planning**. Wave 2 window **Nov 2–15, 2026**, pool **$5,000 in
MEZO**, judged by the Mezo core team on AKINDO. Wave 1 outcome and what it
taught us: see "Outcome" in [`MEZO_BUILDATHON_W1.md`](./MEZO_BUILDATHON_W1.md).

## Ground rules (from the AKINDO program page)

- Deadline **Nov 15**; winner announcement **Nov 23**.
- Two tracks: **DeFi** (borrow/lend/loop/yield) and **Access & Distribution**.
  We are Track 2 — same project, carried forward.
- Rewards are **proportional to evaluation scores, not fixed top-3** — every
  qualifying submission is in the running, so entering costs little.
- Criteria: Mezo Integration, Product & Business Viability, Technical
  Implementation, User Experience. Wave 2 "rewards depth."

## What won Wave 1 — the judging signal

| Place | Project | Shape |
|---|---|---|
| DeFi 1st | Doji | veBTC as collateral for fixed-rate MUSD loans |
| DeFi 2nd | Surety | veBTC-directed MUSD lending vault, voter reward-loss stake |
| DeFi j-3rd | Janus | veMEZO locks ↔ veBTC bids pooled boost market |
| DeFi j-3rd | Keel | Lending strategy on the MUSD savings vault |
| Adoption j-3rd | Mezonk | MUSD-denominated prediction markets, MUSD locked in contract + BTC borrow |

Pattern: **every winner has MUSD/MEZO/veBTC structurally central — money held
or routed through contracts.** Even the one consumer project (Mezonk) locks
MUSD as settlement collateral. Nobody placed with MUSD as a checkout option.

## Our gap

Wave 1 WritersArcade used MUSD as a **payment rail that terminates in an
off-chain Postgres credit ledger** — one `MUSD.transfer` or splitter call,
then everything happens off-chain. The MEZO-holder boost (precompile read,
in-contract enforcement) was our most aligned feature and still reads as a
checkout perk. The fix for Wave 2 is depth, not polish.

## Ranked plan

Ordered by judge-impact per unit of effort. #1+#2 alone are a credible
"we went deeper" story; #3 is what moves us onto the winning axis.

### 1. Mainnet deployment — cheapest win
- `scripts/deploy/deploy-mezo-mainnet.sh` is ready; mainnet addresses in
  `lib/writer-coins.ts` (`MEZO_MAINNET_PAYMENT_SPLITTER`,
  `MEZO_MAINNET_GAME_NFT`) are still zero placeholders.
- Blocker: deployer needs mainnet BTC for gas.
- Testnet-only was likely a scoring hit under "Technical Implementation."

### 2. Flynn iMessage MUSD top-ups — the Track 2 differentiator
- Flynn (`apps/imessage-agent/src/flynn.ts`, live as PM2 `flynn-imessage`)
  already does the full loop: inbound URL → `generateGame` → reveal + film.
  **No payment/credit logic exists yet** — every message currently generates
  free.
- Build: Flynn replies with a pay link (or an x402-style challenge) → user
  pays MUSD via a deep link into the existing `purchase-musd` flow → on
  verification Flynn sends the game. "Text a link, pay in MUSD, get a game."
- Why it wins: every winner built for crypto-natives. A messaging surface
  that distributes MUSD to non-wallet users is the strongest possible Access
  & Distribution demo — and it's already deployed infrastructure.
- Reuses: `POST /api/credits/purchase-musd` (idempotent by tx hash),
  `GetMusdOptions`, `MezoBoostedSplitter`.

### 3. Credit float in the MUSD savings vault — the depth move
- Hold the prepaid-credit treasury float in Mezo's **MUSD savings vault**
  (the primitive Keel built on) and route yield into free plays / prize
  pools. Turns credits from a database liability into productive MUSD
  capital — the same structural shape as every winner.
- Open: vault contract address/interface — pull from Mezo docs before
  scoping. Greenfield; nothing in-repo references it yet.
- Fallback framing if too big for the window: keep credits off-chain but
  hold the **treasury** in sMUSD and spend yield on a "daily free generate."

### 4. MUSD prize tournaments — the proven consumer shape
- Entry fees pool in contract, winners claim on-chain. Same contract shape
  as Mezonk (the only consumer project that placed): MUSD locked, not just
  transferred. Good candidate if #3 slips — it shows MUSD *held*.

## Submission angle

Reframe the pitch from "arcade that accepts MUSD" to
**"consumer distribution layer for MUSD"**: users acquire MUSD to play,
treasury holds it in the savings vault, yield funds free plays, creators are
paid in MUSD — a closed loop where the stablecoin circulates on Mezo instead
of ending at a checkout. Lead the video with the Flynn demo (novel surface),
then the float (protocol depth), then mainnet proof.

## Decision rule

- Ship #1 + #2 minimum → submit; real shot in Track 2.
- Ship #3 or #4 as well → competitive with the DeFi entries on their axis.
- Ship nothing new → submit anyway (proportional rewards) but expect the
  Wave 1 outcome to repeat; do not count it as a real attempt.

## Open questions

- [ ] Does the Wave 1 AKINDO entry carry over, or is a fresh Wave 2
      submission required? Check the project page on app.akindo.io.
- [ ] Mainnet BTC gas for the deployer — source before the window closes.
- [ ] MUSD savings vault contract address + deposit/redeem interface
      (Mezo docs / contracts-reference).
- [ ] Flynn pay-link UX: deep link into buy-credits modal vs. hosted
      payment page the agent text-messages.
