import { isPayroll, monthOf } from "./features.js";

const NON_SPEND = new Set(["internal", "income", "partnerTransfer", "business_income"]);
const DISCRETIONARY = new Set([
  "dining",
  "grocery",
  "subscription",
  "cash",
  "travel",
  "shopping",
  "uncategorized",
  "transport",
]);

/** Ledger + optional persona/baseline → monthly cashflow the projection engine can run. */
export function buildCustomerCashflow(source = {}) {
  const txs = source.transactions || [];
  const persona = source.persona || {};
  const baseline = source.baseline || {};
  const monthCount = new Set(txs.map(monthOf).filter(Boolean)).size || 1;
  const payrollAvg = average(txs.filter(isPayroll).map((t) => t.amount).filter((v) => v > 0));
  const income = Number.isFinite(persona.monthlyIncome)
    ? persona.monthlyIncome
    : Number(baseline.avgMonthlyIncome) || payrollAvg;
  const spendTxs = txs.filter((t) => t.amount < 0 && !NON_SPEND.has(t.category));
  const ledgerSpend = Math.round(absSum(spendTxs) / monthCount);
  const recurringExpenses = Number(baseline.avgMonthlySpend) || ledgerSpend;
  const categoryMonthly = {};
  for (const t of spendTxs) {
    const category = t.category || "uncategorized";
    categoryMonthly[category] = (categoryMonthly[category] || 0) + Math.abs(t.amount);
  }
  for (const key of Object.keys(categoryMonthly)) {
    categoryMonthly[key] = Math.round(categoryMonthly[key] / monthCount);
  }
  const discretionaryMonthly = Object.entries(categoryMonthly).reduce(
    (sum, [category, amount]) => sum + (DISCRETIONARY.has(category) ? amount : 0),
    0
  );
  const startingBalance = Number.isFinite(baseline.liquidBalance)
    ? baseline.liquidBalance
    : lastRunningBalance(txs);

  return {
    customerId: source.id || "unknown",
    label: persona.fullName || source.employer || source.id || "Customer",
    eventType: source.eventType || null,
    income: Math.round(income || 0),
    recurringExpenses: Math.round(recurringExpenses || 0),
    discretionaryMonthly: Math.round(discretionaryMonthly),
    categoryMonthly,
    startingBalance: Math.round(startingBalance || 0),
    monthCount,
    asOf: lastDate(txs) || "2026-09-13",
  };
}

function absSum(txs) {
  return txs.reduce((n, t) => n + Math.abs(t.amount), 0);
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function lastRunningBalance(txs) {
  const withBal = txs.filter((t) => Number.isFinite(t.runningBalance));
  return withBal.at(-1)?.runningBalance || 0;
}

function lastDate(txs) {
  return txs.map((t) => t.postDate || t.date).filter(Boolean).sort().at(-1);
}
