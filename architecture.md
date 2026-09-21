# LifeLens — Technical Architecture

Companion to `objective.md`. This doc is *how*; that doc is *why/what*. Update both together when
a workstream lands.

## 0. Architecture layers at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. DATA LAYER                                                           │
│    identity.js  transactionSchema.js  policyHoldings.js               │
│    creditProfile.js  productCatalog.js  (behavior signals — deferred) │
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
│    detector.js: scores ALL event templates, unconditionally               │
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
│    llmProvider.js (OpenAI; other vendors fall back) — RM brief, goal-plan copy, │
│    Future You chat — never computes a number, only explains one         │
└──────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. EXPERIENCE LAYER                                                     │
│    RM: Client 360 + evidence dialog + confidence breakdown (Wow #5)     │
│    Customer: Digital Twin goal planner + Avatar/missions (real triggers)│
│    Developer (/developer): holdout eval, live upload/paste (Wow #3),    │
│    before/after toggle (Wow #6), session log, system status — split     │
│    out of the RM's daily /today screen, not judge-only anymore          │
└─────────────────────────────────────────────────────────────────────────┘

Out of scope (intentional, not leftover work): live SC product scrape, 12–24mo ledgers,
location/device, RM specialty matching. See `objective.md` §10 “Out of scope.”
```

Read top to bottom = request flow. Read bottom to top = "what does this number trace back to,"
which is the question every UI element in this app must be able to answer.

## 1. Stack decision

- **Canonical, running app**: Express mock API + Vite/React client. `npm run dev` starts the API
  on port 3000 and the client on 5173 (proxy `/api`). Production: `npm run build`
  then `npm start` serves `client/dist` from Express.
- **Do not resurrect Next.js `src/`**. The UI lives in `client/`, domain math stays in `agents/`.
- **Test runner**: `vitest`, scoped to `data/**`, `agents/**`, and `server/**`.

## 2. Module layout (shipped)

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

  policyHoldings.js        existing — owned policies; candidates stay recommend-only
  creditProfile.js         existing — synthetic bureau, not derived from ledger
  identity.js              existing — synthetic identity, never NRIC-shaped
  productCatalog.js        existing — public-name catalog, not a live scrape
  customerBook.js          generator for the 148-customer RM book
  seed-fixtures.js         dumps JSON under data/fixtures/ (`npm run seed`)
  fixtures/                served records: book, identities, products, ledgers, …

agents/                    unchanged — compute only; never imported by the React app
  intelligence.js, detector.js, projection.js, goalPlan.js, future_you.js, …

server/
  index.js                 listen
  app.js                   envelope + routers
  middleware/              errors, validation
  routes/                  customers, scenarios, detect, intelligence, plans, demo, products, futureYou
  store/                   fixture load + in-memory overlay + list query

client/                    Vite + React + TypeScript
  src/app                  shell + router
  src/shared/api           apiClient, Zod parsers, TanStack Query hooks
  src/features             today, customers, twin, futureYou, developer
  src/styles               SC tokens + visual system
  public/assets            brand marks served by Vite
```

## 3. Data model

### 3.1 Identity (`data/identity.js`)
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

Ledgers stay at 6 months on purpose. Extending to 12–24 months would retune holdout precision/recall
and is out of scope for this demo.

### 3.3 Products & policies held (`data/policyHoldings.js`)

⚠ **Split is live:** `candidates` = recommendable, `policyHoldings.js` = owned. `protectionGap`
is `estimatedNeed − sum(active insurance sumAssuredOrAUM)`.

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

### 3.4 Credit profile (`data/creditProfile.js` — standalone, not derived)

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

## 4. Product catalog (`data/productCatalog.js` — in-repo public names, `scraped: false`)

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
Pure content dataset. No live scrape (legal/compliance). `GET /api/products` returns
`{ scraped: false }`. `rankEligibleProducts()` joins catalog + customer + derived profile; eligibility
`checks` mirror publicly stated criteria where we have them, not a live site pull.

## 5. Detection engine (Workstream 2 — the core rewrite)

**Live implementation** (`agents/detector.js`): `detectLifeEvents(features, profile)` scores every
template in `EVENT_TYPES`. The live path does not take a `scenario.id`. `legacyDetectLifeEvent()`
is kept only for Wow #6 before/after.

**What it replaced:**
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

**Shipped:**
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

### 5.4 Confidence breakdown (Wow gap #5 — shipped)

Each evidence item carries both *how sure we are it is real* (`confidence`) and *how many points it
added* (`scoreWeight`). The RM evidence dialog renders the bar breakdown.

```ts
EvidenceItem {
  label, value, source: string
  confidence: number
  scoreWeight: number       // contribution toward event.confidence (capped)
}
```

### 5.5 Ad-hoc / live detection (Wow gap #3 — shipped)

Skips Customer 360. Proves detection is decoupled from demo-authored personas. UI: paste or
upload CSV/JSON on `/today`.

```
POST /api/detect/adhoc
body: { transactions: [{ postDate, merchantRaw, amount, mcc? }, ...] }
→ classifyMerchant() each row → deriveFeatures() → detectLifeEvents() → same evidence shape as §5.4
```
No persona, no product ranking (no consent/risk-profile fields to check eligibility against) —
just classification → features → detection → evidence. This is intentionally the smallest possible
slice of the pipeline, which is what makes it safe to expose for a live judge-pasted CSV without
touching any other domain.

### 5.6 Before/after comparison mode (Wow gap #6 — shipped)

`legacyDetectLifeEvent()` is kept only as a demo reference. `/today` runs both against the same
holdout customer: legacy returns nothing/wrong for a non-hero id, generalized returns ranked
evidence.

No `DETECTOR=` env flag. Live path is always the generalized scorer. Rollback is `git reset --hard
checkpoint-ws1`. `legacyDetectLifeEvent()` exists only for this before/after toggle.

## 6. LLM integration architecture

### 6.1 Provider adapter (`agents/llmProvider.js`)

`intelligence.js`, `future_you.js`, and goal-plan copy use `completeJson` / `completeText`.
Keys: `LLM_API_KEY` or `OPENAI_API_KEY`. `LLM_PROVIDER` other than `openai` returns no client
(demo fallback). `LLM_DETECT=on` gates the optional hypothesis step. Holdout eval never calls the LLM.

### 6.2 Contract — what the LLM is allowed to return, everywhere it's used

| Call site | Input | Allowed output (schema-constrained) | Forbidden |
|---|---|---|---|
| Detection hypothesis (optional, §6.3) | classified txns (~40 lines) | `{ hypotheses: [{type, why, txnIds}], merchantHints }` | confidence number, product names, invented txns |
| RM brief narrator (exists) | detected event + eligible products | `executiveSummary, conversationOpener, discoveryQuestions, productNarratives` | new products, prices, eligibility overrides |
| Goal-plan copy (`goalPlan.js` `narrate`) | goal + projection output | plain-language explanation, lever suggestions | the projection numbers themselves |
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

### 6.4 Holdout evaluation surfaced in-app (Wow gap #2)

`GET /api/eval/holdout-detection` (already listed in §7) computes precision/recall per event type
by running `detectLifeEvents()` over every `data/holdout.js` row. This must be **visible in the UI**,
not just curlable — a small panel showing "detector: 91% precision / 88% recall across 24 unseen
customers, 8 event types" is the single most credible answer to "prove this isn't 3 rigged demos."

## 7. API surface

Success responses are `{ data, meta? }`. Errors are `{ error: { code, message, details? } }`.

### Existing
| Route | Purpose |
|---|---|
| `GET /api/health` | health + `aiConnected`, `detectLlmOn`, `provider`, `model` |
| `GET /api/customers` | RM book from fixtures; query `q`, `status`, `segment`, `page`, `limit` |
| `GET/PATCH /api/customers/:id` | book row; overlay `status`, `lastContactDays`, `notes` |
| `GET /api/customers/:id/360` | identity + holdings + credit + derived |
| `GET /api/scenarios`, `/api/scenarios/:id` | hero scenario list / branching projection |
| `POST /api/project` | custom action list vs ignored branch |
| `GET /api/intelligence/:id` | full RM intelligence pipeline |
| `POST /api/future-you` | Future You Q&A |
| `GET /api/holdout` | labelled holdout summary |
| `GET /api/ledgers/:id` | statement from fixtures |
| `GET /api/eval/holdout-detection` | precision/recall vs holdout |
| `GET /api/detect/:id` | generalized detector |
| `POST /api/detect/adhoc` | pasted ledger → detection, never persisted |
| `GET /api/detect/legacy-vs-generalized/:id` | branch-logic vs generalized |
| `POST /api/customers/:id/intent` | life intent → goal + plan |
| `POST /api/customers/:id/goal-plan` | goal + levers → trajectory |
| `GET /api/today-triage` | ranked book; query `ids`, `limit` |
| `GET /api/products` | catalog `{ scraped: false }` |
| `POST /api/plans`, `GET /api/plans`, `DELETE /api/plans/:id` | consented shares |
| `GET /api/demo/metrics`, `POST /api/demo/event` | detections / briefs / shares / meetings |
| `GET /api/demo/log` | session activity |
| `GET/PATCH /api/demo/avatar` | overlay avatar coins/items |
| `POST /api/customers/:id/lever-suggest` | lever candidates |
| `POST /api/demo/reset` | clears session, plans, overlay, avatar |

No remaining planned routes. Gemini/Anthropic clients are not in this demo — adapter returns null.

## 8. Compliance boundaries (enforced in code, not just docs)

- `agents/projection.js` and `agents/goalPlan.js`: pure arithmetic, no LLM call anywhere in
  the call path.
- `rankEligibleProducts()`: runs and filters **before** any LLM call — the LLM only ever sees
  already-eligible products, never decides eligibility.
- Health/wearable/(future) location modules: separate files, separate API responses, never
  imported by `agents/intelligence.js` or `agents/projection.js`. This is a lint-able boundary —
  consider an import-restriction rule. `agents/completion.test.js` already forbids those strings
  in `intelligence.js` / `projection.js`. (The old Next.js isolation lived
  in `src/lib/domain/biometrics.ts`; that file was retired with `src/`.)
- Achievement/mission triggers: `evaluateAchievements()` reads the goal-plan snapshot
  (`emergencyFundMonths`, `minBalance`, `onTrack`), not independent game HUD numbers.

## 9. Testing strategy

- `vitest`, scoped to `data/**/*.test.js` and `agents/**/*.test.js`.
- Every new dataset module (`policyHoldings.js`, `creditProfile.js`, `identity.js`,
  `productCatalog.js`) ships with a `.test.js` validating shape + deterministic regeneration (same
  seed → same output), following the existing `ledgerFactory.test.js` / `holdout.test.js` pattern.
- Detection engine rewrite ships with a holdout evaluation test (§5) reporting precision/recall,
  not just "the 3 heroes still pass."
- Regression guard: hero confidence scores must stay >0.7 after any detector change
  (`agents/intelligence.test.js` already encodes this).
- The two engine guarantees the compliance story rests on are directly tested, not just implied:
  `agents/projection.test.js` (the deterministic cashflow math) and `agents/narrationGuard.test.js`
  (the LLM-never-invents-a-number check). `agents/leverSuggest.test.js` follows the same
  never-trust-raw-model-output pattern as `agents/llmHypothesis.test.js`.
- Every agent module now has coverage: `achievements.test.js`, `cashflow.test.js`,
  `derivedProfile.test.js`, `features.test.js`, `future_you.test.js`, `llmProvider.test.js`, and
  `sharedPlans.test.js` closed the last gaps (116 tests total). `llmProvider.test.js` stubs
  `process.env` per-test so provider/key gating is verified without a real network call.

## 10. Open technical decisions

None left. Closed calls:

1. **Closed:** `llmProvider.js` owns OpenAI narration. `LLM_DETECT=on` is the optional hypothesis
   gate. Gemini/Anthropic not implemented — adapter returns null.
2. **Closed:** spend benchmark is DOS Household Expenditure Survey broad-group weights, labelled in
   `derivedProfile.js` (`SPEND_BENCHMARK.source`).
3. **Closed:** shared plans persist in-process (`agents/sharedPlans.js`) and die on restart.
   `POST /api/demo/reset` is the demo-day workaround.
4. **Closed:** Next.js port retired (deleted `src/`, `e2e/`, Playwright). Do not re-add.
5. **Closed:** `POST /api/detect/adhoc` guards shipped with Wow #3 — 500-row cap, 120kb body cap,
   YYYY-MM-DD rejection before classifier regex, no persistence, empty-state copy (§12.4).
6. **Closed:** no `DETECTOR=legacy|generalized` env flag. Rollback is git (`checkpoint-ws1` tag
   below), plus keeping `legacyDetectLifeEvent()` in-process for Wow gap #6's before/after demo.
   An env flag would add a second code path to keep in sync for a one-week hackathon.

## 11. Build order for the 6 hackathon "wow" gaps

**All six shipped.** Sequence below is historical (why they were ordered that way), not a backlog.

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

`sharedPlans` (`agents/sharedPlans.js`), `future_you.js`'s
`sessionMemory` Map, and the Express game's avatar-coin/mission state are all process-lifetime
in-memory stores. Run the demo once in rehearsal and once live without restarting the process, and a
judge can see a leftover Future You conversation or a coin balance that doesn't match the story.

**Fix:** `POST /api/demo/reset` clears Future You `sessionMemory` and the in-memory `sharedPlans`
queue (`cleared.sharedPlans: true`), and returns a default `avatarProfile` for the SPA to apply.
Call it (or restart the process) immediately before every live run.

### 12.2 Fresh-clone sanity check

Code path is documented: `README.md` Run section + `.env.example` + `PORT=<n>` override. This is a
**demo-laptop** check, not missing product work. Do **not** run `rm -rf node_modules` on a machine
already hosting live rehearsal servers.

**On the actual demo laptop, morning of:**
```bash
npm install && npm run dev
```
If port 3000 is taken: `PORT=<n> npm run dev`. Copy `.env.example` → `.env` if a live key is needed;
without a key, verified fallback is the rehearsed path (§12.3).

### 12.3 Offline / no-key resilience — verify, don't assume

Fallback is the default when `OPENAI_API_KEY` is unset: UI **VERIFIED FALLBACK**, Future You
`source: cached-demo`, `GET /api/health` `aiConnected: false`. Rehearse once more on the demo laptop
the morning of in case venue wifi dies.

### 12.4 Hardening `POST /api/detect/adhoc` (Wow gap #3, §5.5)

Shipped with the adhoc endpoint:

- Row cap 500 and `express.json({ limit: "120kb" })`.
- Date format `YYYY-MM-DD` validated before `classifyMerchant` regex.
- No persistence (`persisted: false`); classify → derive → detect only.
- Empty-state: `empty: true` + `"No strong signal in this data"` when nothing clears 0.4.

This architecture doc describes the **shipped** system. Intentional non-goals: live product scrape,
12–24 month ledgers, location/device, RM specialty matching (`objective.md` §10 Out of scope).
