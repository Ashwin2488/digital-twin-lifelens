import { describe, expect, it } from "vitest";
import { buildDerivedProfile, SPEND_BENCHMARK } from "./derivedProfile.js";

describe("SPEND_BENCHMARK", () => {
  it("labels its source so the UI never shows an unlabelled hardcoded budget", () => {
    expect(SPEND_BENCHMARK.source).toMatch(/DOS Household Expenditure Survey/);
  });
});

describe("buildDerivedProfile", () => {
  it("computes spend power and a spend mix against the benchmark", () => {
    const profile = buildDerivedProfile({
      features: { protectionGap: 50000 },
      cashflow: { income: 5000, recurringExpenses: 3000, categoryMonthly: { grocery: 600, dining: 400 } },
      event: { label: "New parent", confidence: 0.8, evidence: [] },
      persona: { goals: ["Travel more"] },
    });
    expect(profile.spendPower.monthlySurplus).toBe(2000);
    expect(profile.spendPower.savingsRate).toBeCloseTo(0.4, 2);
    expect(profile.protectionGap).toBe(50000);
    expect(profile.spendMix.grocery.actualPct).toBeCloseTo(0.6, 2);
    expect(profile.benchmarkSource).toBe(SPEND_BENCHMARK.source);
  });

  it("tags caregiving-heavy and family lifestyle from the mix + persona, not raw amounts", () => {
    const profile = buildDerivedProfile({
      features: {},
      cashflow: { income: 5000, recurringExpenses: 3000, categoryMonthly: { childcare: 900, grocery: 100 } },
      persona: { dependants: 1 },
    });
    expect(profile.lifestyleTags).toContain("caregiving-heavy");
    expect(profile.lifestyleTags).toContain("family");
  });

  it("de-duplicates persona goals against mix-derived hobbies", () => {
    const profile = buildDerivedProfile({
      features: {},
      cashflow: { income: 4000, recurringExpenses: 2000, categoryMonthly: { travel: 500 } },
      persona: { goals: ["Travel"] },
    });
    expect(profile.hobbiesGoals.filter((g) => g === "Travel")).toHaveLength(1);
  });

  it("never throws when cashflow/features are missing", () => {
    const profile = buildDerivedProfile({});
    expect(profile.spendPower.monthlySurplus).toBe(0);
    expect(profile.spendMix).toEqual({});
  });
});
