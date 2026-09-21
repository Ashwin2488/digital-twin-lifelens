# LifeLens — Demo Runbook

Companion to `objective.md` (why/what) and `architecture.md` (how). This doc is the pitch itself:
what to click, in what order, in how much time, and what must still be true before you walk on
stage. Update this whenever a Wow Track item (`objective.md` §9) ships.

## 1. Pre-demo checklist (run this every time, not just once)

- [x] `POST /api/demo/reset` called (or process restarted) — clears shared plans, Future You
      session memory, avatar coins (`architecture.md` §12.1) — **verified this session**; re-run on stage machine
- [x] Fresh-clone / demo-laptop boot (`architecture.md` §12.2) — **verified this session**: `git clone`
      into a scratch dir off the last commit (`1a94669`), `npm install` clean, `PORT=4173 npm run dev`,
      `/api/health` and `/today` both came back healthy with no `.env`. Re-run after committing/pushing
      current work — this clone predates the in-progress Developer view, so `/developer` 404'd there.
- [x] Full run-through completed at least once with `OPENAI_API_KEY` unset — fallback copy reads
      fine out loud (`architecture.md` §12.3) — API: `aiConnected: false`, `VERIFIED FALLBACK`,
      Future You `cached-demo`
- [x] `npm test` green (116 tests)
- [x] `GET /api/eval/holdout-detection` returns a real number, not an error (P 1.0 / R 0.895 / acc 0.917)
- [x] `PORT` confirmed available on the demo machine, or override documented and rehearsed
      (`PORT=<n> npm run dev` — see README)
- [x] Git tag `checkpoint-ws1` still reachable (`git show checkpoint-ws1`) so a detector
      rewrite can be reverted without archaeology

## 2. Time-boxed pitch sequence (target: 8–10 minutes)

Each beat names the Wow Track gap it proves (`objective.md` §9) and the underlying claim from the
original eval this beat is answering.

| Time | Beat | Proves | Answers eval's ask |
|---|---|---|---|
| 0:00–0:45 | Problem framing: 3 hardcoded personas were the old state | — | sets up the contrast for beat 3 |
| 0:45–2:00 | Open **Wei Lin Chen** (`h-hp-01`, not a hero) in the RM view, show detected event + evidence | Gap #1 (generalized detector) | "production value depends entirely on classifying unseen transactions" |
| 2:00–3:00 | Open the confidence breakdown in the evidence dialog — show the weight bars summing to the score | Gap #5 (confidence explainability) | "evidence and confidence displayed" |
| 3:00–4:00 | Toggle products on/off in the RM twin simulator, watch the 12-month projection react live | *(existing feature — regression, §3 below)* | "the 12-month projection changing as products are toggled" |
| 4:00–5:00 | Switch to before/after mode: same customer through the old branch-logic detector (blank/wrong) vs new generalized one | Gap #6 (before/after) | direct visual proof of the fix, not a claim |
| 5:00–6:00 | Switch to the **Developer** nav tab, show the holdout precision/recall panel: "X% precision, Y% recall across 24 unseen customers, 8 event types" | Gap #2 (holdout eval surfaced) | quantified answer to "prove it's not 3 rigged demos" |
| 6:00–7:30 | Still in Developer: paste/upload a small transaction set live (judge-provided if possible) into the live detector lab, watch it classify + score in real time | Gap #3 (live adhoc detection) | strongest possible proof of generalization |
| 7:30–8:30 | Customer Goal Plan: type “I am going to be a parent” (or tap a chip), watch the trajectory + Future You answer with cites | Gap #4 (goal-plan + NL twin) | "the customer journey played through, and the AI answering" |
| 8:30–9:30 | Consented handoff: customer shares plan → RM sees it land as a queued signal | *(existing loop — regression, §3 below)* | "customer explores the same projection... consented handoff turning exploration into a qualified conversation" |
| 9:30–10:00 | Close on compliance framing: LLM narrates, never computes; recommendations are conversation openers, achievements reward resilience, health data isolated | — | "deliberate compliance design" |

**If time is short**, cut to: beat 2 (unseen customer) → beat 6 (holdout number) → beat 7
(adhoc live) → beat 8 (customer goal play). Those four are the highest-density proof points.

## 3. Regression checklist — confirm the original eval asks still work

Scope grew a lot (Customer 360, Wow Track, ops hardening) since the original eval. Before demo day,
re-verify these still work exactly as they did when the eval was written — the detector rewrite in
particular touches `agents/intelligence.js`, which everything else also depends on.

- [x] RM sees a detected life event with evidence and confidence (hero customers — baseline case)
- [x] Customer explores the same projection themselves (Digital Twin / twin playground still loads
      for hero personas after any `lifePlan.ts`/`projection.js` generalization)
- [x] Consented handoff still turns a customer share into a queued RM signal
- [x] 12-month projection still updates live as products are toggled on/off in the RM simulator
      (`POST /api/project` Amira delta endingBalance 4200)
- [x] Meeting brief still generates: needs-led opener, discovery questions, relevant solutions,
      compliance reminder
- [x] Model still narrates only — spot check that no LLM output in the brief or Future You chat
      introduces a number/product not present in the deterministic input (ties to the guardrail
      test in `objective.md` §10, Workstream 3)
- [x] Achievements still reward behavior (resilience, protection, balance), not purchases, after
      the Avatar Studio/missions generalization (Wow gap #4 area)
- [x] Health/wearable data still never appears in any eligibility or balance calculation
- [x] Client view shows the "email a playable link" empty-state banner only when the opened
      customer has no shared plan on file (`GET /api/plans`); hidden once one exists
- [x] Goal Plan's mood chip and lever-suggestion candidates only ever show levers within the
      allowed ranges (0–40% cut, S$0–2,000 extra, S$0–20,000 lump sum), even with no LLM key

## 4. If a live click fails (APIs still work)

These beats are shipped. Use the curl if a panel is hidden or a tab is on the wrong customer.

- Holdout number → `GET /api/eval/holdout-detection` (P 1.0 / R ~0.90 / 24 customers, 8 types). UI: `/developer`.
- Adhoc UI → `POST /api/detect/adhoc` with the wedding sample from `GET /api/demo/experience`. UI: `/developer`.
- Before/after → `GET /api/detect/legacy-vs-generalized/h-hp-01` (legacy `none`) vs `wedding`. UI: `/developer`.
- Goal Plan → `/future` tab 01. Type “I am going to be a parent” or paste `POST /api/customers/h-hp-01/intent`. Then `POST /api/customers/h-hp-01/goal-plan` for ignored vs modeled endingBalance.
- Goal Plan lever suggestions → `POST /api/customers/h-hp-01/lever-suggest` — 2–3 scored lever candidates, works with no LLM key (deterministic fallback).
- System status / session log (if asked "is this really live?") → `GET /api/health`, `GET /api/demo/log`. UI: `/developer`.
- Opening Future You from an RM client keeps that customer (no longer forces Amira).
- Open **Wei Lin Chen** (`h-hp-01`) for the unseen-customer beat — not Amira.
