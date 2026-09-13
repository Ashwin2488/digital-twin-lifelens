# LifeLens — Relationship Intelligence

An internal relationship-manager workspace that turns detected customer life events into timely, needs-led conversations.

## Product experience

- **Client 360:** relationship health, tenure, assets, income, life stage, and recent event signals in one view.
- **Life-event detection:** explainable evidence and confidence for new-parent, income-interruption, and wedding scenarios.
- **Next best conversation:** products ranked by need, eligibility, suitability, and projected customer value.
- **Digital twin simulator:** select or remove solutions and see their modeled 12-month liquidity impact immediately.
- **Meeting brief:** generates a needs-led opener, discovery questions, relevant solutions, and a compliance reminder.
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

The RM Today view also includes an illustrative pilot-impact strip for consented intent signals, preparation time saved, qualified pipeline value, and target meeting-conversion uplift. These are explicitly labelled as hackathon demonstration metrics rather than measured production results.

## Intelligence pipeline

Raw statement lines are classified, then converted into auditable features such as payroll interruption, recurring merchant counts, category acceleration, protection gaps, and cashflow surplus. A weighted detector derives the life-event hypothesis and retains an alternative explanation. Deterministic eligibility rules then remove unsuitable products before OpenAI generates grounded explanations and RM conversation guidance. OpenAI never calculates projection values or overrides suitability decisions.

Click **View signal evidence** in the dashboard to inspect the customer persona, source transactions, derived evidence, alternative hypothesis, product guardrails, model name, and whether the result came from live OpenAI or the verified fallback.

Set a valid `OPENAI_API_KEY` in `.env` to enable live insight narration. If the key is absent or rejected, the same endpoint returns deterministic evidence-backed copy and the UI explicitly displays **Verified fallback**.

The simulation is deterministic and continues to work without external AI. The interface is responsive for desktop and tablet demos.

## Stack

The runnable demo is the Express + vanilla SPA (`server.js`, `public/`). `npm run dev` starts that app on port 3000. If that port is already in use:

```bash
PORT=3011 npm run dev
```

Then open `http://localhost:3011`.

The incomplete Next.js port (`src/`) and Playwright e2e were removed. `npm test` is vitest against `data/` and `agents/` only.

## Banking-shaped mock data

Hero and holdout ledgers are authored as statement lines (`postDate`, `merchantRaw`, MCC, channel, account), not pre-labelled categories. `data/classifyMerchant.js` assigns category. Payroll gaps are inferred from missing GIRO months — banks do not post a `NO PAYROLL RECEIVED` row.

- `GET /api/holdout` — labelled unseen-customer summary (precision/recall set for the next detection rewrite)
- `GET /api/ledgers/:id` — full statement for a hero (`new-parent` / `job-loss` / `wedding`) or holdout id (`h-np-01`, `h-hp-01`, …)

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

- `OPENAI_API_KEY` is optional. Add it to enable live AI-generated insight narration; without it, the app uses its deterministic verified fallback.
- `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`.
- `PORT` is optional and defaults to `3000`.

The `.env` file is ignored by Git because it can contain secrets. Do not commit real API keys to the repository.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Structure

- `data/transactionSchema.js` — statement-line schema and running balances
- `data/classifyMerchant.js` — merchant/MCC → category (no author labels)
- `data/heroLedgers.js` — Amira / Daniel / Priya 6-month multi-account ledgers
- `data/ledgerFactory.js` — unseen synthetic customers + statement noise
- `data/holdout.js` — 24 labelled customers, including events the detector does not yet score
- `data/customer_profiles.js` — hero personas, products, classified transactions
- `data/scenarios.js` — customer event signals and cashflow inputs
- `agents/projection.js` — deterministic 12-month scenario engine
- `public/app.js` — RM dashboard interactions and live solution modeling
- `public/styles.css` — responsive visual system
- `server.js` — Express API and static app server

## Compliance framing

Recommendations are presented as conversation prompts rather than automatic sales decisions. The UI surfaces evidence, confidence, suitability guardrails, and reminds the RM to reconfirm customer circumstances before presenting any product.
