import { customerProfiles } from "../data/customer_profiles.js";
import { getHoldoutById } from "../data/holdout.js";
import { ageFromDob, getIdentity } from "../data/identity.js";
import { buildCustomerCashflow } from "./cashflow.js";
import { evaluateAchievements } from "./achievements.js";
import { formatMoney, projectWithActions } from "./projection.js";
import { assertNarrationGrounded } from "./narrationGuard.js";
import { completeText, getLlmMeta, isLlmEnabled } from "./llmProvider.js";

const MIN_MONTHS = 3;
const MAX_MONTHS = 36;

export function loadCustomerSource(id) {
  const profile = customerProfiles[id];
  if (profile) return { id, eventType: id, ...profile };
  const holdout = getHoldoutById(id);
  if (!holdout) return null;
  const ident = getIdentity(id);
  const fullName = ident?.fullName || holdout.id;
  return {
    id,
    eventType: holdout.groundTruth?.type || null,
    transactions: holdout.transactions,
    persona: {
      fullName,
      initials: fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      age: ageFromDob(ident?.dob) || 38,
      employer: holdout.employer,
      occupation: holdout.employer,
      phone: ident?.contact?.phone,
      segment: ident?.kyc?.segment || "Priority",
      contactConsent: Boolean(ident?.consent?.dataSharing),
      riskProfile: "Balanced",
    },
    baseline: {},
    employer: holdout.employer,
  };
}

export function defaultGoal(cashflow) {
  const targetDate = addMonths(cashflow.asOf, 12);
  const burn = cashflow.recurringExpenses;
  if (cashflow.eventType === "job-loss" || cashflow.eventType === "new-parent") {
    return { type: "emergency", targetAmount: Math.max(6000, Math.round(burn * 6)), targetDate };
  }
  if (cashflow.eventType === "home-purchase") {
    return { type: "home", targetAmount: 40000, targetDate };
  }
  if (cashflow.eventType === "wedding") {
    return { type: "wedding", targetAmount: 20000, targetDate };
  }
  return { type: "savings", targetAmount: 20000, targetDate };
}

export function planGoalForCustomer(id, { goal, levers } = {}) {
  const source = loadCustomerSource(id);
  if (!source) return null;
  const cashflow = buildCustomerCashflow(source);
  const resolved = sanitizeGoal(goal, cashflow);
  return planGoal({ cashflow, goal: resolved, levers: levers || {} });
}

/** Per-goal-type label for the one-off lever — same mechanic, framed for what the money is for. */
export const LUMP_SUM_LABELS = {
  emergency: "One-off windfall (bonus, refund)",
  home: "One-off deposit gift (family, bonus)",
  wedding: "One-off contribution (gift money)",
  savings: "One-off lump sum",
};

export function lumpSumLabel(goalType) {
  return LUMP_SUM_LABELS[goalType] || LUMP_SUM_LABELS.savings;
}

export function planGoal({ cashflow, goal, levers = {} }) {
  const months = monthsUntil(cashflow.asOf, goal.targetDate);
  const spendCutPct = clamp(Number(levers.spendCutPct) || 0, 0, 40);
  const extraMonthly = Math.max(0, Math.round(Number(levers.extraMonthly) || 0));
  const lumpSum = clamp(Math.round(Number(levers.lumpSum) || 0), 0, 100_000);
  const spendCutAmount = Math.round(cashflow.discretionaryMonthly * (spendCutPct / 100));
  const scenario = {
    id: cashflow.customerId,
    startingBalance: cashflow.startingBalance,
    income: cashflow.income,
    recurringExpenses: cashflow.recurringExpenses,
    monthlyEvents: [],
  };
  const actions = [];
  if (spendCutAmount) {
    actions.push({
      id: "spend-cut",
      label: `Cut discretionary spend ${spendCutPct}%`,
      monthlyImpact: spendCutAmount,
      startsMonth: 1,
    });
  }
  if (extraMonthly) {
    actions.push({
      id: "extra-save",
      label: "Extra monthly save",
      monthlyImpact: extraMonthly,
      startsMonth: 1,
    });
  }
  if (lumpSum) {
    actions.push({
      id: "lump-sum",
      label: lumpSumLabel(goal.type),
      monthlyImpact: lumpSum,
      startsMonth: 1,
      endsMonth: 1,
    });
  }
  const ignored = projectWithActions(scenario, [], { months, branch: "ignored" });
  const modeled = projectWithActions(scenario, actions, { months, branch: "modeled" });
  const gap = Math.max(0, goal.targetAmount - cashflow.startingBalance - lumpSum);
  const requiredMonthly = Math.ceil(gap / months);
  const monthlyNet = cashflow.income - cashflow.recurringExpenses + spendCutAmount + extraMonthly;
  const onTrack = modeled.endingBalance >= goal.targetAmount;
  const emergencyFundMonths =
    cashflow.recurringExpenses > 0 ? Number((modeled.endingBalance / cashflow.recurringExpenses).toFixed(2)) : 0;
  const snapshot = {
    emergencyFundMonths,
    minBalance: modeled.minBalance,
    onTrack,
    monthlyNet,
    endingBalance: modeled.endingBalance,
  };
  const achievements = evaluateAchievements(snapshot);
  return {
    persisted: false,
    customerId: cashflow.customerId,
    cashflow,
    goal: { ...goal, months },
    levers: { spendCutPct, extraMonthly, lumpSum, spendCutAmount },
    lumpSumLabel: lumpSumLabel(goal.type),
    requiredMonthly,
    onTrack,
    monthlyNet,
    ignored,
    modeled,
    delta: { endingBalance: modeled.endingBalance - ignored.endingBalance },
    achievements,
    mood: moodFor({ onTrack, minBalance: modeled.minBalance }),
    copy: narrate({ cashflow, goal, months, requiredMonthly, monthlyNet, onTrack, modeled, spendCutPct, lumpSum }),
    copySource: "deterministic",
  };
}

/** Pure read of already-computed numbers — no new score, just a face on the existing verdict. */
export function moodFor({ onTrack, minBalance }) {
  if (Number(minBalance) < 0) return { key: "stressed", label: "Future You feels stressed", detail: "Balance dips below zero in the modeled path." };
  if (onTrack) return { key: "calm", label: "Future You feels calm", detail: "On track for the goal, and stays liquid throughout." };
  return { key: "steady", label: "Future You feels steady, but not there yet", detail: "Stays liquid, but the goal isn't reached on the current levers." };
}

export async function enrichGoalCopy(plan) {
  if (!plan) return plan;
  const fallback = plan.copy;
  if (!isLlmEnabled()) return plan;
  const { model, provider } = getLlmMeta();
  try {
    const text = await completeText({
      system:
        "Rewrite the supplied goal-plan facts in plain language. Suggest which lever to try next. Never invent amounts, dates, or products. Cite only the numbers given. Not financial advice.",
      user: JSON.stringify({
        copy: fallback,
        goal: plan.goal,
        requiredMonthly: plan.requiredMonthly,
        monthlyNet: plan.monthlyNet,
        endingBalance: plan.modeled.endingBalance,
        minBalance: plan.modeled.minBalance,
        onTrack: plan.onTrack,
        levers: plan.levers,
      }),
      temperature: 0.3,
      maxTokens: 280,
    });
    if (!text) return plan;
    const grounded = assertNarrationGrounded(text, {
      amounts: [
        plan.goal.targetAmount,
        plan.requiredMonthly,
        plan.monthlyNet,
        plan.modeled.endingBalance,
        plan.modeled.minBalance,
        plan.levers.spendCutAmount,
        plan.levers.extraMonthly,
        plan.levers.lumpSum,
      ],
    });
    if (!grounded.ok) return { ...plan, copySource: "deterministic-fallback", copyWarning: "LLM invented amounts" };
    return { ...plan, copy: text, copySource: provider, model };
  } catch {
    return { ...plan, copySource: "deterministic-fallback" };
  }
}

function sanitizeGoal(goal, cashflow) {
  const fallback = defaultGoal(cashflow);
  const targetAmount = Math.round(Number(goal?.targetAmount));
  const targetDate = String(goal?.targetDate || fallback.targetDate).slice(0, 10);
  const type = String(goal?.type || fallback.type).slice(0, 32);
  return {
    type: type || fallback.type,
    targetAmount: Number.isFinite(targetAmount) && targetAmount >= 1000 ? Math.min(2_000_000, targetAmount) : fallback.targetAmount,
    targetDate: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : fallback.targetDate,
  };
}

function monthsUntil(asOf, targetDate) {
  const from = parseMonth(asOf);
  const to = parseMonth(targetDate);
  if (!from || !to) return 12;
  const delta = (to.y - from.y) * 12 + (to.m - from.m);
  return clamp(delta, MIN_MONTHS, MAX_MONTHS);
}

function addMonths(iso, count) {
  const parsed = parseMonth(iso) || { y: 2026, m: 9 };
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function parseMonth(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function narrate({ cashflow, goal, months, requiredMonthly, monthlyNet, onTrack, modeled, spendCutPct, lumpSum }) {
  const verb = onTrack ? "is on track to" : "does not yet";
  const cutBit = spendCutPct ? ` After a ${spendCutPct}% discretionary cut,` : "";
  const lumpBit = lumpSum ? ` Includes a ${formatMoney(lumpSum)} one-off contribution.` : "";
  return `${cashflow.label} ${verb} reach ${formatMoney(goal.targetAmount)} in ${months} months. Required monthly set-aside is ${formatMoney(requiredMonthly)}. Current modeled net is ${formatMoney(monthlyNet)}/month.${cutBit}${lumpBit} Ending cash ${formatMoney(modeled.endingBalance)}, lowest month ${formatMoney(modeled.minBalance)}.`;
}
