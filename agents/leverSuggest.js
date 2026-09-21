import { planGoalForCustomer } from "./goalPlan.js";
import { completeJson, isLlmEnabled, getLlmMeta } from "./llmProvider.js";

const LIMITS = { spendCutPct: [0, 40], extraMonthly: [0, 2000], lumpSum: [0, 20000] };

/** Model may only propose lever deltas within these ranges — never trust raw model output. */
export function clampLever(name, value, fallback = 0) {
  const [min, max] = LIMITS[name] || [0, 0];
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Deterministic candidates — always available, no LLM required. */
export function buildFallbackCandidates(levers = {}) {
  const base = {
    spendCutPct: clampLever("spendCutPct", levers.spendCutPct, 0),
    extraMonthly: clampLever("extraMonthly", levers.extraMonthly, 0),
    lumpSum: clampLever("lumpSum", levers.lumpSum, 0),
  };
  return [
    {
      label: "Cut a bit more",
      why: "Increases the discretionary spend cut by 10 points.",
      levers: { ...base, spendCutPct: clampLever("spendCutPct", base.spendCutPct + 10) },
    },
    {
      label: "Save more each month",
      why: "Adds S$200 to the extra monthly save lever.",
      levers: { ...base, extraMonthly: clampLever("extraMonthly", base.extraMonthly + 200) },
    },
    {
      label: "Add a one-off contribution",
      why: "Models a S$2,000 lump sum toward the goal.",
      levers: { ...base, lumpSum: clampLever("lumpSum", base.lumpSum + 2000) },
    },
  ];
}

/** Sanitize one LLM-proposed candidate: clamp every lever, keep only the why/label text. */
export function sanitizeLeverCandidate(raw, currentLevers = {}) {
  if (!raw || typeof raw !== "object") return null;
  const levers = {
    spendCutPct: clampLever("spendCutPct", raw.spendCutPct, currentLevers.spendCutPct || 0),
    extraMonthly: clampLever("extraMonthly", raw.extraMonthly, currentLevers.extraMonthly || 0),
    lumpSum: clampLever("lumpSum", raw.lumpSum, currentLevers.lumpSum || 0),
  };
  const label = String(raw.label || "Try this combination").slice(0, 60);
  const why = String(raw.why || "").slice(0, 160);
  return { label, why, levers };
}

async function proposeFromLlm({ plan }) {
  if (!isLlmEnabled()) return null;
  const { model, provider } = getLlmMeta();
  const parsed = await completeJson({
    system:
      "You suggest 2-3 alternative lever combinations for a savings goal plan. Only propose numeric lever values inside the given ranges. Never invent amounts outside the ranges. Do not narrate financial advice, just label each option.",
    user: JSON.stringify({
      goal: plan.goal,
      currentLevers: plan.levers,
      onTrack: plan.onTrack,
      endingBalance: plan.modeled.endingBalance,
      minBalance: plan.modeled.minBalance,
      ranges: LIMITS,
    }),
    name: "lever_suggestions",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        candidates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              why: { type: "string" },
              spendCutPct: { type: "number" },
              extraMonthly: { type: "number" },
              lumpSum: { type: "number" },
            },
            required: ["label", "why", "spendCutPct", "extraMonthly", "lumpSum"],
          },
        },
      },
      required: ["candidates"],
    },
    temperature: 0.4,
    maxTokens: 350,
  });
  if (!parsed?.candidates?.length) return null;
  const candidates = parsed.candidates
    .map((c) => sanitizeLeverCandidate(c, plan.levers))
    .filter(Boolean)
    .slice(0, 3);
  return candidates.length ? { source: `${provider}:${model}`, candidates } : null;
}

/** Model proposes lever combinations; the deterministic engine scores every one before it's shown. */
export async function suggestLevers(customerId, { goal, levers } = {}) {
  const plan = planGoalForCustomer(customerId, { goal, levers });
  if (!plan) return null;

  const llmResult = await proposeFromLlm({ plan }).catch(() => null);
  const { source, candidates } = llmResult || { source: "deterministic", candidates: buildFallbackCandidates(plan.levers) };

  const scored = candidates.map((candidate) => {
    const candidatePlan = planGoalForCustomer(customerId, { goal: plan.goal, levers: candidate.levers });
    return {
      label: candidate.label,
      why: candidate.why,
      levers: candidate.levers,
      onTrack: candidatePlan.onTrack,
      endingBalance: candidatePlan.modeled.endingBalance,
      minBalance: candidatePlan.modeled.minBalance,
      mood: candidatePlan.mood,
    };
  });

  return { source, baseline: { onTrack: plan.onTrack, endingBalance: plan.modeled.endingBalance }, candidates: scored };
}
