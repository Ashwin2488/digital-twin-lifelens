import { describe, expect, it } from "vitest";
import { EVENT_TYPES, getHoldoutSet, holdoutSummary } from "./holdout.js";

describe("holdout set", () => {
  it("labels unseen customers across known and new life events", () => {
    const rows = getHoldoutSet();
    const summary = holdoutSummary();
    expect(summary.size).toBe(24);
    for (const type of EVENT_TYPES) {
      expect(summary.byType[type], type).toBeGreaterThanOrEqual(1);
    }
    expect(rows.every((row) => row.split === "holdout" && row.transactions.length > 10)).toBe(true);
    expect(rows.every((row) => row.groundTruth.onsetMonth && row.groundTruth.type)).toBe(true);
    expect(rows.some((row) => /Amira Malik|Daniel Tan|Priya Shah/.test(row.employer))).toBe(false);
  });

  it("does not pre-label transactions with the ground-truth event type", () => {
    const home = getHoldoutSet().find((row) => row.id === "h-hp-01");
    expect(home.groundTruth.type).toBe("home-purchase");
    expect(home.transactions.every((t) => t.category !== "home-purchase")).toBe(true);
    expect(home.transactions.some((t) => t.category === "housing" || t.category === "home")).toBe(true);
  });
});
