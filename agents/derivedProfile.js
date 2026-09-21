/**
 * Spend-mix benchmark source: illustrative shares aligned to the published
 * Singapore Department of Statistics Household Expenditure Survey *broad group*
 * weights (housing, food, transport dominate), rescaled to the categories this
 * ledger actually posts. This is a comparison benchmark, not a recommended
 * budget and not advice.
 *
 * Source: DOS Household Expenditure Survey (public tables) — housing / food /
 * transport as the three largest groups. Remaining mass split across the
 * classified residual categories in this demo book.
 */
export const SPEND_BENCHMARK = {
  source: "DOS Household Expenditure Survey — illustrative broad-group weights, not a recommended budget",
  housing: 0.3,
  grocery: 0.18,
  dining: 0.08,
  transport: 0.12,
  utilities: 0.06,
  subscription: 0.03,
  healthcare: 0.05,
  childcare: 0.04,
  travel: 0.05,
  other: 0.09,
};

export function buildDerivedProfile({ features = {}, cashflow, event, persona = {} }) {
  const income = cashflow?.income || features.priorPayrollAverage || 0;
  const spend = cashflow?.recurringExpenses || 0;
  const surplus = income - spend;
  const mix = spendMix(cashflow?.categoryMonthly || {});
  return {
    lifeStage: {
      label: event?.label || "No strong life-event",
      confidence: event?.confidence || 0,
      evidence: event?.evidence || [],
    },
    spendPower: {
      monthlySurplus: surplus,
      savingsRate: income ? Number((surplus / income).toFixed(3)) : 0,
      spendToIncomeRatio: income ? Number((spend / income).toFixed(3)) : 0,
    },
    spendMix: mix,
    protectionGap: features.protectionGap || 0,
    lifestyleTags: lifestyleTags(mix, persona),
    hobbiesGoals: [...new Set([...(persona.goals || []), ...hobbyFromMix(mix)])],
    benchmarkSource: SPEND_BENCHMARK.source,
  };
}

function spendMix(categoryMonthly) {
  const total = Object.values(categoryMonthly).reduce((n, v) => n + v, 0) || 1;
  const out = {};
  for (const [category, amount] of Object.entries(categoryMonthly)) {
    const actualPct = Number((amount / total).toFixed(3));
    const recommendedPct = SPEND_BENCHMARK[category] ?? SPEND_BENCHMARK.other;
    out[category] = { actualPct, recommendedPct, delta: Number((actualPct - recommendedPct).toFixed(3)) };
  }
  return out;
}

function lifestyleTags(mix, persona) {
  const tags = [];
  if ((mix.childcare?.actualPct || 0) > 0.08) tags.push("caregiving-heavy");
  if ((mix.dining?.actualPct || 0) > 0.12) tags.push("eat-out");
  if ((mix.travel?.actualPct || 0) > 0.08) tags.push("travel-active");
  if (persona.dependants >= 1) tags.push("family");
  return tags;
}

function hobbyFromMix(mix) {
  if ((mix.travel?.actualPct || 0) > 0.08) return ["Travel"];
  if ((mix.dining?.actualPct || 0) > 0.1) return ["Dining"];
  return [];
}
