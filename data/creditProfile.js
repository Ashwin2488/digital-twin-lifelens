import { mulberry32 } from "./ledgerFactory.js";
import { HOLDINGS } from "./policyHoldings.js";

const HERO_IDS = ["new-parent", "job-loss", "wedding"];
const HOLDOUT_IDS = [
  "h-np-01", "h-np-02", "h-np-03",
  "h-jl-01", "h-jl-02", "h-jl-03",
  "h-wd-01", "h-wd-02", "h-wd-03",
  "h-hp-01", "h-hp-02",
  "h-rt-01", "h-rt-02",
  "h-bo-01", "h-bo-02",
  "h-md-01", "h-md-02",
  "h-rl-01", "h-rl-02",
  "h-none-01", "h-none-02", "h-none-03", "h-none-04", "h-none-05",
];

/** Synthetic bureau-style profile. Not derived from the ledger. */
export function buildCreditProfile(customerId, seed = seedFromId(customerId)) {
  const rng = mulberry32(seed);
  const bureauScore = Math.round(520 + rng() * 280);
  const band = bureauScore >= 750 ? "excellent" : bureauScore >= 680 ? "good" : bureauScore >= 600 ? "fair" : "poor";
  return {
    customerId,
    bureauScore,
    scoreBand: band,
    utilizationRatio: Number((0.12 + rng() * 0.55).toFixed(2)),
    delinquencies90d: rng() > 0.85 ? 1 : 0,
    activeInquiries6m: Math.floor(rng() * 4),
    totalUnsecuredDebt: Math.round(rng() * 28000),
    totalSecuredDebt: HOLDINGS[customerId]?.find((h) => h.category === "loan")?.outstandingBalance || Math.round(rng() * 12000),
    source: "synthetic-bureau",
  };
}

export function getCreditProfile(customerId) {
  return buildCreditProfile(customerId);
}

export function allCreditProfiles() {
  return [...HERO_IDS, ...HOLDOUT_IDS].map((id) => buildCreditProfile(id));
}

function seedFromId(id) {
  let n = 17;
  for (const ch of id) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
  return n;
}
