import { describe, expect, it } from "vitest";
import { customerProfiles } from "../data/customer_profiles.js";
import { deriveFeatures } from "./features.js";
import { detectLifeEvents, evaluateHoldout, legacyDetectLifeEvent } from "./detector.js";
import { scenarios } from "../data/scenarios.js";

describe("generalized detector", () => {
  it("picks the hero events without being told the scenario id", () => {
    const amira = detectLifeEvents(deriveFeatures(customerProfiles["new-parent"]), customerProfiles["new-parent"]);
    expect(amira.primary.id).toBe("new-parent");
    expect(amira.primary.confidence).toBeGreaterThan(0.7);
    expect(amira.primary.evidence.every((e) => typeof e.scoreWeight === "number")).toBe(true);
    const weightSum = amira.primary.evidence.reduce((n, e) => n + e.scoreWeight, 0);
    expect(amira.primary.confidence).toBeCloseTo(Math.min(0.98, weightSum), 5);

    const daniel = detectLifeEvents(deriveFeatures(customerProfiles["job-loss"]), customerProfiles["job-loss"]);
    expect(daniel.primary.id).toBe("job-loss");
    expect(daniel.primary.confidence).toBeGreaterThan(0.7);

    const priya = detectLifeEvents(deriveFeatures(customerProfiles.wedding), customerProfiles.wedding);
    expect(priya.primary.id).toBe("wedding");
    expect(priya.primary.confidence).toBeGreaterThan(0.7);
  });

  it("legacy detector still requires a scenario id and stays available for before/after", () => {
    const scenario = scenarios.find((s) => s.id === "wedding");
    const f = deriveFeatures(customerProfiles.wedding);
    const legacy = legacyDetectLifeEvent(customerProfiles.wedding, scenario, f);
    expect(legacy.id).toBe("wedding");
    expect(legacy.confidence).toBeGreaterThan(0.7);
  });

  it("reports holdout precision/recall instead of guessing", () => {
    const report = evaluateHoldout();
    expect(report.size).toBe(24);
    expect(report.precision).toBeGreaterThan(0.4);
    expect(report.recall).toBeGreaterThan(0.4);
    const known = report.results.filter((r) => ["new-parent", "job-loss", "wedding"].includes(r.truth));
    const knownHits = known.filter((r) => r.correct).length;
    expect(knownHits).toBeGreaterThanOrEqual(6);
  });
});
