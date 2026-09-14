import { formatMoney, projectScenario } from "./projection.js";
import { assertNarrationGrounded, collectAllowedAmounts } from "./narrationGuard.js";
import { completeText, getLlmMeta, isLlmEnabled } from "./llmProvider.js";

const MAX_SESSIONS = 500;
const sessionMemory = new Map();

export function resetSessionMemory() {
  sessionMemory.clear();
}

export async function answerAsFutureYou({ scenario, projection, question, sessionId }) {
  const memoryKey = `${sessionId}:${scenario.id}:${projection.branch}`;
  const history = sessionMemory.get(memoryKey) ?? [];

  if (!isLlmEnabled()) {
    const fallback = goldenSentences({ scenario, projection, question });
    remember(memoryKey, question, fallback.answer);
    return {
      source: "cached-demo",
      answer: fallback.answer,
      sentences: fallback.sentences,
      traceability: { ...traceabilityPayload(scenario, projection), sentences: fallback.sentences },
    };
  }

  const { model, provider } = getLlmMeta();
  try {
    const answer = await completeText({
      system: buildSystemPrompt(scenario, projection),
      user: question,
      history,
      temperature: 0.55,
      maxTokens: 450,
    });
    const fallback = goldenSentences({ scenario, projection, question });
    const text = answer || fallback.answer;
    const grounded = assertNarrationGrounded(text, {
      amounts: collectAllowedAmounts({ projection }),
    });
    if (!answer || !grounded.ok) {
      remember(memoryKey, question, fallback.answer);
      return {
        source: "cached-demo-fallback",
        model,
        warning: !answer ? "Empty LLM response." : "LLM introduced amounts not in the projection.",
        answer: fallback.answer,
        sentences: fallback.sentences,
        traceability: { ...traceabilityPayload(scenario, projection), sentences: fallback.sentences },
      };
    }
    remember(memoryKey, question, text);
    const sentences = [{ text, cite: "projection" }];
    return {
      source: provider,
      model,
      answer: text,
      sentences,
      traceability: { ...traceabilityPayload(scenario, projection), sentences },
    };
  } catch (error) {
    const fallback = goldenSentences({ scenario, projection, question });
    remember(memoryKey, question, fallback.answer);
    return {
      source: "cached-demo-fallback",
      warning: error instanceof Error ? error.message : "LLM request failed.",
      answer: fallback.answer,
      sentences: fallback.sentences,
      traceability: { ...traceabilityPayload(scenario, projection), sentences: fallback.sentences },
    };
  }
}

export function buildSystemPrompt(scenario, projection) {
  const facts = projection.trajectory
    .map(
      (point) =>
        `${point.label}: net ${formatMoney(point.monthlyNet)}, balance ${formatMoney(
          point.projectedBalance,
        )}, event ${formatMoney(point.eventAdjustment)}, autopilot ${formatMoney(
          point.actionAdjustment,
        )}`,
    )
    .join("\n");

  return [
    "You are Future You, a digital financial twin narration layer for a bank hackathon demo.",
    "You must ground every claim in the supplied deterministic projection or signal trace.",
    "Open with: 'Simulated projection only, not financial advice.'",
    "Speak in first person narrative as the customer's future self. Do not give prescriptive financial advice.",
    `Customer: ${scenario.customer}.`,
    scenario.userIntent ? `What they told you: ${scenario.userIntent}` : "",
    `Detected event: ${scenario.event.label} (${scenario.event.type}), confidence ${Math.round(
      scenario.event.confidence * 100,
    )}%, detected in ${scenario.event.detectedMonth}.`,
    `Tone: ${scenario.tone}.`,
    `Branch: ${projection.headline}.`,
    `Starting balance: ${formatMoney(projection.startingBalance)}.`,
    `Ending balance: ${formatMoney(projection.endingBalance)}.`,
    `Minimum balance: ${formatMoney(projection.minBalance)}.`,
    `Savings delta: ${formatMoney(projection.savingsDelta)}.`,
    `Overdraft risk month: ${projection.overdraftMonth ? `Month ${projection.overdraftMonth}` : "none"}.`,
    `Accepted actions: ${
      projection.acceptedActions.map((action) => action.label).join("; ") || "none"
    }.`,
    `Declined actions: ${
      projection.declinedActions.map((action) => action.label).join("; ") || "none"
    }.`,
    `Explainer signal trace:\n${scenario.trace.map((item) => `- ${item}`).join("\n")}`,
    `Monthly projection facts:\n${facts}`,
  ].filter(Boolean).join("\n\n");
}

function remember(memoryKey, question, answer) {
  const history = sessionMemory.get(memoryKey) ?? [];
  history.push({ role: "user", content: question });
  history.push({ role: "assistant", content: answer });
  sessionMemory.delete(memoryKey); // re-insert to mark as most-recently-used
  sessionMemory.set(memoryKey, history.slice(-8));
  if (sessionMemory.size > MAX_SESSIONS) sessionMemory.delete(sessionMemory.keys().next().value); // evict LRU
}

function goldenAnswer({ scenario, projection, question }) {
  return goldenSentences({ scenario, projection, question }).answer;
}

function goldenSentences({ scenario, projection, question }) {
  const tailored = questionSpecificAnswer({ scenario, projection, question });
  const text = tailored || defaultGoldenAnswer({ scenario, projection, question });
  const sentences = String(text)
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map((line) => ({ text: line, cite: citeForSentence(line, scenario, projection) }));
  return { answer: sentences.map((row) => row.text).join(" "), sentences };
}

function citeForSentence(text, scenario, projection) {
  if (/not financial advice/i.test(text)) return "disclaimer";
  if (/overdraft|below zero/i.test(text)) return "overdraftMonth";
  if (/lowest|thinnest/i.test(text)) return "minBalance";
  if (/starting|ending|balance moved|S\$|\$/i.test(text) && /balance/i.test(text)) return "summary";
  if ((scenario.trace || []).some((row) => text.includes(String(row).slice(0, 24)))) return "signalTrace";
  if ((projection.acceptedActions || []).some((a) => text.includes(a.label))) return "actions";
  return "projection";
}

function normalizeQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionSpecificAnswer({ scenario, projection, question }) {
  const q = normalizeQuestion(question);
  const writers = QUESTION_WRITERS[scenario.id];
  if (!writers) return null;

  for (const entry of writers) {
    if (entry.match(q)) return entry.write({ scenario, projection, question: q });
  }
  return null;
}

function thinnestMonth(projection) {
  return projection.trajectory.reduce((worst, point) =>
    point.projectedBalance < worst.projectedBalance ? point : worst,
  );
}

function monthByNumber(projection, month) {
  return projection.trajectory.find((point) => point.month === month) ?? null;
}

function siblingProjection(scenario, projection) {
  const wantAccepted = projection.branch === "ignored";
  return projectScenario(scenario, { acceptActions: wantAccepted });
}

function actionClause(projection) {
  if (projection.acceptedActions.length > 0) {
    return `In this branch I accepted ${projection.acceptedActions
      .map((action) => action.label)
      .join(", ")}.`;
  }
  if (projection.declinedActions.length > 0) {
    return `In this branch I ignored ${projection.declinedActions
      .map((action) => action.label)
      .join(", ")}, so the pressure stayed in the numbers.`;
  }
  return "No autopilot actions were applied in this branch.";
}

function disclaimer() {
  return "Simulated projection only, not financial advice.";
}

function thinkingOpen(scenario, projection) {
  return `I am ${scenario.customer} a year from now in the "${projection.headline}" future. Let me think through the projection…`;
}

const QUESTION_WRITERS = {
  "new-parent": [
    {
      match: (q) => q.includes("watch out") || (q.includes("watch") && q.includes("next month")),
      write: ({ scenario, projection }) => {
        const thin = thinnestMonth(projection);
        const month2 = monthByNumber(projection, 2);
        const daycareHint =
          projection.branch === "ignored"
            ? "Daycare has not been buffered yet, so the recurring fee lands straight on cashflow."
            : "Even with the daycare buffer running, I still check the month before the fee fully settles in.";
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `${scenario.trace[0]} ${scenario.trace[1]}`,
          `Scanning ahead: ${thin.label} is where my balance is thinnest at ${formatMoney(
            thin.projectedBalance,
          )}. ${daycareHint}`,
          month2
            ? `Next, ${month2.label} shows net ${formatMoney(
                month2.monthlyNet,
              )} after the daycare deposit pressure — that is the window I would watch before anything else.`
            : "",
          actionClause(projection),
          `So if you ask what to watch: not the ending balance of ${formatMoney(
            projection.endingBalance,
          )} — watch the early months where liquidity feels tightest.`,
        ]
          .filter(Boolean)
          .join(" ");
      },
    },
    {
      match: (q) => q.includes("different") && (q.includes("future") || q.includes("two")),
      write: ({ scenario, projection }) => {
        const other = siblingProjection(scenario, projection);
        const endGap = Math.abs(projection.endingBalance - other.endingBalance);
        const minGap = Math.abs(projection.minBalance - other.minBalance);
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Comparing both simulator branches side by side…`,
          `In "${projection.headline}" I finish at ${formatMoney(
            projection.endingBalance,
          )} with a low of ${formatMoney(projection.minBalance)}.`,
          `In "${other.headline}" I finish at ${formatMoney(
            other.endingBalance,
          )} with a low of ${formatMoney(other.minBalance)}.`,
          `That is roughly ${formatMoney(endGap)} apart by year-end, and about ${formatMoney(
            minGap,
          )} difference at the weakest point.`,
          `The fork is not emotional — it is the autopilot choices: Pause travel sinking fund, Move groceries to 5% cashback card, Create daycare buffer transfer.`,
          `One path keeps daycare pressure in the open; the other absorbs it month by month. That is why the two futures feel different.`,
        ].join(" ");
      },
    },
    {
      match: (q) => q.includes("daycare") || q.includes("changed because"),
      write: ({ scenario, projection }) => {
        const month3 = monthByNumber(projection, 3);
        const beforeDaycare = monthByNumber(projection, 1);
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Tracing what daycare actually changed in the numbers…`,
          scenario.trace[0],
          beforeDaycare
            ? `Before the recurring fee locked in, ${beforeDaycare.label} still showed net ${formatMoney(
                beforeDaycare.monthlyNet,
              )} and a balance of ${formatMoney(beforeDaycare.projectedBalance)}.`
            : "",
          month3
            ? `Once daycare repeats from ${scenario.event.detectedMonth}, ${month3.label} settles to net ${formatMoney(
                month3.monthlyNet,
              )} with balance ${formatMoney(
                month3.projectedBalance,
              )} — that is the new cashflow baseline.`
            : "",
          actionClause(projection),
          `What changed because of daycare is not just one bill: it permanently lowered monthly surplus after ${scenario.event.detectedMonth}, which is why the year ends at ${formatMoney(
            projection.endingBalance,
          )} instead of climbing as if childcare never arrived.`,
        ]
          .filter(Boolean)
          .join(" ");
      },
    },
  ],

  "job-loss": [
    {
      match: (q) => q.includes("run out") || q.includes("out of cash"),
      write: ({ scenario, projection }) => {
        const thin = thinnestMonth(projection);
        if (projection.overdraftMonth) {
          const crash = monthByNumber(projection, projection.overdraftMonth);
          return [
            disclaimer(),
            thinkingOpen(scenario, projection),
            `Walking the runway month by month…`,
            scenario.trace[0],
            `Severance gives me a short cushion, but fixed outflows keep draining the account.`,
            crash
              ? `By ${crash.label} the projected balance crosses to ${formatMoney(
                  crash.projectedBalance,
                )} — that is where I run out of cash in this branch.`
              : `I cross below zero in month ${projection.overdraftMonth}.`,
            `From there the path keeps sliding to ${formatMoney(
              projection.endingBalance,
            )} by month 12.`,
            actionClause(projection),
            `So the honest answer: cash runs out around month ${projection.overdraftMonth} unless support actions change the branch.`,
          ].join(" ");
        }
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Checking whether the runway actually breaks…`,
          scenario.trace[0],
          `In this "${projection.headline}" path I never go negative. The thinnest point is ${thin.label} at ${formatMoney(
            thin.projectedBalance,
          )}, and I still finish the year at ${formatMoney(projection.endingBalance)}.`,
          actionClause(projection),
          `So I do not run out of cash in this future — the accepted actions bought enough time for contract income to matter.`,
        ].join(" ");
      },
    },
    {
      match: (q) => q.includes("buys the most") || q.includes("which action") || q.includes("most time"),
      write: ({ scenario, projection }) => {
        const ranked = [...scenario.autopilotActions].sort(
          (a, b) => (b.monthlyImpact || 0) - (a.monthlyImpact || 0),
        );
        const top = ranked[0];
        const rest = ranked.slice(1);
        const other = siblingProjection(scenario, projection);
        const gap = Math.abs(other.endingBalance - projection.endingBalance);
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Ranking the autopilot levers by monthly impact…`,
          top
            ? `${top.label} is the biggest time-buyer at about ${formatMoney(
                top.monthlyImpact,
              )} a month${top.endsMonth ? ` for months ${top.startsMonth ?? 1}–${top.endsMonth}` : ""}.`
            : "",
          rest.length
            ? `Then ${rest
                .map((action) => `${action.label} (~${formatMoney(action.monthlyImpact)})`)
                .join(", ")}.`
            : "",
          scenario.trace[2],
          `Across the full year, the accepted path and ignored path diverge by roughly ${formatMoney(
            gap,
          )} at the end — mortgage relief does most of the heavy lifting early, while the smaller cuts keep the slope flatter later.`,
          actionClause(projection),
          `If I could only take one action, I would take ${top?.label || "the largest monthly impact"} first.`,
        ]
          .filter(Boolean)
          .join(" ");
      },
    },
    {
      match: (q) => q.includes("month four") || q.includes("month 4"),
      write: ({ scenario, projection }) => {
        const m4 = monthByNumber(projection, 4);
        const m3 = monthByNumber(projection, 3);
        const m5 = monthByNumber(projection, 5);
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Zooming into month four specifically…`,
          `That is when contract income starts repeating in the model, so the monthly net softens from pure burn to a smaller deficit.`,
          m3 && m4
            ? `${m3.label} sits at ${formatMoney(m3.projectedBalance)} (net ${formatMoney(
                m3.monthlyNet,
              )}). ${m4.label} moves to ${formatMoney(m4.projectedBalance)} with net ${formatMoney(
                m4.monthlyNet,
              )}.`
            : "",
          m5
            ? `One month later, ${m5.label} is ${formatMoney(
                m5.projectedBalance,
              )} — ${
                projection.overdraftMonth === 5
                  ? "and that is where the ignored path tips below zero."
                  : "still above water in this branch."
              }`
            : "",
          actionClause(projection),
          `Month four is the hinge: freelance income arrives, but it is not a full salary replacement — the story is whether prior relief left enough balance for that hinge to matter.`,
        ]
          .filter(Boolean)
          .join(" ");
      },
    },
  ],

  wedding: [
    {
      match: (q) => q.includes("afford") || q.includes("still afford"),
      write: ({ scenario, projection }) => {
        const thin = thinnestMonth(projection);
        const affordable = projection.minBalance > 0 && !projection.overdraftMonth;
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Stress-testing affordability against every wedding spike…`,
          scenario.trace[0],
          `Venue, vendors, and the final balance all hit within the year, yet in this "${projection.headline}" path my lowest point is ${thin.label} at ${formatMoney(
            thin.projectedBalance,
          )}.`,
          affordable
            ? `I never cross into overdraft, and I still finish at ${formatMoney(
                projection.endingBalance,
              )}.`
            : `Liquidity breaks in this branch — affordability becomes fragile.`,
          actionClause(projection),
          affordable
            ? `So yes: I can still afford the wedding in this projection. The real question is how bumpy month five feels, not whether the year survives.`
            : `In this branch, affordability is the stress point the simulator is warning about.`,
        ].join(" ");
      },
    },
    {
      match: (q) => q.includes("month five") || q.includes("month 5"),
      write: ({ scenario, projection }) => {
        const m5 = monthByNumber(projection, 5);
        const m4 = monthByNumber(projection, 4);
        const m6 = monthByNumber(projection, 6);
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Opening the month-five ledger…`,
          scenario.trace[1],
          m4
            ? `I enter from ${m4.label} with ${formatMoney(m4.projectedBalance)} on hand.`
            : "",
          m5
            ? `Then the final wedding balance lands: ${m5.label} shows event drag of ${formatMoney(
                m5.eventAdjustment,
              )}, net ${formatMoney(m5.monthlyNet)}, and a balance of ${formatMoney(
                m5.projectedBalance,
              )}.`
            : "",
          m6
            ? `After the spike, ${m6.label} rebounds to ${formatMoney(
                m6.projectedBalance,
              )} as ordinary surplus returns.`
            : "",
          actionClause(projection),
          `Month five is the loudest moment in the year — not because the wedding fails, but because the final payment compresses cash before recovery resumes.`,
        ]
          .filter(Boolean)
          .join(" ");
      },
    },
    {
      match: (q) =>
        q.includes("calm") ||
        (q.includes("accepted") && q.includes("future")) ||
        q.includes("accepted-action") ||
        q.includes("accepted action"),
      write: ({ scenario, projection }) => {
        const accepted =
          projection.branch === "accepted"
            ? projection
            : projectScenario(scenario, { acceptActions: true });
        const ignored =
          projection.branch === "ignored"
            ? projection
            : projectScenario(scenario, { acceptActions: false });
        const thinAccepted = thinnestMonth(accepted);
        const thinIgnored = thinnestMonth(ignored);
        return [
          disclaimer(),
          thinkingOpen(scenario, projection),
          `Comparing how “calm” the accepted-action future really is…`,
          `Accepted path: low of ${formatMoney(thinAccepted.projectedBalance)} in ${
            thinAccepted.label
          }, year-end ${formatMoney(accepted.endingBalance)}.`,
          `Ignored path: low of ${formatMoney(thinIgnored.projectedBalance)} in ${
            thinIgnored.label
          }, year-end ${formatMoney(ignored.endingBalance)}.`,
          `Splitting vendor payments, delaying the honeymoon transfer, and routing partner contributions into a joint buffer is what flattens the spikes.`,
          scenario.trace[2],
          `Calm here does not mean zero wedding spend — it means the trough stays higher (${formatMoney(
            thinAccepted.projectedBalance,
          )} vs ${formatMoney(
            thinIgnored.projectedBalance,
          )}) and the year ends about ${formatMoney(
            accepted.endingBalance - ignored.endingBalance,
          )} stronger. That is the quieter future.`,
        ].join(" ");
      },
    },
  ],
};

function defaultGoldenAnswer({ scenario, projection, question }) {
  const overdraftText = projection.overdraftMonth
    ? `I dipped below zero in month ${projection.overdraftMonth}`
    : "I never crossed into overdraft during the 12-month projection";

  const eventSignal = scenario.trace[0] ?? `The event signal was ${scenario.event.label}.`;
  const thin = thinnestMonth(projection);

  return [
    disclaimer(),
    thinkingOpen(scenario, projection),
    eventSignal,
    `When I look back, my balance moved from ${formatMoney(
      projection.startingBalance,
    )} to ${formatMoney(projection.endingBalance)}, with the lowest point at ${formatMoney(
      projection.minBalance,
    )} in ${thin.label}. ${overdraftText}.`,
    actionClause(projection),
    `The concrete difference shows up in monthly net cashflow, especially after ${scenario.event.detectedMonth}.`,
    question.toLowerCase().includes("watch")
      ? `The month I watched most closely was ${thin.label}, because that is where the projected balance was thinnest.`
      : "That is why this future feels different: it is not a mood, it is the branch created by the simulator.",
  ].join(" ");
}

function traceabilityPayload(scenario, projection) {
  return {
    event: scenario.event,
    branch: projection.branch,
    summary: projection.summary,
    signalTrace: scenario.trace,
    actions: {
      accepted: projection.acceptedActions.map((action) => action.label),
      declined: projection.declinedActions.map((action) => action.label),
    },
  };
}
