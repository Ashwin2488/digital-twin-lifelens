import { generateCustomerLedger } from "./ledgerFactory.js";

export const EVENT_TYPES = [
  "new-parent",
  "job-loss",
  "wedding",
  "home-purchase",
  "retirement",
  "business-owner",
  "medical",
  "relocation",
  "none",
];

const SPECS = [
  { id: "h-np-01", eventType: "new-parent", onsetMonth: "2026-03", seed: 101, employer: "AURORA MEDIA PTE LTD", payroll: 5400 },
  { id: "h-np-02", eventType: "new-parent", onsetMonth: "2026-02", seed: 102, employer: "QUAY DIGITAL PTE LTD", payroll: 6100 },
  { id: "h-np-03", eventType: "new-parent", onsetMonth: "2026-04", seed: 103, employer: "LUMEN HEALTH PTE LTD", payroll: 4900 },
  { id: "h-jl-01", eventType: "job-loss", onsetMonth: "2026-04", seed: 201, employer: "NORTHSTAR LOGISTICS", payroll: 7200, housing: 2400 },
  { id: "h-jl-02", eventType: "job-loss", onsetMonth: "2026-05", seed: 202, employer: "RIVERBEND TECH", payroll: 8100, housing: 1900 },
  { id: "h-jl-03", eventType: "job-loss", onsetMonth: "2026-03", seed: 203, employer: "CANOPY RETAIL PTE LTD", payroll: 5600, housing: 2200 },
  { id: "h-wd-01", eventType: "wedding", onsetMonth: "2026-02", seed: 301, employer: "HARBOR LAW LLC", payroll: 6900 },
  { id: "h-wd-02", eventType: "wedding", onsetMonth: "2026-03", seed: 302, employer: "PEAK ADVISORY", payroll: 6400 },
  { id: "h-wd-03", eventType: "wedding", onsetMonth: "2026-04", seed: 303, employer: "NOVA BRANDS", payroll: 5800 },
  { id: "h-hp-01", eventType: "home-purchase", onsetMonth: "2026-03", seed: 401, employer: "GREENFIELD ENGR", payroll: 7300 },
  { id: "h-hp-02", eventType: "home-purchase", onsetMonth: "2026-04", seed: 402, employer: "SABLE STUDIO", payroll: 5100 },
  { id: "h-rt-01", eventType: "retirement", onsetMonth: "2026-04", seed: 501, employer: "MINISTRY PENSION GIRO", payroll: 3200, housing: 0 },
  { id: "h-rt-02", eventType: "retirement", onsetMonth: "2026-02", seed: 502, employer: "CIVIL SERVICE PENSION", payroll: 2800, housing: 900 },
  { id: "h-bo-01", eventType: "business-owner", onsetMonth: "2026-03", seed: 601, employer: "OWN PTE LTD DIRECTOR FEE", payroll: 2500 },
  { id: "h-bo-02", eventType: "business-owner", onsetMonth: "2026-02", seed: 602, employer: "HAWKER CO-OP PAYOUT", payroll: 1800 },
  { id: "h-md-01", eventType: "medical", onsetMonth: "2026-03", seed: 701, employer: "EASTBAY SCHOOLS", payroll: 4700 },
  { id: "h-md-02", eventType: "medical", onsetMonth: "2026-05", seed: 702, employer: "MARINA OPS PTE LTD", payroll: 6200 },
  { id: "h-rl-01", eventType: "relocation", onsetMonth: "2026-03", seed: 801, employer: "APEX GLOBAL PTE LTD", payroll: 8800 },
  { id: "h-rl-02", eventType: "relocation", onsetMonth: "2026-04", seed: 802, employer: "HORIZON BANKING", payroll: 7600 },
  { id: "h-none-01", eventType: "none", onsetMonth: "2026-06", seed: 901, employer: "PEBBLE LABS PTE LTD", payroll: 5300 },
  { id: "h-none-02", eventType: "none", onsetMonth: "2026-06", seed: 902, employer: "WILLOW SCHOOLS", payroll: 4100 },
  { id: "h-none-03", eventType: "none", onsetMonth: "2026-06", seed: 903, employer: "TANDEM CONSULTING", payroll: 6700 },
  { id: "h-none-04", eventType: "none", onsetMonth: "2026-06", seed: 904, employer: "ORCHID PHARMA", payroll: 5900 },
  { id: "h-none-05", eventType: "none", onsetMonth: "2026-06", seed: 905, employer: "SOUTH PIER DESIGN", payroll: 4800 },
];

function labelFor(type) {
  return {
    "new-parent": "New dependant / childcare",
    "job-loss": "Income interruption",
    wedding: "Wedding spend cluster",
    "home-purchase": "Home purchase / renovation",
    retirement: "Retirement transition",
    "business-owner": "Self-employed cashflow",
    medical: "Major medical episode",
    relocation: "Relocation",
    none: "No life-event",
  }[type];
}

let cached = null;

export function getHoldoutSet() {
  if (cached) return cached;
  cached = SPECS.map((spec) => {
    const transactions = generateCustomerLedger(spec);
    return {
      id: spec.id,
      split: "holdout",
      groundTruth: {
        type: spec.eventType,
        label: labelFor(spec.eventType),
        onsetMonth: spec.onsetMonth,
        notes: "Unseen synthetic customer. Not used to tune hero detection weights.",
      },
      employer: spec.employer,
      transactionCount: transactions.length,
      accounts: [...new Set(transactions.map((t) => t.accountId))],
      transactions,
    };
  });
  return cached;
}

export function getHoldoutById(id) {
  return getHoldoutSet().find((row) => row.id === id);
}

export function holdoutSummary() {
  const rows = getHoldoutSet();
  const byType = {};
  for (const row of rows) {
    byType[row.groundTruth.type] = (byType[row.groundTruth.type] || 0) + 1;
  }
  return { size: rows.length, byType, ids: rows.map((r) => r.id) };
}
