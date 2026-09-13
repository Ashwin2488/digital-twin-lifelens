import { describe, expect, it } from "vitest";
import { customerProfiles } from "../data/customer_profiles.js";
import { scenarios } from "../data/scenarios.js";
import { buildCustomerIntelligence, deriveFeatures } from "./intelligence.js";

function scenario(id) {
  return scenarios.find((s) => s.id === id);
}

describe("hero intelligence still fires on classified ledgers", () => {
  it("derives baby growth and missing payroll from the ledger, not constants", () => {
    const amira = deriveFeatures(customerProfiles["new-parent"]);
    expect(amira.babySpendGrowth).toBeGreaterThan(250);
    expect(amira.childcareRecurringMonths).toBeGreaterThanOrEqual(2);
    expect(amira.accountCount).toBeGreaterThan(1);

    const daniel = deriveFeatures(customerProfiles["job-loss"]);
    expect(daniel.missingPayrollCycles).toBeGreaterThanOrEqual(2);
    expect(daniel.recentObservedIncome).toBeLessThan(daniel.priorPayrollAverage * 0.5);
  });

  it("keeps the three demo detections above the existing score gates", async () => {
    const amira = await buildCustomerIntelligence(customerProfiles["new-parent"], scenario("new-parent"));
    expect(amira.event.confidence).toBeGreaterThan(0.7);
    expect(amira.event.evidence.length).toBeGreaterThanOrEqual(2);

    const daniel = await buildCustomerIntelligence(customerProfiles["job-loss"], scenario("job-loss"));
    expect(daniel.event.confidence).toBeGreaterThan(0.7);
    expect(daniel.event.evidence.some((e) => /Payroll interruption/i.test(e.label))).toBe(true);

    const priya = await buildCustomerIntelligence(customerProfiles.wedding, scenario("wedding"));
    expect(priya.event.confidence).toBeGreaterThan(0.7);
    expect(priya.event.evidence.some((e) => /Wedding/i.test(e.label))).toBe(true);
  });
});
