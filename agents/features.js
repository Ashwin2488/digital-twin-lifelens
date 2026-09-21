export function deriveFeatures(profile = {}) {
  const txs = profile.transactions || [];
  const persona = profile.persona || {};
  const baseline = profile.baseline || {};
  const by = (c) => txs.filter((t) => t.category === c);
  const sum = (c) => Math.abs(by(c).reduce((n, t) => n + t.amount, 0));
  const income = by("income").map((t) => t.amount).filter((v) => v > 0);
  const payroll = by("income").filter((t) => isPayroll(t) && t.amount > 0).map((t) => t.amount);
  const recentIncome = income.at(-1) || 0;
  const dates = txs.map((t) => t.date || t.postDate).filter(Boolean).sort();
  const healthcareTxs = by("healthcare").filter((t) => t.amount < 0);

  return {
    transactionWindowDays: dates.length ? daysBetween(dates[0], dates.at(-1)) : 0,
    childcareRecurringMonths: new Set(by("childcare").map(monthOf)).size,
    babySpendTotal: sum("baby"),
    babySpendGrowth: categorySpendGrowth(txs, "baby"),
    missingPayrollCycles: countMissingPayrollCycles(txs),
    priorPayrollAverage: payroll.length ? Math.round(payroll.reduce((a, b) => a + b, 0) / payroll.length) : 0,
    recentObservedIncome: recentIncome,
    weddingSpend90d: sum("wedding"),
    partnerContributionMonths: new Set(by("partnerTransfer").map(monthOf)).size,
    partnerContributions: by("partnerTransfer").reduce((n, t) => n + t.amount, 0),
    monthlySurplus: (persona.monthlyIncome || 0) - (baseline.avgMonthlySpend || 0),
    protectionGap: Math.max(0, (baseline.estimatedProtectionNeed || 0) - (baseline.protectionCover || 0)),
    emergencyFundMonths: baseline.emergencyFundMonths || 0,
    transactionCount: txs.length,
    accountCount: new Set(txs.map((t) => t.accountId).filter(Boolean)).size,
    healthcareSpend: sum("healthcare"),
    maxHealthcareTx: healthcareTxs.reduce((m, t) => Math.max(m, Math.abs(t.amount)), 0),
    homeSpend: sum("home"),
    housingSpend: sum("housing"),
    propertyEventSpend: propertyEventSpend(txs),
    businessIncome: by("business_income").filter((t) => t.amount > 0).reduce((n, t) => n + t.amount, 0),
    taxSpend: sum("tax"),
    travelSpend: sum("travel"),
    relocationSpend: sum("relocation"),
  };
}

export function merchantOf(t) {
  return t.merchantRaw || t.description || "";
}

export function isPayroll(t) {
  return t.amount > 0 && /PAYROLL|SALARY/i.test(merchantOf(t)) && !/SEVERANCE|HR PAYOUT/i.test(merchantOf(t));
}

export function monthOf(t) {
  return (t.date || t.postDate || "").slice(0, 7);
}

export function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

export function categorySpendGrowth(txs, category) {
  const byMonth = {};
  for (const t of txs) {
    if (t.category !== category || t.amount >= 0) continue;
    const month = monthOf(t);
    byMonth[month] = (byMonth[month] || 0) + Math.abs(t.amount);
  }
  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return 0;
  return Math.round(byMonth[months.at(-1)] - byMonth[months[0]]);
}

export function countMissingPayrollCycles(txs) {
  const payroll = txs.filter(isPayroll);
  if (!payroll.length) return 0;
  const first = payroll.map(monthOf).sort()[0];
  const last = txs.map(monthOf).filter(Boolean).sort().at(-1);
  const have = new Set(payroll.map(monthOf));
  let missing = 0;
  for (const month of monthsInclusive(first, last)) if (!have.has(month)) missing += 1;
  return missing;
}

function propertyEventSpend(txs) {
  return Math.abs(
    txs
      .filter((t) => /PROP\s*NEX|PROPNEX|ERA REALTY|RENOVATION|HDB MORTGAGE|IKEA/i.test(merchantOf(t)))
      .reduce((n, t) => n + t.amount, 0)
  );
}

function monthsInclusive(start, end) {
  const out = [];
  const cursor = new Date(`${start}-01T00:00:00Z`);
  const stop = new Date(`${end}-01T00:00:00Z`);
  while (cursor <= stop) {
    out.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}
