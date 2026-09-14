/**
 * Products the customer already owns. Separate from `customer_profiles.candidates`
 * (recommendable, not held).
 */
const HERO = {
  "new-parent": [
    holding("new-parent", "PA-BASIC", "insurance", 180000, { premiumOrContribution: 85, startDate: "2021-04-01" }),
    holding("new-parent", "EVERYDAY", "deposit", 14200, { startDate: "2019-05-01" }),
  ],
  "job-loss": [
    holding("job-loss", "TERM-FAMILY", "insurance", 450000, { premiumOrContribution: 210, startDate: "2018-11-01" }),
    holding("job-loss", "MORTGAGEONE", "loan", 0, { outstandingBalance: 221000, tenorMonths: 216, startDate: "2017-06-01" }),
    holding("job-loss", "TD-12M", "deposit", 40000, { startDate: "2024-01-15" }),
  ],
  wedding: [
    holding("wedding", "PA-TRAVEL", "insurance", 250000, { premiumOrContribution: 42, startDate: "2023-02-01" }),
    holding("wedding", "GROWTH-UT", "investment", 38000, { startDate: "2022-08-01" }),
  ],
};

const HOLDOUT_SAMPLE = {
  "h-hp-01": [
    holding("h-hp-01", "PA-BASIC", "insurance", 120000, { premiumOrContribution: 55, startDate: "2020-03-01" }),
    holding("h-hp-01", "MORTGAGEONE", "loan", 0, { outstandingBalance: 480000, tenorMonths: 300, startDate: "2024-01-01" }),
  ],
  "h-jl-01": [
    holding("h-jl-01", "TERM-FAMILY", "insurance", 200000, { premiumOrContribution: 95, startDate: "2019-09-01" }),
  ],
  "h-none-01": [
    holding("h-none-01", "PA-BASIC", "insurance", 80000, { premiumOrContribution: 28, startDate: "2022-01-01" }),
  ],
};

export const HOLDINGS = { ...HERO, ...HOLDOUT_SAMPLE };

export function holdingsFor(customerId) {
  return HOLDINGS[customerId] || [];
}

export function activeInsuranceCover(customerId) {
  return holdingsFor(customerId)
    .filter((row) => row.category === "insurance" && row.status === "active")
    .reduce((n, row) => n + (row.sumAssuredOrAUM || 0), 0);
}

export function protectionGapFromHoldings(customerId, estimatedNeed) {
  return Math.max(0, Number(estimatedNeed || 0) - activeInsuranceCover(customerId));
}

function holding(customerId, productCode, category, sumAssuredOrAUM, extra = {}) {
  return {
    id: `${customerId}-${productCode}`,
    customerId,
    productCode,
    category,
    status: extra.status || "active",
    startDate: extra.startDate,
    premiumOrContribution: extra.premiumOrContribution,
    sumAssuredOrAUM,
    outstandingBalance: extra.outstandingBalance,
    tenorMonths: extra.tenorMonths,
  };
}
