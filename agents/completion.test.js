import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeInsuranceCover, protectionGapFromHoldings } from "../data/policyHoldings.js";
import { customerProfiles } from "../data/customer_profiles.js";
import { buildCreditProfile, allCreditProfiles } from "../data/creditProfile.js";
import { getIdentity } from "../data/identity.js";
import { PRODUCT_CATALOG } from "../data/productCatalog.js";
import { SPEND_BENCHMARK, buildDerivedProfile } from "../agents/derivedProfile.js";
import { buildCustomerIntelligence } from "../agents/intelligence.js";
import { scenarios } from "../data/scenarios.js";
import { answerAsFutureYou } from "../agents/future_you.js";
import { buildBranchingProjection } from "./projection.js";
import { assertNarrationGrounded } from "./narrationGuard.js";
import { loadCustomerSource } from "./goalPlan.js";
import { detectLifeEvents } from "./detector.js";
import { deriveFeatures } from "./features.js";

describe("policy holdings", () => {
  it("hero insurance cover matches the authored protection gap", () => {
    const amira = customerProfiles["new-parent"].baseline;
    expect(activeInsuranceCover("new-parent")).toBe(amira.protectionCover);
    expect(protectionGapFromHoldings("new-parent", amira.estimatedProtectionNeed)).toBe(amira.estimatedProtectionNeed - amira.protectionCover);
    expect(protectionGapFromHoldings("job-loss", customerProfiles["job-loss"].baseline.estimatedProtectionNeed)).toBe(70000);
    expect(protectionGapFromHoldings("wedding", customerProfiles.wedding.baseline.estimatedProtectionNeed)).toBe(50000);
  });
});

describe("credit profiles", () => {
  it("is deterministic and not taken from the ledger", () => {
    const a = buildCreditProfile("h-hp-01");
    const b = buildCreditProfile("h-hp-01");
    expect(a).toEqual(b);
    expect(a.source).toBe("synthetic-bureau");
    expect(allCreditProfiles()).toHaveLength(27);
    expect(getIdentity("new-parent").idMasked).not.toMatch(/^[STFG]\d{7}[A-Z]$/i);
    expect(getIdentity("h-hp-01").fullName).toBe("Wei Lin Chen");
    expect(getIdentity("h-hp-01").idMasked).not.toMatch(/^[STFG]\d{7}[A-Z]$/i);
  });
});

describe("product catalog", () => {
  it("has public eligibility flags and no customer fields", () => {
    expect(PRODUCT_CATALOG.length).toBeGreaterThan(8);
    expect(PRODUCT_CATALOG.every((p) => p.complianceFlags && !("customerId" in p))).toBe(true);
  });
});

describe("derived profile benchmark", () => {
  it("labels the DOS survey source instead of a naked recommended %", () => {
    expect(SPEND_BENCHMARK.source).toMatch(/Household Expenditure Survey/);
    const derived = buildDerivedProfile({
      features: { protectionGap: 420000 },
      cashflow: { income: 6200, recurringExpenses: 4650, categoryMonthly: { grocery: 400, housing: 900 } },
      event: { label: "New baby", confidence: 0.9, evidence: [] },
      persona: { dependants: 1, goals: ["Build family safety net"] },
    });
    expect(derived.spendMix.grocery.recommendedPct).toBe(SPEND_BENCHMARK.grocery);
    expect(derived.benchmarkSource).toBe(SPEND_BENCHMARK.source);
  });
});

describe("narration guardrails", () => {
  it("intelligence fallback only names eligible products", async () => {
    const intel = await buildCustomerIntelligence(customerProfiles["new-parent"], scenarios.find((s) => s.id === "new-parent"));
    expect(intel.citations.length).toBeGreaterThan(0);
    expect(intel.features.protectionGap).toBe(420000);
    const names = intel.products.map((p) => p.name);
    const check = assertNarrationGrounded(`${intel.ai.executiveSummary} ${Object.values(intel.ai.productNarratives).join(" ")}`, { productNames: names });
    expect(check.ok).toBe(true);
    expect(intel.ai.executiveSummary).toMatch(/ev-/);
  });

  it("Future You sentences each cite a traceability key", async () => {
    const scenario = scenarios.find((s) => s.id === "new-parent");
    const projection = buildBranchingProjection(scenario).ignored;
    const result = await answerAsFutureYou({ scenario, projection, question: "How different are the two futures?", sessionId: "test" });
    expect(result.sentences.length).toBeGreaterThan(1);
    expect(result.sentences.every((s) => s.cite)).toBe(true);
    expect(result.source).toMatch(/cached-demo/);
  });
});

describe("holdout loop + isolation", () => {
  it("ranks catalog products for a holdout with no authored candidates", async () => {
    const source = loadCustomerSource("h-hp-01");
    const intel = await buildCustomerIntelligence(source, null);
    expect(intel.event.id).toBe("home-purchase");
    expect(intel.products.length).toBeGreaterThan(0);
    expect(intel.persona.fullName).toBe("Wei Lin Chen");
  });

  it("cites statement ids on hero childcare evidence", () => {
    const profile = customerProfiles["new-parent"];
    const { primary } = detectLifeEvents(deriveFeatures(profile), profile);
    const childcare = primary.evidence.find((row) => /childcare/i.test(row.label));
    expect(childcare?.txnIds?.length).toBeGreaterThan(0);
  });

  it("intelligence and projection never import wearable or location modules", () => {
    const intel = readFileSync(new URL("./intelligence.js", import.meta.url), "utf8");
    const proj = readFileSync(new URL("./projection.js", import.meta.url), "utf8");
    expect(intel).not.toMatch(/wearable|biometric|locationDevice/);
    expect(proj).not.toMatch(/wearable|biometric|locationDevice/);
  });
});

describe("shared plans", () => {
  it("stores the customer's plain-language intent on the queued handoff", async () => {
    const { sharePlan, resetSharedPlans, listPlans } = await import("./sharedPlans.js");
    resetSharedPlans();
    sharePlan({
      customerId: "h-hp-01",
      label: "Wei Lin Chen · I want to buy a home",
      userIntent: "I want to buy a home in 3 years",
      onTrack: true,
      endingBalance: 12000,
    });
    expect(listPlans()[0].userIntent).toMatch(/buy a home/);
    resetSharedPlans();
  });
});
