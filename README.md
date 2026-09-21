# LifeLens — Relationship Intelligence

An internal relationship-manager workspace that turns detected customer life events into timely, needs-led conversations.

## Product experience

- **Client 360:** relationship health, tenure, assets, income, life stage, and recent event signals in one view.
- **Life-event detection:** generalized scorer over 8 event types + 24 holdout customers; evidence, weights, and confidence.
- **Next best conversation:** catalog + eligibility rules before any LLM copy.
- **Digital twin / Goal Plan:** any customer, any `{type, targetAmount, targetDate}`; levers update a deterministic trajectory. Type “I am going to be…” — LLM extracts the goal; numbers stay local.
- **Meeting brief:** needs-led opener, discovery questions, relevant solutions, compliance reminder.
- **12 Months to Future You:** a six-round customer game where childbirth costs, daycare, protection, surprise expenses, career choices, and family goals create genuine financial trade-offs.
- **Branching game state:** every decision changes cash, debt, wellbeing, stress, protection, the customer's room, and the ending personality. Players can rewind one decision and create a different timeline.
- **Meaningful achievements:** rewards recognise resilience, avoiding debt, protection, balanced wellbeing, and preserving joy—not product purchases.
- **Avatar Studio:** customers earn Future Coins, choose their avatar colour, and buy or equip cosmetic items and room companions. Cosmetics never influence financial outcomes or product recommendations.
- **Decision resources:** each round offers a limited Future You consultation, a plain-language financial guide, and an optional RM question so players can make informed trade-offs without being given a prescribed answer.
- **Three-path comparison:** the final screen compares conservative, current-choice, and optimised-support futures with clear illustrative disclaimers.
- **Future Canvas:** a separate customer tab where demographic-relevant life events can be dragged onto a 10-year timeline. A visual world, monthly cashflow, asset position, resilience window and wellbeing pressure update immediately.
- **Connected Life:** opt-in simulated Apple Health, Apple Watch, Garmin and Fitbit summaries can refine wellbeing context. Health information is explicitly separated from credit eligibility and product-suitability logic.
- **Human digital twin:** the customer avatar now has a complete body, outfit, accessories and room customisation, with a corrected responsive game banner.
- **Consented RM handoff:** customers can save a scenario or share their chosen future with their RM, turning exploration into a qualified, needs-led conversation.

## Two-sided value loop

The RM workspace detects a meaningful life change and models suitable support. The customer experience then makes the same deterministic projection understandable and engaging: customers explore a chapter, choose actions, and see Future You react. If the customer asks for help, the selected scenario becomes useful context for the RM instead of a cold product lead.

- **Customer value:** clearer trade-offs, safer experimentation, more confidence, and timely human support.
- **Business value:** higher digital engagement, consented intent signals, better-prepared RM conversations, and more relevant product conversion.

The RM Today view shows **queued consented handoffs** for this process (not a conversion metric). Holdout precision/recall, the live paste-your-own-ledger lab, and the session activity log live under the **Developer** nav tab, kept separate from the RM's daily workflow. Run `POST /api/demo/reset` before every pitch.

## Intelligence pipeline

Raw statement lines are classified, then converted into auditable features such as payroll interruption, recurring merchant counts, category acceleration, protection gaps, and cashflow surplus. A weighted detector derives the life-event hypothesis and retains an alternative explanation. Deterministic eligibility rules then remove unsuitable products before OpenAI generates grounded explanations and RM conversation guidance. OpenAI never calculates projection values or overrides suitability decisions.

Click **View signal evidence** in the dashboard to inspect the customer persona, source transactions, derived evidence, alternative hypothesis, product guardrails, model name, and whether the result came from live OpenAI or the verified fallback.

Set a valid `OPENAI_API_KEY` in `.env` to enable live insight narration. If the key is absent or rejected, the same endpoint returns deterministic evidence-backed copy and the UI explicitly displays **Verified fallback**.

The simulation is deterministic and continues to work without external AI. The interface is responsive for desktop and tablet demos.

## Stack

The runnable demo is Express (`server/`) plus a Vite + React client (`client/`). `npm run seed` writes JSON fixtures. `npm run dev` starts the API on port 3000 and the UI on 5173.

```bash
PORT=3011 npm run dev:api
```

`npm test` is vitest against `data/`, `agents/`, and `server/`.

## Banking-shaped mock data

Hero and holdout ledgers are authored as statement lines (`postDate`, `merchantRaw`, MCC, channel, account), not pre-labelled categories. `data/classifyMerchant.js` assigns category. Payroll gaps are inferred from missing GIRO months — banks do not post a `NO PAYROLL RECEIVED` row.

- `GET /api/holdout` — labelled unseen-customer summary
- `GET /api/ledgers/:id` — full statement for a hero or holdout id
- `GET /api/eval/holdout-detection` — precision/recall on the 24-customer holdout
- `POST /api/customers/:id/goal-plan` — any customer + goal + levers
- `POST /api/customers/:id/intent` — “I am going to be…” → structured goal (never invents amounts)
- `POST /api/detect/adhoc` — paste CSV/JSON or upload a file, never persisted
- `POST /api/customers/:id/lever-suggest` — model proposes lever combinations, server clamps every value and the deterministic engine scores each one before it's returned
- `GET /api/demo/experience` — Life Game, canvas, avatar shop, and demo chrome catalogs
- `GET /api/demo/log` — this-process session activity feed (Developer tab)
- `POST /api/demo/reset` — clear Future You memory + shared plans

```bash
npm test
```

## Environment variables

Create a `.env` file in the project root before starting the app:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

- `OPENAI_API_KEY` / `LLM_API_KEY` optional. Narration uses `agents/llmProvider.js`. Without a key, verified fallback.
- `LLM_DETECT=on` optional. Lets the model propose event hypotheses; the local scorer still owns confidence.
- `PORT` is optional and defaults to `3000`.

Copy `.env.example` to `.env`. `OPENAI_API_KEY` is optional (verified fallback without it).

## Run

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:5173`. Production: `npm run build && npm start` then open `http://localhost:3000`.

## Structure

- `data/transactionSchema.js` — statement-line schema and running balances
- `data/classifyMerchant.js` — merchant/MCC → category (no author labels)
- `data/heroLedgers.js` — Amira / Daniel / Priya 6-month multi-account ledgers
- `data/ledgerFactory.js` — unseen synthetic customers + statement noise
- `data/holdout.js` — 24 labelled customers, 8 event types + negatives
- `data/policyHoldings.js` / `creditProfile.js` / `identity.js` / `productCatalog.js` — Customer 360
- `agents/detector.js` — generalized life-event scorer
- `agents/goalPlan.js` — any-customer goal trajectory
- `agents/leverSuggest.js` — model-proposed, server-clamped, engine-scored lever suggestions
- `agents/projection.js` — deterministic 12-month scenario engine
- `data/fixtures/` — JSON records served by the mock API (`npm run seed`)
- `server/` — Express routers, envelope, fixture overlay store
- `client/` — Vite + React UI by domain (today, customers, twin, futureYou, developer)
- `client/src/styles/` — visual system
- `server/index.js` — API listen; serves `client/dist` in production

## Recent changes (third UX pass + gap sweep)

- **Nav split into 3 modes**: RM (`/today`, `/customers`), Customer (`/future`), and a new
  **Developer** tab (`/developer`) that now owns holdout eval, the live paste-your-own-ledger lab,
  before/after compare, a session activity log (`GET /api/demo/log`), and a system-status panel
  (`GET /api/health`). `/today` is decluttered to 4 sections — no more diagnostics mixed in with
  the RM's daily triage.
- **Client view empty state**: opening a customer with no shared plan on file now shows an "email
  a playable link" invite banner instead of a silent no-signal state.
- **Goal Plan**: added a 3rd lever (one-off lump sum, goal-type-labelled), a deterministic mood
  chip, and a lever-suggestion feature (`POST /api/customers/:id/lever-suggest`) — the model
  proposes 2–3 lever combinations, every value is clamped server-side regardless of what the model
  returns, and the deterministic engine scores each candidate before it's shown; works with no
  LLM key via a deterministic fallback.
- **Gap sweep**: fixed a narration-guard bug (a truthful LLM restatement of a lever amount was
  getting wrongly flagged as "invented"), added tests for `projection.js` and
  `narrationGuard.js` (previously untested), removed the unused `zod` dependency, and unified
  unicode-glyph icons on trust-critical buttons/product icons to SVG.
- Full checklist and rationale: `objective.md` (Workstream 4) and `architecture.md`. The
  standalone `improvement.md` proposal doc from this pass was folded into those two and deleted.

## Compliance framing

Recommendations are presented as conversation prompts rather than automatic sales decisions. The UI surfaces evidence, confidence, suitability guardrails, and reminds the RM to reconfirm customer circumstances before presenting any product.
