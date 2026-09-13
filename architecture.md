# LifeLens — Technical Architecture

Companion to `objective.md`. This doc is *how*; that doc is *why/what*. Update both together when
a workstream lands.

## 0. Architecture layers at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. DATA LAYER                                                           │
│    identity.js*  transactionSchema.js  policyHoldings.js*               │
│    creditProfile.js*  productCatalog.js*  (behavior signals — deferred) │
│    ── raw records only. no derived numbers, no LLM. ──                 │
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. CLASSIFICATION LAYER                                                 │
│    classifyMerchant.js → category (catalog → keyword → MCC → fallback)  │
│    ── merchant strings in, categories out. no author-supplied labels. ──│
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. FEATURE LAYER (deterministic, pure functions)                        │
│    deriveFeatures() → spendPower, spendMix, protectionGap,              │
│    lifestyleTags, hobbiesGoals, payroll gaps, category growth           │
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. DETECTION LAYER  (Workstream 2 + Wow gaps #1 #2 #3 #5 #6)             │
│    detector.js*: scores ALL event templates, unconditionally            │
│    optional LLM hypothesis step (§6.3) → still scored locally           │
│    ── outputs: ranked events + evidence + confidence + citations ──     │
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. PLANNING LAYER (deterministic)                                       │
│    projection.js (generalized) — goal → trajectory                       │
│    eligibility rules — filters products BEFORE any LLM call             │
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. NARRATION LAYER (LLM, schema-constrained, cites layer 4/5 output)     │
│    llmProvider.js* (OpenAI/Gemini/Anthropic) — RM brief, goal-plan copy, │
│    Future You chat — never computes a number, only explains one         │
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. EXPERIENCE LAYER                                                     │
│    RM: Client 360 + evidence dialog + confidence breakdown (Wow #5)     │
│    Customer: Digital Twin goal planner + Avatar/missions (real triggers)│
│    Demo-only: live upload/paste (Wow #3), before/after toggle (Wow #6)  │
└─────────────────────────────────────────────────────────────────────────┘

*  = planned, not yet built. Everything else already exists in agents/ or data/.
```

Read top to bottom = request flow. Read bottom to top = "what does this number trace back to,"
which is the question every UI element in this app must be able to answer.

## 1. Stack decision

- **Canonical, running app**: Express + vanilla SPA. `server.js` + `public/` + `agents/` +
  `data/`. `npm run dev` → port 3000 (or `PORT=<n>` if occupied).
- **Retired**: the incomplete Next.js port (`src/`), Playwright (`e2e/`, `playwright.config.ts`)
  were deleted. They never ran as the demo and would have been committed as dead weight. Domain
  logic that lived only there (`lifePlan.ts`, etc.) will be rebuilt in Express when Wow gap #4
  starts — do not resurrect `src/`.
- **Test runner**: `vitest`, scoped to `data/**/*.test.js` and `agents/**/*.test.js` via
  `vitest.config.js`.

## 2. Module layout (current + planned)

```
data/
  transactionSchema.js     existing — statement-line schema, running balances
  sgBankingConventions.js  existing — SG channel/account conventions
  sgMerchants.js           existing — merchant catalog + MCC → category
  classifyMerchant.js      existing — merchant/MCC → category classifier
  ledger.js                existing — buildLedger(rawTxs) = classify + normalize + balances
  heroLedgers.js           existing — Amira / Daniel / Priya, 6mo, multi-account
  ledgerFactory.js         existing — seeded synthetic customer + event overlay generator
  holdout.js               existing — 24 labelled unseen customers, 8 event types + negatives
  customer_profiles.js     existing — hero personas + candidates (⚠ see §3.3 split)
  scenarios.js             existing — cashflow inputs for projection engine

  policyHoldings.js        planned — PolicyHolding records (§3.3)
  creditProfile.js         planned — synthetic bureau-style profile (§3.4)
  identity.js              planned — synthetic identity records (§3.1)
  productCatalog.js        planned — SC product content dataset (§4)

agents/
  intelligence.js          existing — deriveFeatures + detectLifeEvent (⚠ branch logic, §5)
                            + rankEligibleProducts + OpenAI narrator + deterministic fallback
  future_you.js            existing — Future You chat, OpenAI + golden-answer fallback
  projection.js            existing — deterministic 12-month cashflow engine

  llmProvider.js           planned — provider adapter (OpenAI / Gemini / Anthropic), §6
  detector.js              planned — generalized, non-branching detection engine, §5

server.js                  existing — Express routes (see §7 for current + planned surface)
public/                    existing — RM dashboard + customer game SPA (app.js, index.html)
```

## 3. Data model

### 3.1 Identity (planned)
```ts
Customer {
  id: string
  fullName: string
  dob: string            // ISO date, synthetic
  idMasked: string        // never a real-looking NRIC format
  nationality: string
  contact: { phone, email, address, residencyStatus }
  kyc: { onboardedDate, segment }
  consent: {              // per-domain, not one blanket flag
    marketing: boolean
    dataSharing: boolean
    biometric: boolean
  }
}
```

### 3.2 Transactions (existing — see `data/transactionSchema.js`)
```ts
StatementLine {
  postDate, valueDate: string   // YYYY-MM-DD
  merchantRaw: string            // unstructured, noisy, as-posted
  mcc: string | null
  channel: "card"|"fast"|"giro"|"atm"|"cheque"|"paynow"|"internal"
  direction: "credit"|"debit"
  amount: number                 // absolute, sign carried by direction
  currency: "SGD"
  accountId, accountName: string
}
// after classifyMerchant.js + ledger.js:
Transaction extends StatementLine {
  id: string
  runningBalance: number
  category: string               // assigned post-hoc, never author-supplied
  classification: { category, method, catalogId, confidence }
  date, description, amount (signed)   // UI-compat aliases
}
```
Classification pipeline: `classifyMerchant(merchantRaw, mcc)` tries catalog match → keyword regex
→ MCC lookup → `"uncategorized"` fallback. `buildLedger()` = classify → normalize → attach
per-account running balances, sorted by date.

`ledgerFactory.js` generates unseen synthetic customers: baseline SG cashflow (payroll, housing,
utilities, groceries, transport, dining) + an event overlay (`new-parent`, `job-loss`, `wedding`,
`home-purchase`, `retirement`, `business-owner`, `medical`, `relocation`, `none`) + statement noise
(duplicate/reversed card auths, occasional ATM withdrawal, internal transfers, joint-account
co-mingling). Seeded via `mulberry32(seed)` — deterministic, reproducible.

`holdout.js` wraps 24 such customers with `groundTruth: { type, label, onsetMonth }`, exposed via
`GET /api/holdout` (summary) and `GET /api/ledgers/:id` (full statement, hero or holdout id).

**Planned extension:** grow hero + holdout ledgers from 6 to 12–24 months — current window is too
short for seasonality-based life-stage signals.

### 3.3 Products & policies held (planned — split from `candidates`)

⚠ **Current state:** `data/customer_profiles.js`'s `candidates` array is *recommendable* products
only (`{name, type, annualValue, baseFit, reason, impact, monthlyImpact, checks}`), not what the
customer already owns. There is currently no "holdings" concept — `protectionGap` is computed from
a flat `baseline.estimatedProtectionNeed − baseline.protectionCover`, not from real policy records.

```ts
PolicyHolding {
  id, customerId, productCode: string
  category: "insurance"|"investment"|"deposit"|"credit"|"loan"
  status: "active"|"lapsed"|"matured"
  startDate: string
  premiumOrContribution?: number
  sumAssuredOrAUM?: number
  outstandingBalance?: number     // loans
  tenorMonths?: number            // loans
}
```
`protectionGap = estimatedNeed − sum(holdings.filter(h => h.category==="insurance" && h.status==="active").map(h => h.sumAssuredOrAUM))`
— replaces the flat placeholder once this ships.

### 3.4 Credit profile (planned — standalone, not derived)

⚠ **Design constraint:** do not compute this from the transaction ledger. Real bureau data isn't
observable from statement lines, and deriving it would silently blur provenance for every claim
downstream of it.

```ts
CreditProfile {
  customerId: string
  bureauScore: number
  scoreBand: "excellent"|"good"|"fair"|"poor"
  utilizationRatio: number
  delinquencies90d: number
  activeInquiries6m: number
  totalUnsecuredDebt: number
  totalSecuredDebt: number
}
```
Generated the same way as `holdout.js`: seeded, deterministic, explicitly labelled synthetic.
Joined against `Customer`/`PolicyHolding` at query time — never merged into the transaction
classifier.

### 3.5 Behavioral / device / location signals (deferred)

Not building yet — see `objective.md` §5.5 for the reasoning. If revisited: separate module,
explicitly `source: "demo-*"` tagged, never imported by `agents/intelligence.js` eligibility
or `agents/projection.js` cashflow math.

### 3.6 Derived profile (computed, not persisted)

Pure functions over 3.1–3.4 (never a stored table — always recomputed so provenance is traceable
to source records):

```ts
DerivedProfile {
  lifeStage: { label, confidence, evidence[] }   // output of detector, §5
  spendPower: { monthlySurplus, savingsRate, spendToIncomeRatio }
  spendMix: { [category]: { actualPct, recommendedPct, delta } }
  protectionGap: number                           // from §3.3
  lifestyleTags: string[]                          // from category-mix clustering
  hobbiesGoals: string[]                           // merchant clusters + stated goals
}
```

⚠ **Benchmark source constraint:** `recommendedPct` per category must cite its source (published
guidance vs. computed percentile across the 148-customer book). Never ship an unlabelled hardcoded
number here — that's the exact failure mode the eval flagged for the old impact-metrics strip.

## 4. Product catalog (planned)

```ts
Product {
  code, name: string
  category: "savings"|"insurance"|"investment"|"credit"|"mortgage"
  publicEligibility: { minIncome?, minAge?, riskProfile?, employmentType? }
  description: string
  keyFeatures: string[]
  indicativeReturnOrRate?: number
  complianceFlags: { requiresAdvisorSuitability, isInsurance, isInvestment: boolean }
}
```
Pure content dataset, populated from Workstream 5 (public SC product pages). No customer data.
`rankEligibleProducts()` (in `agents/intelligence.js`, or its successor) joins this against
`Customer` + `DerivedProfile`, replacing the currently-synthetic `checks` guardrail keys
(`contactConsent`, `positiveSurplus`, `mortgageHolder`, `balancedRisk`, `growthRisk`) with rules
mirroring real published eligibility criteria where available.

## 5. Detection engine (Workstream 2 — the core rewrite)

**Current implementation** (`agents/intelligence.js`):
```js
function detectLifeEvent(profile, scenario, f) {
  if (scenario.id === "new-parent") { /* score only new-parent signals */ }
  if (scenario.id === "job-loss")   { /* score only job-loss signals */ }
  if (scenario.id === "wedding")    { /* score only wedding signals */ }
  return { type: scenario.event.type, ... };  // caller already knows the answer
}
```
This only works because the caller (`buildCustomerIntelligence(profile, scenario)`) already passes
in the expected `scenario.event.type` — the function confirms a hypothesis it's handed, it doesn't
form one.

**Target design:**
```js
function detectLifeEvents(features, profile) {
  // score ALL known event templates against the same feature set, unconditionally
  const candidates = EVENT_TEMPLATES.map(t => scoreTemplate(t, features, profile));
  return {
    primary: candidates.sort((a,b) => b.confidence - a.confidence)[0],
    alternatives: candidates.slice(1),
  };
}
```
`EVENT_TEMPLATES` covers the 8 types already defined in `data/holdout.js` `EVENT_TYPES`
(`new-parent`, `job-loss`, `wedding`, `home-purchase`, `retirement`, `business-owner`, `medical`,
`relocation`), each with its own weighted evidence rules (same style as today's per-scenario `if`
blocks, just not gated by a caller-supplied id).

**Evaluation harness:** run `detectLifeEvents()` over every row in `data/holdout.js` and compare
`primary.type` to `groundTruth.type` — report precision/recall per event type, not "it feels
right." This is the number that answers the eval's core question.

## 6. LLM integration architecture

### 6.1 Provider adapter (planned — `agents/llmProvider.js`)

Today `OPENAI_API_KEY`/`OPENAI_MODEL` are hardcoded independently in `agents/intelligence.js` and
`agents/future_you.js`. Replace with one adapter:

```js
// agents/llmProvider.js
export function getLlmClient() {
  const provider = process.env.LLM_PROVIDER || "openai";
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  switch (provider) {
    case "gemini":    return buildGeminiClient(apiKey);
    case "anthropic": return buildAnthropicClient(apiKey);
    default:          return buildOpenAiClient(apiKey);
  }
}
```
| Env var | Purpose |
|---|---|
| `LLM_PROVIDER` | `openai` \| `gemini` \| `anthropic` |
| `LLM_API_KEY` | vendor key |
| `LLM_MODEL` | e.g. `gpt-4.1-mini`, `gemini-2.5-flash`, `claude-sonnet-4` |
| `LLM_DETECT` | `on`/`off` — gate for the optional hypothesis step below |

Both `intelligence.js` and `future_you.js` switch to `getLlmClient()` instead of instantiating
`OpenAI` directly. Fallback path (no key / error → deterministic copy) is unchanged.

### 6.2 Contract — what the LLM is allowed to return, everywhere it's used

| Call site | Input | Allowed output (schema-constrained) | Forbidden |
|---|---|---|---|
| Detection hypothesis (optional, §6.3) | classified txns (~40 lines) | `{ hypotheses: [{type, why, txnIds}], merchantHints }` | confidence number, product names, invented txns |
| RM brief narrator (exists) | detected event + eligible products | `executiveSummary, conversationOpener, discoveryQuestions, productNarratives` | new products, prices, eligibility overrides |
| Goal-plan copy (planned, Digital Twin) | goal + projection output | plain-language explanation, lever suggestions | the projection numbers themselves |
| Future You chat (exists) | projection facts | grounded conversational answer | balances/products not in the projection |

Rule: **numbers come from deterministic code; prose comes from the LLM and must cite the numbers
it references.** Every LLM call site has a deterministic fallback that fires on missing key or API
error — the demo never depends on a live key.

### 6.3 Optional: LLM-assisted detection for unseen merchants

Rather than the LLM guessing the event *and* its confidence (which is unauditable), the LLM is a
**merchant/hypothesis helper** feeding the *same* deterministic scorer from §5:

```
classified txns → LLM proposes hypotheses (cited txn ids, no confidence) →
   local scorer checks: does the evidence actually support this? →
   if features don't back it up, hypothesis is dropped →
   final confidence always computed locally
```
Useful specifically for merchants `classifyMerchant()` falls back to `"uncategorized"` on — the
LLM can suggest a category with a citation, subject to the same scorer validation, rather than the
detector silently ignoring unknown spend.

### 5.4 Confidence breakdown (Wow gap #5 — score must be explainable, not just displayed)

`detectLifeEvents()`'s evidence items today (see the existing `e(label, value, source,
confidence)` helper) carry a per-item *evidence confidence*, but not the *score contribution* that
item added to the final number. Extend the evidence shape:

```ts
EvidenceItem {
  label, value, source: string
  confidence: number        // existing — how sure we are this evidence is real
  scoreWeight: number       // new — how many points this item added to the total
}
```
`sum(evidence.scoreWeight) === event.confidence` (capped). The evidence dialog (existing, RM side)
renders this as a bar breakdown: "Recurring childcare +48% · Baby-category acceleration +28% ·
Profile update +15% = 91%." No new data needed — this is a shape change on data the detector
already computes internally as local variables (`score += .48` etc.) but currently discards.

### 5.5 Ad-hoc / live detection (Wow gap #3 — prove it's not hardcoded, live)

New entry point that skips Customer 360 entirely and proves the detection layer is decoupled from
demo-authored personas:

```
POST /api/detect/adhoc
body: { transactions: [{ postDate, merchantRaw, amount, mcc? }, ...] }
→ classifyMerchant() each row → deriveFeatures() → detectLifeEvents() → same evidence shape as §5.4
```
No persona, no product ranking (no consent/risk-profile fields to check eligibility against) —
just classification → features → detection → evidence. This is intentionally the smallest possible
slice of the pipeline, which is what makes it safe to expose for a live judge-pasted CSV without
touching any other domain.

### 5.6 Before/after comparison mode (Wow gap #6 — demo narrative)

Keep the current `if(scenario.id===...)` implementation as `legacyDetectLifeEvent()` (renamed, not
deleted) purely as a demo reference point once §5's generalized `detectLifeEvents()` ships. A demo
toggle runs both against the same holdout customer and shows: legacy returns nothing/wrong for a
non-hero id, generalized returns ranked evidence. This turns the architecture diff itself into the
pitch's strongest 30 seconds.

### 6.4 Holdout evaluation surfaced in-app (Wow gap #2)

`GET /api/eval/holdout-detection` (already listed in §7) computes precision/recall per event type
by running `detectLifeEvents()` over every `data/holdout.js` row. This must be **visible in the UI**,
not just curlable — a small panel showing "detector: 91% precision / 88% recall across 24 unseen
customers, 8 event types" is the single most credible answer to "prove this isn't 3 rigged demos."

## 7. API surface

### Existing
| Route | Purpose |
|---|---|
| `GET /api/health` | health + `aiConnected` flag |
| `GET /api/scenarios`, `/api/scenarios/:id` | hero scenario list / branching projection |
| `POST /api/project` | custom action list vs ignored branch |
| `GET /api/intelligence/:id` | full RM intelligence pipeline (detect → eligibility → LLM/fallback) |
| `POST /api/future-you` | Future You Q&A on a projection branch |
| `GET /api/holdout` | labelled holdout summary (Workstream 1) |
| `GET /api/ledgers/:id` | full statement, hero or holdout id (Workstream 1) |

### Planned
| Route | Purpose |
|---|---|
| `GET /api/customers/:id/profile` | full Customer 360 (identity + holdings + credit + derived) |
| `GET /api/customers/:id/detect` | generalized detector (§5) output for any customer, not just heroes |
| `GET /api/products` | product catalog (§4) |
| `POST /api/customers/:id/goal-plan` | goal input → deterministic trajectory + levers (Wow gap #4) |
| `GET /api/eval/holdout-detection` | precision/recall report vs `data/holdout.js` ground truth (Wow gap #2) |
| `POST /api/detect/adhoc` | live/pasted transactions → detection, no persona needed (Wow gap #3, §5.5) |
| `GET /api/detect/legacy-vs-generalized/:id` | side-by-side old vs new detector output for demo (Wow gap #6, §5.6) |
| `POST /api/demo/reset` | clears in-memory state (`sharedPlans`, Future You session memory, avatar coins) between rehearsal/live runs (§12.1) |

## 8. Compliance boundaries (enforced in code, not just docs)

- `agents/projection.js` and the planned goal-plan engine: pure arithmetic, no LLM call anywhere in
  the call path.
- `rankEligibleProducts()`: runs and filters **before** any LLM call — the LLM only ever sees
  already-eligible products, never decides eligibility.
- Health/wearable/(future) location modules: separate files, separate API responses, never
  imported by `agents/intelligence.js` or `agents/projection.js`. This is a lint-able boundary —
  consider an import-restriction rule once these modules exist. (The old Next.js isolation lived
  in `src/lib/domain/biometrics.ts`; that file was retired with `src/`.)
- Achievement/mission triggers (planned generalization): read from the same deterministic
  projection/derived-profile output the UI displays, not from independent game state.

## 9. Testing strategy

- `vitest`, scoped to `data/**/*.test.js` and `agents/**/*.test.js`.
- Every new dataset module (`policyHoldings.js`, `creditProfile.js`, `identity.js`,
  `productCatalog.js`) ships with a `.test.js` validating shape + deterministic regeneration (same
  seed → same output), following the existing `ledgerFactory.test.js` / `holdout.test.js` pattern.
- Detection engine rewrite ships with a holdout evaluation test (§5) reporting precision/recall,
  not just "the 3 heroes still pass."
- Regression guard: hero confidence scores must stay >0.7 after any detector change
  (`agents/intelligence.test.js` already encodes this).

## 10. Open technical decisions

1. LLM provider for the hypothesis step (§6.3) — OpenAI (already wired) vs Gemini vs Anthropic.
   Adapter design (§6.1) makes this a config change, not an architecture change, once built.
2. Spend benchmark source (§3.6) — published guidance vs. book-derived percentile. Blocks
   `spendMix.recommendedPct` from shipping honestly.
3. Persistence for shared plans — currently in-memory (Future You session Map in
   `agents/future_you.js`, avatar/game state in `public/app.js`). Fine for demo, not for a real
   pilot. `POST /api/demo/reset` (§12.1) is the demo-day workaround.
4. **Closed:** Next.js port retired (deleted `src/`, `e2e/`, Playwright). Do not re-add.
5. How much input validation `POST /api/detect/adhoc` (§5.5) needs for a live judge-facing demo —
   see §12.4 for the concrete guards (row cap, size cap, regex-safety, no auth needed but no
   persistence either).
6. **Closed:** no `DETECTOR=legacy|generalized` env flag. Rollback is git (`checkpoint-ws1` tag
   below), plus keeping `legacyDetectLifeEvent()` in-process for Wow gap #6's before/after demo.
   An env flag would add a second code path to keep in sync for a one-week hackathon.

## 11. Build order for the 6 hackathon "wow" gaps

Sequenced so each step is demoable on its own — do not treat this as an all-or-nothing rewrite.

1. §5 generalized `detectLifeEvents()` — replaces branch logic, still returns today's evidence
   shape. Regression: heroes stay >0.7 confidence (existing test).
2. §5.4 add `scoreWeight` to evidence items — small shape change, unlocks the breakdown UI (gap #5)
   without touching the detector's scoring logic itself.
3. §6.4 `GET /api/eval/holdout-detection` + a small results panel — this is the credibility number,
   ship it as soon as #1 exists so you have it early in case time runs out on the rest.
4. §5.5 `POST /api/detect/adhoc` — reuses #1 and #2 directly, no new detection code.
5. §5.6 before/after toggle — reuses #1 (new) against the renamed `legacyDetectLifeEvent` (old),
   pure UI/demo wiring once both exist.
6. Digital Twin goal-plan generalization (`objective.md` §8, Wow gap #4) — independent of 1–5,
   can be built in parallel if a second person/session is available.

**Git checkpoints (do this, not an env-flag rollback):** tag or commit *before* each rewrite that
touches `agents/intelligence.js` or `data/customer_profiles.js`:

1. Before WS2 detector rewrite → tag `checkpoint-ws1` (this commit).
2. Before Digital Twin / goal-plan generalization → tag `checkpoint-pre-twin`.
3. Before `POST /api/detect/adhoc` goes live → tag `checkpoint-pre-adhoc`.

If the generalized detector comes in weaker than the 3-hero baseline, `git revert` / reset to
`checkpoint-ws1` instead of shipping a half-broken scorer. The old branch-logic function is kept
as `legacyDetectLifeEvent()` only so Wow gap #6 can show before/after — it is not a runtime
fallback for the live demo.

**Sequencing risk if parallelized:** items 1 (this list), Workstream 5.3 (`policyHoldings.js` →
real `protectionGap`), and item 6 above all touch `agents/intelligence.js` and/or
`data/customer_profiles.js`. Running them as simultaneous parallel Cursor sessions risks merge
conflicts on the same files. Do WS2 (detector rewrite) first and land it before starting WS5.3 or
gap #4 in a separate session — both of those are additive once the detector is generalized, not
before.

## 12. Demo-day operational readiness

Engineering-correct is not the same as demo-safe. These four items are about the 10 minutes before
and during the pitch, not the architecture itself — but they belong here because each one has a
concrete technical fix.

### 12.1 In-memory state reset

`sharedPlans` (when it exists on the Express side), `future_you.js`'s
`sessionMemory` Map, and the Express game's avatar-coin/mission state are all process-lifetime
in-memory stores with no reset path. Run the demo once in rehearsal and once live without
restarting the process, and a judge can see a leftover Future You conversation or a coin
balance that doesn't match the story being told.

**Fix:** add `POST /api/demo/reset` (§7) that clears all three stores. Call it (or restart the
process) immediately before every live run, not just once at the start of the day.

### 12.2 Fresh-clone sanity check

Nothing currently verifies `git clone` → `npm install` → `npm run dev` works with zero manual
steps on a machine that isn't yours. Known current friction: port 3000 may already be occupied
(happened in this session — required `PORT=3011`), and `.env` is gitignored so a fresh clone has
no `OPENAI_API_KEY` unless `.env.example` is copied.

**Fix, run once before demo day and once again the morning of:**
```bash
rm -rf node_modules && npm install && npm run dev
```
on a clean checkout, ideally on whatever machine will actually run the demo. If port conflicts are
a recurring risk on the demo machine, document the `PORT=<n>` override in `README.md`'s Run section
(not just this doc).

### 12.3 Offline / no-key resilience — verify, don't assume

The deterministic-fallback code path exists (`agents/intelligence.js`, `agents/future_you.js`) but
is not currently exercised as a rehearsed demo path. Venue wifi failing mid-pitch, or an
`OPENAI_API_KEY` hitting a rate limit live, is a real failure mode.

**Fix:** rehearse the entire demo at least once with `OPENAI_API_KEY` unset. Confirm the
"deterministic fallback" / "verified fallback" UI labels read fine out loud, not just correctly in
code — if the honest fallback framing feels awkward in front of judges, fix the copy now, not live.

### 12.4 Hardening `POST /api/detect/adhoc` (Wow gap #3, §5.5)

This is the app's first unauthenticated, judge-reachable input surface. No auth is needed for a
hackathon demo, but it still needs basic guards before it's live on stage:

- Row cap (e.g. reject >500 transactions) and request body size cap.
- Date format validation before hitting `classifyMerchant`'s regex rules — reject malformed rows
  rather than letting arbitrary attacker-controlled strings run through every keyword pattern.
- No persistence: confirm this endpoint never writes to any store (it shouldn't need to — it's a
  pure classify → derive → detect pipeline per §5.5).
- Empty-state handling: if every row fails to classify or no event scores above threshold, return
  a clear "no strong signal in this data" response rather than a confusing zero/blank result live.
