# LifeLens — Objective & Workplan

This is the single source of truth for *what* we're building and *why*, plus a checklist an
agent (or a human) can walk through and tick off. Pair with `architecture.md` for *how* it's
built technically, and `DEMO.md` for the pitch script and pre-demo checklist.

## 1. Problem statement (from eval)

- Life-event detection is branch logic over 3 hand-tuned personas. Confidence scores are tuned
  constants, not inferred. This is the single biggest gap between "demo" and "product."
- On-screen business-impact numbers (RM prep time saved, handoff rate, conversion) are
  self-labelled illustrative, not measured.
- Feature surface (avatar cosmetics, wearables, game) is broad relative to detection depth.
  Depth on detection is worth more than more customer-side features at this stage.
- What already works and must not be lost: the two-sided loop (RM sees evidence + confidence →
  customer explores the same projection → consented handoff → qualified conversation), the fully
  deterministic/inspectable projection engine, and the compliance design (LLM narrates, never
  computes; recommendations are conversation openers, not offers; health/behavioral data never
  touches eligibility; achievements reward resilience, not purchases).

## 2. Product vision

A **Digital Life Twin**: a customer-side simulator where a person can see their real spending
shape, set life goals, and play with levers to see how their financial trajectory changes — paired
with an RM-side intelligence layer that detects real life events from transaction data with cited
evidence and confidence, so exploration turns into a qualified, needs-led conversation instead of a
cold lead.

Two audiences, one underlying deterministic engine:
- **Customer**: "how do I get from here to my goal, and what does changing X do to that?"
- **RM**: "which of my customers just had something change, what's the evidence, what's suitable
  to bring up?"

LLM sits on top of both as an explainer/customizer — it is never the source of a number shown on
screen.

## 3. Non-negotiable compliance principles (apply to every workstream below)

1. Any **number** shown on screen is computed by deterministic code. Any **prose** is LLM, and
   must cite the numbers/evidence it's referencing.
2. LLM never computes projections, eligibility, or a confidence score. It may *propose*
   hypotheses or *narrate* results that a deterministic scorer/rules engine already produced.
3. Health, wearable, and (if ever added) location/device data never feeds credit eligibility,
   suitability, or balances. Hard code-level isolation, not just a UI note.
4. Recommendations surface as conversation openers, not offers or automatic decisions.
5. Achievements/gamification reward behavior (resilience, avoiding debt, protection, balance),
   never product purchases.
6. Every derived claim (life stage, protection gap, spend-power, lifestyle tag) must resolve to a
   visible rule + cited source transactions/records — no black-box scores anywhere in the app.

## 4. Current status (as of this doc)

| Phase / Workstream | Status |
|---|---|
| Phase 0 — stack decision, cleanup, test runner | ✅ Done — Express is canonical; Next.js `src/` + Playwright retired |
| Workstream 1 — realistic mock transaction data | ✅ Done — 6-month hero + 24 holdout ledgers (12–24mo out of scope) |
| Workstream 2 — generalized detection engine | ✅ Done — `agents/detector.js` scores all templates; live path no longer uses `scenario.id` |
| Hackathon Wow Track — 6 judge-facing gaps | ✅ #1–#6 on `/today` + `/future` Goal Plan |
| Workstream 3 — explainable LLM outputs | ✅ Citations + Future You cites + live output re-checked by narrationGuard |
| Workstream 4 — UX pass (RM vs customer) | ✅ Today ranked by confidence × value; fun-mode gates Canvas/avatar |
| Workstream 5 — real SC product grounding | ✅ Catalog from in-repo public names; **live scrape declined** |
| Workstream 6 — end-to-end loop + real metrics | ✅ Holdout in Today + Goal Plan share → queued handoff; in-memory metrics |
| Customer 360 data model expansion | ✅ Identity + holdings + credit + derived profile; location/device out of scope |
| Demo-day operational readiness — 4 items | ✅ A/D in code; B = README PORT path (run on demo laptop); C fallback verified without a key |
| RM cross-mapping | ❌ v2 — not this demo |

## 5. Customer 360 — full dataset plan

Six data domains. Identity, transactions, holdings, credit, and derived profile exist.
Location/device remains deferred. Each domain is a **separate synthetic dataset** (except derived,
which is a labelled function over classified transactions), not a silent join, so provenance stays
explainable.

### 5.1 Identity & demographics (new)
- `Customer`: id, fullName, dob, masked/synthetic NRIC, nationality, contact, KYC/segment,
  consent flags (marketing, data-sharing, biometric) — per-domain consent, not one blanket flag.
- **Risk flag:** never use a real-looking NRIC format even in demo data.

### 5.2 Transactions (done — Workstream 1)
- Statement-line shape (`postDate`, `merchantRaw`, `mcc`, `channel`, `direction`, `accountId`),
  classified post-hoc, not author-labelled.
- Ledgers stay at **6 months**. 12–24 months is out of scope (would retune holdout P/R).

### 5.3 Products & policies **held** (`data/policyHoldings.js`)
- **Risk identified (fixed):** `candidates` used to be both "recommend" and "owned." Split: holdings
  are owned; `candidates` remain recommendable.
- `PolicyHolding` per customer: product code, category, status, start, premium, sum assured / AUM,
  outstanding balance (loans).
- `protectionGap = estimatedNeed − sum(activeInsuranceSumAssured)`.

### 5.4 Credit profile (new — kept separate from transactions)
- **Risk identified:** do not derive credit-bureau-style data from the transaction ledger — that's
  unrealistic (real bureau data isn't observable from statement lines) and would blur the
  provenance of every downstream claim.
- New standalone synthetic `CreditProfile` dataset (bureau score/band, utilization ratio,
  delinquencies, active inquiries, secured/unsecured debt totals), generated the same way as
  `data/holdout.js` — deterministic, seeded, labelled as synthetic.

### 5.5 Behavioral / device / location signals — **out of scope**
- **Risk identified:** this is the most sensitive data type requested. Real device/location data
  is a PDPA/MAS exposure the rest of the app doesn't have yet.
- **Decision:** out of scope for this demo. If ever built: opt-in, labelled synthetic, never
  imported by intelligence or projection.

### 5.6 Derived profile (computed at request time, never stored as source of truth)
Recomputed from 5.1–5.4 (and 5.5 if it ever ships):
- `lifeStage` (label, confidence, evidence) — output of the Workstream 2 detector
- `spendPower` (monthly surplus, savings rate, spend-to-income ratio)
- `spendMix` (per-category actual % vs recommended % vs delta)
- `protectionGap` (real, from 5.3)
- `lifestyleTags` (from category mix, e.g. "adventurous", "family-oriented")
- `hobbiesGoals` (merchant-cluster inference + explicitly stated goals)

**Risk identified — spend benchmarks:** "recommended spending %" needs a real source or it's just
as fabricated as the old hardcoded impact metrics. Use either published guidance or a synthetic
population percentile computed from the existing 148-customer book, and label which one is in use.

## 6. SC Product Catalog (in-repo public names — no live scrape)

- `Product`: code, name, category, public eligibility criteria, description, key features,
  compliance flags (`requiresAdvisorSuitability`, `isInsurance`, `isInvestment`).
- Pure content/rules dataset — no customer data. No live scrape. `rankEligibleProducts()` joins this
  against `Customer` + `DerivedProfile`.

## 7. RM-side cross-mapping — out of scope (v2)

Agreed: this is a v2+ innovation, not part of the core loop. Backlog only:
- `RMProfile` (specialties, languages, caseload, historical conversion by category)
- Matching function: dominant customer need category → RM specialty ranking.
- Do not let this block Workstreams 2–6.

## 8. Digital Life Twin — customer experience (shipped)

1. **Goal input**: `{ type, targetAmount, targetDate }`, or plain language via
   `POST /api/customers/:id/intent` (“I am going to be…”). Model never invents amounts.
2. **Deterministic trajectory**: any customer + any goal. Levers (spend cut, extra save) update live.
3. **LLM role**: narrates the numbers, suggests which lever to try — never picks the numbers.
4. **Gamified layer**: Avatar Studio / missions fire only from real projection thresholds
   (`emergencyFundMonths >= 6`, etc.). Fun mode gates Canvas/Life Game.

## 9. Hackathon Wow Track — 6 judge-facing gaps (all shipped)

These were the highest score-per-hour items. They are live on `/future` (goal-plan, adhoc/holdout
demo beats) and `/developer` (holdout eval, live paste lab, before/after — moved off `/today` in
the third UX pass, §10 Workstream 4 below). Detail: `architecture.md` §5.4–§5.6, §6.4.

| # | Gap | Why it matters to judges | Where it lives |
|---|---|---|---|
| 1 | Detector is still branch logic, untested on unseen customers | Directly answers the eval's #1 complaint; if a judge picks a holdout customer today, nothing happens | Workstream 2 (already tracked below) — `architecture.md` §5 |
| 2 | No visible precision/recall number against the 24-customer holdout | One sentence — "91% precision on unseen customers" — beats any amount of narrative about explainability | `architecture.md` §6.4 |
| 3 | No live upload/paste-your-own-transactions demo | Strongest possible proof detection isn't hardcoded; most memorable visual moment | `architecture.md` §5.5 |
| 4 | Goal-planning still hardcoded to 3 heroes | Most interactive, playable part of the product — a judge testing their own numbers is memorable | `objective.md` §8 (Digital Twin), same item as existing checklist |
| 5 | Confidence is shown but not explained (no weight breakdown) | Directly answers "is this a black box" — cheap to build, high trust payoff | `architecture.md` §5.4 |
| 6 | No before/after (branch logic vs generalized) comparison for the pitch itself | Turns your own architecture fix into a 30-second demo beat | `architecture.md` §5.6 |

**Priority order** (also encoded in `architecture.md` §11 build order): 1 → 2 → 5 → 3 → 6, with 4
buildable in parallel since it's independent of the detection layer. Gaps 2, 3, 5, 6 are each small
once gap 1 exists — they mostly reuse its output, not new detection logic.

**Explicitly not part of this track** (deprioritized per earlier gap analysis — low demo payoff for
a hackathon relative to effort): multi-LLM provider adapter beyond what's needed for gap 3/detection
hypotheses, full Customer 360 (`identity.js`, `CreditProfile`) unless gap 4 specifically needs
`PolicyHolding` for a real protection-gap number, RM-to-RM matching, real SC product catalog scrape
beyond a handful of real product names for authenticity flavor.

### 9.1 Demo-day operational readiness — 4 additional gaps (not judge-facing features, but can
sink the demo regardless of how good the 6 above are)

| # | Gap | Detail |
|---|---|---|
| A | In-memory state never resets between rehearsal and live runs | `architecture.md` §12.1 |
| B | No verified fresh-clone install path | `architecture.md` §12.2 |
| C | Offline/no-key fallback exists in code but isn't rehearsed | `architecture.md` §12.3 |
| D | New adhoc endpoint (Wow gap #3) has no input hardening yet | `architecture.md` §12.4 |

These are cheap relative to the 6 Wow Track items and should be done alongside whichever gap they
depend on (D ships with gap #3; A/B/C are one-time setup, do them once the core detector rewrite
(gap #1) is stable enough to be worth rehearsing against).

## 10. Full task checklist (agent-checkable)

Each item should be validated by: file exists at the stated path, relevant vitest file passes, and
(where noted) a manual smoke check against the running Express app on a non-default port.

### Phase 0 — ✅ complete
- [x] Express canonical; Next.js `src/` + Playwright deleted
- [x] Git checkpoint before WS2: tag `checkpoint-ws1` (see `architecture.md` §11)

### Workstream 1 — ✅ complete, no action needed
- [x] `data/transactionSchema.js`, `data/sgMerchants.js`, `data/classifyMerchant.js`
- [x] `data/heroLedgers.js`, `data/ledgerFactory.js`, `data/holdout.js`
- [x] `npm test` green (116 tests across 21 files)

### Workstream 5.3 — Split product holdings from candidates
- [x] Define `PolicyHolding` shape (doc in `architecture.md`, implement in
      `data/policyHoldings.js`)
- [x] Author holdings for the 3 hero personas + a sample of holdout customers
- [x] Wire `protectionGap` calc in `agents/intelligence.js` to use real holdings instead of the
      flat `estimatedProtectionNeed − protectionCover` placeholder
- [x] Vitest: holdings sum matches expected protection gap per hero
- [x] Confirm `candidates` in `data/customer_profiles.js` is documented as "recommendable, not
      held" so future contributors don't re-conflate the two

### Workstream 5.4 — Credit profile dataset
- [x] Define `CreditProfile` shape (doc in `architecture.md`, implement in
      `data/creditProfile.js`, generated like `data/holdout.js` — seeded, deterministic)
- [x] Author credit profiles for 3 heroes + holdout set
- [x] Vitest: shape validation + deterministic regeneration (same seed → same output)
- [x] Do **not** wire this into transaction-derived features — keep it a separate join

### Workstream 2 — Generalized detection engine (= Wow gap #1)
- [x] Replace `if(scenario.id==="new-parent")` branching in `agents/intelligence.js` with a
      feature-scoring function that does not know the expected event type in advance
- [x] Rename current implementation to `legacyDetectLifeEvent()` rather than deleting it — needed
      for Wow gap #6's before/after demo
- [x] Score all 8+ event templates (from `data/holdout.js` `EVENT_TYPES`) for any customer, return
      ranked candidates + evidence, not a single forced match
- [x] Add `scoreWeight` per evidence item (Wow gap #5, `architecture.md` §5.4) so the breakdown UI
      has something to render — no new scoring logic, just stop discarding the local `score +=`
      values
- [x] Run detector against `data/holdout.js` (24 labelled customers) — report precision/recall,
      not vibes
- [x] (Optional, high-depth) Add LLM hypothesis-proposal step per the provider-adapter design in
      `architecture.md` §5 — gated by `LLM_DETECT=on`; model proposes candidates with cited txn ids,
      local scorer still owns the confidence number. Off by default.
- [x] Vitest: confidence still >0.7 for the 3 heroes (regression), plus new tests against holdout
      ground truth

### Wow gap #2 — Holdout evaluation surfaced in-app
- [x] `GET /api/eval/holdout-detection` (`architecture.md` §6.4) — precision/recall per event type
- [x] Small UI panel (RM side, e.g. `/today` or a dedicated `/eval` view) showing the number live —
      do not leave this curl-only, it's the single strongest credibility signal in the whole demo

### Wow gap #3 — Live/ad-hoc detection demo
- [x] `POST /api/detect/adhoc` (`architecture.md` §5.5) — classify → derive features → detect,
      no persona/eligibility required
- [x] Minimal UI: paste or upload a small transaction CSV/JSON, see detection run live
- [x] Input guard: row cap, date format check, graceful empty-state if no event scores >0
- [x] Gap D (`architecture.md` §12.4): request body size cap, malformed-row rejection before
      regex classification, confirm the endpoint never persists anything

### Demo-day operational readiness (gaps A/B/C — do once gap #1 is stable)
- [x] Gap A: `POST /api/demo/reset` clearing `sharedPlans`, Future You `sessionMemory`, avatar
      coin/mission state (`architecture.md` §12.1)
- [x] Gap B: `PORT` override documented in README; install path is `npm install && npm run dev`
      (did not `rm -rf node_modules` on this machine — live demo servers). Re-run on the actual
      demo laptop the morning of.
- [x] Gap C: fallback path confirmed with `OPENAI_API_KEY` unset — UI label **VERIFIED FALLBACK**,
      Future You `source: cached-demo`
- [x] Walk through `DEMO.md` §1 pre-demo checklist and §3 regression checklist via API smoke
      (`npm test` + curl on a non-3000 port). Click-through on the demo machine still required.

### Wow gap #6 — Before/after comparison for the pitch
- [x] `GET /api/detect/legacy-vs-generalized/:id` (`architecture.md` §5.6) — runs both detectors
      against the same holdout customer
- [x] Simple toggle/side-by-side in UI: legacy (blank/wrong on non-hero id) vs generalized (ranked
      evidence) — this is a demo-narrative feature, keep it small

### Workstream 3 — Explainable LLM outputs
- [x] Add evidence citation ids to `agents/intelligence.js` narrator output (map prose claims to
      specific transaction ids)
- [x] Refactor `agents/future_you.js` so every sentence resolves to a `traceability` entry, not a
      freeform answer with a bolted-on payload
- [x] Add guardrail test: LLM narrator output never introduces a product/number not present in
      `eligibleProducts` / projection input

### Workstream 4 — UX pass
- [x] RM: rank `/today` triage by confidence × eligible value
- [x] RM: surface confidence math breakdown (evidence → weight → contribution) in evidence dialog
- [x] Customer: audit feature surface, consider gating cosmetics behind an "advanced/fun mode"
      toggle so the projection + product-toggle interaction is above the fold
- [x] Run a first-time-user pass on both sides, log top confusion points, fix before adding more
      — confusion: Canvas/Life Game looked like the product; Fun mode now gates it. Holdout
      customers 404'd on `/api/scenarios`; Client/Goal Plan now fall back to `/goal-plan`.
      Fake +14% conversion on Today was the loudest lie; replaced with queued-handoff count.
      Persistence: in-memory `Map`, dies on restart, cleared by `/api/demo/reset`.
- [x] Second UX pass — `/today` reordered so priority customers lead (was: raw JSON detector
      lab above the fold, ahead of the actual customer list). Holdout eval + adhoc/before-after
      moved to a de-emphasized "Detector diagnostics" section, adhoc lab collapsed behind
      `<details>`. Fixed hardcoded "Amira" leaking into Life Game / Future Canvas headers and
      captions regardless of which customer was selected in Goal Plan (`activeTwinFirstName()`).
      Goal Plan chat: sample chips collapse once a conversation starts (was permanently shown,
      competing with the follow-up box for the same job).
- [x] Third UX pass — full IA rework (proposal + shipped-status originally tracked in
      `improvement.md`, since deleted — this checklist plus `README.md` "Recent changes" are now
      the record). Summary: split nav into RM (`/today`, `/customers`), Customer (`/future`), and
      a new
      **Developer** mode (`/developer`) that now owns holdout eval, live detector lab, a session
      activity log (`agents/sharedPlans.js` `getDemoLog()`), and a system-status panel
      (`GET /api/health` → `detectLlmOn`/`provider`/`model`). `/today` is now 4 sections only.
      Client view: added an "email a playable link" empty-state banner when a customer has no
      shared plan on file (`checkTwinEngagement`), replacing a silent no-signal state. Goal Plan:
      added a 3rd lever (one-off lump sum, goal-type-labelled), a deterministic mood chip
      (`moodFor`), and a lever-suggestion feature (`agents/leverSuggest.js` + `POST
      /api/customers/:id/lever-suggest`) — model proposes 2–3 lever combinations, every value is
      clamped server-side regardless of model output, and the deterministic engine scores each
      candidate before it's shown; falls back to 3 deterministic candidates with no LLM key.
- [x] Post-IA-rework gap sweep — fixed a real bug (`enrichGoalCopy`'s
      narration-guard allowlist was missing the new lever amounts, so a truthful LLM restatement
      of a lever value would get wrongly flagged as "invented"); added `agents/projection.test.js`
      and `agents/narrationGuard.test.js` (the two files the determinism/compliance claims rest on
      had zero tests before this); removed the unused `zod` dependency; unified the unicode-glyph
      icons on trust-critical CTAs and per-product icons to stroke-SVG consistent with the
      sidebar nav.

### Workstream 5 — SC product grounding
- [x] `data/productCatalog.js` (`Product` shape from `architecture.md` §4)
- [x] Replace synthetic `checks` guardrails in `data/customer_profiles.js` with rules mirroring
      real stated eligibility criteria where publicly available
- [x] Live scrape of SC public product pages — **declined** (legal/compliance). Catalog is
      in-repo public names only; `GET /api/products` returns `{ scraped: false }`
- [x] Legal/compliance check on scraped content — N/A, no scrape

### Workstream 6 — End-to-end loop + real metrics
- [x] Confirm detection → evidence → customer projection → consented handoff loop works for a
      holdout (non-hero) customer, not just the 3 heroes
- [x] Replace static impact-strip HTML with either (a) explicit "target" framing or (b) real
      instrumentation (log detection fired, brief opened, plan shared, meeting booked) feeding a
      real numbers view
- [x] Decide persistence story for shared plans (currently in-memory `Map`, lost on restart)

### Customer 360 — remaining domains
- [x] `data/identity.js` — synthetic identity records for hero + holdout customers
- [x] Derived-profile module: `spendPower`, `spendMix` vs benchmark, `lifestyleTags`,
      `hobbiesGoals` — pure functions over already-classified transactions, no new raw data needed
- [x] Decide + document the spend benchmark source (published guidance vs internal percentile) —
      do not ship an unlabelled hardcoded "recommended %"

### Digital Life Twin generalization (= Wow gap #4)
- [x] Generalize `agents/projection.js` to accept any customer + arbitrary goal
      object, not just the 3 hero cashflows (rebuild any needed life-plan knobs in Express;
      do not restore `src/`)
- [x] Wire Avatar Studio / missions achievement triggers to real projection thresholds instead of
      independent game state
- [x] Vitest: achievement fires only when underlying deterministic condition is true
- [x] Plain-language twin: `POST /api/customers/:id/intent` + Goal Plan chat (“I am going to be…”)

### Out of scope — will not ship in this demo
- [x] 12–24 month ledgers — skipped; 6 months is the holdout window; extending would retune P/R
- [x] Location/device signals — not scheduled; same isolation as wearables (never imported by
      intelligence or projection)
- [x] `RMProfile` + specialty-matching — v2 backlog, not the core loop
- [x] Live SC product scrape / Gemini / Anthropic SDKs / restoring `src/`

No remaining in-scope checklist items. Pitch runbook: `DEMO.md`. How: `architecture.md`.

## 11. Handoff — TODO for the next developer

Nothing below is broken or blocking; the app runs fully on deterministic fallback with no key.
This is what's genuinely left, in rough priority order:

1. **Connect a real LLM.** Everything currently runs on deterministic fallback
   (`aiConnected: false` — check `GET /api/health`, visible in the Developer tab's system-status
   panel). Copy `.env.example` → `.env`, set `OPENAI_API_KEY` (or `LLM_API_KEY`) +
   `LLM_MODEL`. Optionally set `LLM_DETECT=on` to turn on the hypothesis-assist detection path
   (`agents/llmHypothesis.js`) — the local scorer still owns confidence either way, so this is
   safe to flip without touching detection logic. Narration (RM brief, goal-plan copy, Future You
   chat, lever suggestions) all go live automatically once a key is present; nothing else to wire.
2. ~~Test coverage gaps.~~ **Done.** `agents/achievements.js`, `cashflow.js`, `derivedProfile.js`,
   `features.js`, `future_you.js`, `llmProvider.js`, `sharedPlans.js` all now have `.test.js`
   (116 tests total, up from 67). Caught and fixed one real bug along the way:
   `buildDerivedProfile` threw on a missing `features` object (no default) — now defaults to `{}`.
3. ~~Unbounded in-memory state.~~ **Done.** `future_you.js`'s `sessionMemory` Map now caps at 500
   sessions (LRU eviction); `agents/sharedPlans.js`'s `plans` Map caps at 200 (FIFO eviction); its
   `log` array was already capped at 40. All three still fully clear on `POST /api/demo/reset` or
   process restart — this just bounds growth in between for a long-running unattended process.
4. **Everything in §10 "Out of scope"** is a deliberate v2 backlog, not a gap: live SC product
   scrape, 12–24 month ledgers, location/device signals, RM specialty matching, Gemini/Anthropic
   adapters. Don't re-open these without an explicit ask — they were cut for hackathon
   score-per-hour reasons, not because they're hard.
5. **Cosmetic, optional:** the Life Game / Future Canvas still use playful unicode glyphs (✦ ◇ ♧
   ⌂) for world/room decoration. Left intentionally (see Workstream 4) — the RM/Client trust UI
   (buttons, product icons) already moved to SVG. Only revisit if the game's visual direction
   changes.