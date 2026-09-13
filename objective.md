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
| Workstream 1 — realistic mock transaction data | ✅ Done — `data/transactionSchema.js`, `sgMerchants.js`, `classifyMerchant.js`, `heroLedgers.js`, `ledgerFactory.js`, `holdout.js` (24 labelled unseen customers, 8 event types + negatives) |
| Workstream 2 — generalized detection engine | 🔲 Not started — detector is still branch logic over `scenario.id` in `agents/intelligence.js` |
| Workstream 3 — explainable LLM outputs | 🔲 Partially exists (structured RM brief), needs hypothesis-step + citation IDs |
| Workstream 4 — UX pass (RM vs customer) | 🔲 Not started |
| Workstream 5 — real SC product grounding | 🔲 Not started |
| Workstream 6 — end-to-end loop + real metrics | 🔲 Partially exists (loop works for 3 heroes only) |
| Customer 360 data model expansion (this doc's new scope) | 🔲 Not started |
| Hackathon Wow Track — 6 judge-facing gaps | 🔲 Not started — see §9 below, build order in `architecture.md` §11 |
| Demo-day operational readiness — 4 items | 🔲 Not started — see §9.1 below, detail in `architecture.md` §12, script in `DEMO.md` |

## 5. Customer 360 — full dataset plan

Six data domains. Only #2 exists today (as of Workstream 1). Each new domain is a **separate
synthetic dataset**, not derived from another domain, to keep provenance honest and explainable.

### 5.1 Identity & demographics (new)
- `Customer`: id, fullName, dob, masked/synthetic NRIC, nationality, contact, KYC/segment,
  consent flags (marketing, data-sharing, biometric) — per-domain consent, not one blanket flag.
- **Risk flag:** never use a real-looking NRIC format even in demo data.

### 5.2 Transactions (done — Workstream 1)
- Statement-line shape (`postDate`, `merchantRaw`, `mcc`, `channel`, `direction`, `accountId`),
  classified post-hoc, not author-labelled.
- **Improvement to schedule:** extend hero + holdout ledgers from 6 months to 12–24 months —
  life-stage and seasonality signals need more history than currently generated.

### 5.3 Products & policies **held** (new — split out of `candidates`)
- **Risk identified:** `data/customer_profiles.js` currently conflates "products we might
  recommend" (`candidates`) with "products the customer already owns." These must be split before
  more logic (protection gap, portfolio view) builds on the conflated shape.
- New `PolicyHolding` record per customer: product code, category (insurance/investment/deposit/
  credit/loan), status, start date, premium/contribution, sum assured or AUM, outstanding balance
  (loans).
- Unlocks real `protectionGap = estimatedNeed − sum(activeInsuranceSumAssured)` instead of the
  current flat placeholder number.

### 5.4 Credit profile (new — kept separate from transactions)
- **Risk identified:** do not derive credit-bureau-style data from the transaction ledger — that's
  unrealistic (real bureau data isn't observable from statement lines) and would blur the
  provenance of every downstream claim.
- New standalone synthetic `CreditProfile` dataset (bureau score/band, utilization ratio,
  delinquencies, active inquiries, secured/unsecured debt totals), generated the same way as
  `data/holdout.js` — deterministic, seeded, labelled as synthetic.

### 5.5 Behavioral / device / location signals (new — **deprioritized, highest risk**)
- **Risk identified:** this is the most sensitive data type requested. Real device/location data
  is a PDPA/MAS exposure the rest of the app doesn't have yet.
- **Decision:** defer. If built: opt-in, labelled synthetic, never imported by intelligence or
  projection. Not scheduled until Workstreams 2–6 are solid.

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

## 6. SC Product Catalog (new, separate from customer holdings)

- `Product`: code, name, category, public eligibility criteria (from Workstream 5 site scrape),
  description, key features, compliance flags (`requiresAdvisorSuitability`, `isInsurance`,
  `isInvestment`).
- Pure content/rules dataset — no customer data lives here. `rankEligibleProducts()` joins this
  against `Customer` + `DerivedProfile`, same guardrail pattern already in place.

## 7. RM-side cross-mapping — explicitly future scope

Agreed: this is a v2+ innovation, not part of the core loop. Backlog only:
- `RMProfile` (specialties, languages, caseload, historical conversion by category)
- Matching function: dominant customer need category → RM specialty ranking.
- Do not let this block Workstreams 2–6.

## 8. Digital Life Twin — customer experience (builds on Express `agents/projection.js` +
Avatar Studio in `public/` — generalize, don't rebuild a second engine)

1. **Goal input**: `{ type, targetAmount, targetDate }` (e.g. "save for a house in 5 years").
2. **Deterministic trajectory engine**: extend the existing projection pattern to take *any*
   customer + *any* goal, not just the 3 hero personas — compute required monthly save, let the
   user drag levers (reduce category %, change goal date) and see the projection update live.
3. **LLM role**: turn the deterministic output into plain language, suggest which lever to try
   next — schema-constrained, cites the numbers, never picks them.
4. **Gamified layer (mini-town / avatar)**: reuse the existing Avatar Studio + missions economy as
   a skin over the *same* projection numbers. **Risk identified:** do not build a second parallel
   simulation — milestones/achievements must fire only when the real deterministic threshold is
   met (e.g. "6-month emergency fund" achievement fires only when `emergencyFundMonths >= 6` from
   the real calculation), or the game numbers and the real numbers will drift and undercut the
   "deterministic and inspectable" pitch that's the whole point of this project.

## 9. Hackathon Wow Track — 6 judge-facing gaps

These are the highest score-per-hour items, distinct from (and mostly *within*) Workstreams 2–6
above — flagged separately because they're what a judging panel actually notices in a live demo,
not because they're new scope. Full technical detail lives in `architecture.md` §5.4–§5.6, §6.4,
§11 (build order).

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
- [x] `npm test` green (15 tests across 5 files)

### Workstream 5.3 — Split product holdings from candidates
- [ ] Define `PolicyHolding` shape (doc in `architecture.md`, implement in
      `data/policyHoldings.js`)
- [ ] Author holdings for the 3 hero personas + a sample of holdout customers
- [ ] Wire `protectionGap` calc in `agents/intelligence.js` to use real holdings instead of the
      flat `estimatedProtectionNeed − protectionCover` placeholder
- [ ] Vitest: holdings sum matches expected protection gap per hero
- [ ] Confirm `candidates` in `data/customer_profiles.js` is documented as "recommendable, not
      held" so future contributors don't re-conflate the two

### Workstream 5.4 — Credit profile dataset
- [ ] Define `CreditProfile` shape (doc in `architecture.md`, implement in
      `data/creditProfile.js`, generated like `data/holdout.js` — seeded, deterministic)
- [ ] Author credit profiles for 3 heroes + holdout set
- [ ] Vitest: shape validation + deterministic regeneration (same seed → same output)
- [ ] Do **not** wire this into transaction-derived features — keep it a separate join

### Workstream 2 — Generalized detection engine (= Wow gap #1)
- [ ] Replace `if(scenario.id==="new-parent")` branching in `agents/intelligence.js` with a
      feature-scoring function that does not know the expected event type in advance
- [ ] Rename current implementation to `legacyDetectLifeEvent()` rather than deleting it — needed
      for Wow gap #6's before/after demo
- [ ] Score all 8+ event templates (from `data/holdout.js` `EVENT_TYPES`) for any customer, return
      ranked candidates + evidence, not a single forced match
- [ ] Add `scoreWeight` per evidence item (Wow gap #5, `architecture.md` §5.4) so the breakdown UI
      has something to render — no new scoring logic, just stop discarding the local `score +=`
      values
- [ ] Run detector against `data/holdout.js` (24 labelled customers) — report precision/recall,
      not vibes
- [ ] (Optional, high-depth) Add LLM hypothesis-proposal step per the provider-adapter design in
      `architecture.md` §5 — model proposes candidates with cited transaction ids, local scorer
      still owns the confidence number
- [ ] Vitest: confidence still >0.7 for the 3 heroes (regression), plus new tests against holdout
      ground truth

### Wow gap #2 — Holdout evaluation surfaced in-app
- [ ] `GET /api/eval/holdout-detection` (`architecture.md` §6.4) — precision/recall per event type
- [ ] Small UI panel (RM side, e.g. `/today` or a dedicated `/eval` view) showing the number live —
      do not leave this curl-only, it's the single strongest credibility signal in the whole demo

### Wow gap #3 — Live/ad-hoc detection demo
- [ ] `POST /api/detect/adhoc` (`architecture.md` §5.5) — classify → derive features → detect,
      no persona/eligibility required
- [ ] Minimal UI: paste or upload a small transaction CSV/JSON, see detection run live
- [ ] Input guard: row cap, date format check, graceful empty-state if no event scores >0
- [ ] Gap D (`architecture.md` §12.4): request body size cap, malformed-row rejection before
      regex classification, confirm the endpoint never persists anything

### Demo-day operational readiness (gaps A/B/C — do once gap #1 is stable)
- [ ] Gap A: `POST /api/demo/reset` clearing `sharedPlans`, Future You `sessionMemory`, avatar
      coin/mission state (`architecture.md` §12.1)
- [ ] Gap B: fresh-clone check — `rm -rf node_modules && npm install && npm run dev` on a clean
      checkout, ideally the actual demo machine; document any `PORT` override in `README.md`
      (`architecture.md` §12.2)
- [ ] Gap C: one full rehearsal with `OPENAI_API_KEY` unset — confirm fallback UI copy reads well
      out loud (`architecture.md` §12.3)
- [ ] Walk through `DEMO.md` §1 pre-demo checklist and §3 regression checklist end to end at least
      once before the actual pitch

### Wow gap #6 — Before/after comparison for the pitch
- [ ] `GET /api/detect/legacy-vs-generalized/:id` (`architecture.md` §5.6) — runs both detectors
      against the same holdout customer
- [ ] Simple toggle/side-by-side in UI: legacy (blank/wrong on non-hero id) vs generalized (ranked
      evidence) — this is a demo-narrative feature, keep it small

### Workstream 3 — Explainable LLM outputs
- [ ] Add evidence citation ids to `agents/intelligence.js` narrator output (map prose claims to
      specific transaction ids)
- [ ] Refactor `agents/future_you.js` so every sentence resolves to a `traceability` entry, not a
      freeform answer with a bolted-on payload
- [ ] Add guardrail test: LLM narrator output never introduces a product/number not present in
      `eligibleProducts` / projection input

### Workstream 4 — UX pass
- [ ] RM: rank `/today` triage by confidence × eligible value
- [ ] RM: surface confidence math breakdown (evidence → weight → contribution) in evidence dialog
- [ ] Customer: audit feature surface, consider gating cosmetics behind an "advanced/fun mode"
      toggle so the projection + product-toggle interaction is above the fold
- [ ] Run a first-time-user pass on both sides, log top confusion points, fix before adding more

### Workstream 5 — SC product grounding
- [ ] Scrape/collect current SC public product pages (savings, loans, insurance, wealth,
      mortgages)
- [ ] Build `data/productCatalog.js` (`Product` shape from `architecture.md` §4)
- [ ] Replace synthetic `checks` guardrails in `data/customer_profiles.js` with rules mirroring
      real stated eligibility criteria where publicly available
- [ ] Legal/compliance check on scraped content before any external-facing use

### Workstream 6 — End-to-end loop + real metrics
- [ ] Confirm detection → evidence → customer projection → consented handoff loop works for a
      holdout (non-hero) customer, not just the 3 heroes
- [ ] Replace static impact-strip HTML with either (a) explicit "target" framing or (b) real
      instrumentation (log detection fired, brief opened, plan shared, meeting booked) feeding a
      real numbers view
- [ ] Decide persistence story for shared plans (currently in-memory `Map`, lost on restart)

### Customer 360 — remaining domains
- [ ] `data/identity.js` — synthetic identity records for hero + book customers
- [ ] Extend hero + holdout ledgers to 12–24 months (currently 6)
- [ ] Derived-profile module: `spendPower`, `spendMix` vs benchmark, `lifestyleTags`,
      `hobbiesGoals` — pure functions over already-classified transactions, no new raw data needed
- [ ] Decide + document the spend benchmark source (published guidance vs internal percentile) —
      do not ship an unlabelled hardcoded "recommended %"
- [ ] Location/device signals — **explicitly not scheduled**; revisit only after everything above
      is done, and only with the same isolation pattern as the old wearable stub (never imported
      by intelligence or projection)

### Digital Life Twin generalization (= Wow gap #4)
- [ ] Generalize `agents/projection.js` to accept any customer + arbitrary goal
      object, not just the 3 hero cashflows (rebuild any needed life-plan knobs in Express;
      do not restore `src/`)
- [ ] Wire Avatar Studio / missions achievement triggers to real projection thresholds instead of
      independent game state
- [ ] Vitest: achievement fires only when underlying deterministic condition is true

### RM cross-mapping — backlog, not scheduled
- [ ] (Deferred) `RMProfile` shape + specialty-matching function — do not start until everything
      above is done

## 11. Is checklist-in-markdown the right way to track this with Cursor?

Yes, with one addition. A checklist markdown file is the right primitive because:
- It's greppable/diffable in git, unlike an agent's session-local todo list (which resets between
  chats).
- An agent can be pointed at "work through the unchecked items in `objective.md` §10 in order" and
  tick boxes as it verifies each one — that's a stable, resumable contract across sessions.

One recommendation: once this checklist gets long-lived (surviving many sessions), consider
splitting it into a separate `TASKS.md` that only contains the checklist (this doc becomes the
stable "why," `TASKS.md` becomes the churny "what's left"). Not required now — just flag it so this
file doesn't become unwieldy as items get checked off and new ones get added.
