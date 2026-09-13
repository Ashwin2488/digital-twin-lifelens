# LifeLens — Demo Runbook

Companion to `objective.md` (why/what) and `architecture.md` (how). This doc is the pitch itself:
what to click, in what order, in how much time, and what must still be true before you walk on
stage. Update this whenever a Wow Track item (`objective.md` §9) ships.

## 1. Pre-demo checklist (run this every time, not just once)

- [ ] `POST /api/demo/reset` called (or process restarted) — clears shared plans, Future You
      session memory, avatar coins (`architecture.md` §12.1)
- [ ] Fresh-clone sanity check passed within the last day (`architecture.md` §12.2)
- [ ] Full run-through completed at least once with `OPENAI_API_KEY` unset — fallback copy reads
      fine out loud (`architecture.md` §12.3)
- [ ] `npm test` green
- [ ] `GET /api/eval/holdout-detection` returns a real number, not an error
- [ ] `PORT` confirmed available on the demo machine, or override documented and rehearsed
      (`PORT=<n> npm run dev` — see README)
- [ ] Git tag `checkpoint-ws1` still reachable (`git show checkpoint-ws1`) so a detector
      rewrite can be reverted without archaeology

## 2. Time-boxed pitch sequence (target: 8–10 minutes)

Each beat names the Wow Track gap it proves (`objective.md` §9) and the underlying claim from the
original eval this beat is answering.

| Time | Beat | Proves | Answers eval's ask |
|---|---|---|---|
| 0:00–0:45 | Problem framing: 3 hardcoded personas were the old state | — | sets up the contrast for beat 3 |
| 0:45–2:00 | Open a **holdout** customer (not a hero) in the RM view, show detected event + evidence | Gap #1 (generalized detector) | "production value depends entirely on classifying unseen transactions" |
| 2:00–3:00 | Open the confidence breakdown in the evidence dialog — show the weight bars summing to the score | Gap #5 (confidence explainability) | "evidence and confidence displayed" |
| 3:00–4:00 | Toggle products on/off in the RM twin simulator, watch the 12-month projection react live | *(existing feature — regression, §3 below)* | "the 12-month projection changing as products are toggled" |
| 4:00–5:00 | Switch to before/after mode: same customer through the old branch-logic detector (blank/wrong) vs new generalized one | Gap #6 (before/after) | direct visual proof of the fix, not a claim |
| 5:00–6:00 | Show the holdout precision/recall panel: "X% precision, Y% recall across 24 unseen customers, 8 event types" | Gap #2 (holdout eval surfaced) | quantified answer to "prove it's not 3 rigged demos" |
| 6:00–7:30 | Paste/upload a small transaction set live (judge-provided if possible) into the adhoc detector, watch it classify + score in real time | Gap #3 (live adhoc detection) | strongest possible proof of generalization |
| 7:30–8:30 | Switch to customer view: enter a goal, drag a lever, watch the trajectory update; ask Future You a question and show the traceability | Gap #4 (goal-plan generalization) | "the customer journey played through, and the AI answering" |
| 8:30–9:30 | Consented handoff: customer shares plan → RM sees it land as a queued signal | *(existing loop — regression, §3 below)* | "customer explores the same projection... consented handoff turning exploration into a qualified conversation" |
| 9:30–10:00 | Close on compliance framing: LLM narrates, never computes; recommendations are conversation openers, achievements reward resilience, health data isolated | — | "deliberate compliance design" |

**If time is short**, cut to: beat 2 (unseen customer) → beat 6 (holdout number) → beat 7
(adhoc live) → beat 8 (customer goal play). Those four are the highest-density proof points.

## 3. Regression checklist — confirm the original eval asks still work

Scope grew a lot (Customer 360, Wow Track, ops hardening) since the original eval. Before demo day,
re-verify these still work exactly as they did when the eval was written — the detector rewrite in
particular touches `agents/intelligence.js`, which everything else also depends on.

- [ ] RM sees a detected life event with evidence and confidence (hero customers — baseline case)
- [ ] Customer explores the same projection themselves (Digital Twin / twin playground still loads
      for hero personas after any `lifePlan.ts`/`projection.js` generalization)
- [ ] Consented handoff still turns a customer share into a queued RM signal
- [ ] 12-month projection still updates live as products are toggled on/off in the RM simulator
- [ ] Meeting brief still generates: needs-led opener, discovery questions, relevant solutions,
      compliance reminder
- [ ] Model still narrates only — spot check that no LLM output in the brief or Future You chat
      introduces a number/product not present in the deterministic input (ties to the guardrail
      test in `objective.md` §10, Workstream 3)
- [ ] Achievements still reward behavior (resilience, protection, balance), not purchases, after
      the Avatar Studio/missions generalization (Wow gap #4 area)
- [ ] Health/wearable data still never appears in any eligibility or balance calculation

## 4. Known fallback talking points (if a Wow Track item isn't finished in time)

- No holdout number yet → talk through `data/holdout.js`'s design (24 labelled unseen customers,
  8 event types) and show the ground truth vs a manual `GET /api/ledgers/:id` call instead of a
  polished panel.
- No live adhoc endpoint yet → show `GET /api/ledgers/h-hp-01` (or any holdout id) as "this customer
  was never seen during development" and walk through the same evidence dialog.
- No before/after toggle yet → open `agents/intelligence.js` briefly and point at the renamed
  `legacyDetectLifeEvent()` next to the new generalized version — the diff itself is the story.
