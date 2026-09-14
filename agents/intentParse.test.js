import { describe, expect, it } from "vitest";
import { intentToGoal, parseLifeIntentFallback } from "./intentParse.js";

describe("life intent fallback", () => {
  it("maps 'I am going to be a parent' to an emergency / new-parent goal", () => {
    const intent = parseLifeIntentFallback("I am going to be a parent next year");
    expect(intent.type).toBe("emergency");
    expect(intent.eventHint).toBe("new-parent");
    expect(intent.targetAmount).toBeNull();
  });

  it("reads a stated house amount and horizon", () => {
    const intent = parseLifeIntentFallback("I want to buy a house, save $50k in 3 years");
    expect(intent.type).toBe("home");
    expect(intent.eventHint).toBe("home-purchase");
    expect(intent.targetAmount).toBe(50000);
    expect(intent.horizonYears).toBe(3);
    const goal = intentToGoal(intent, { type: "savings", targetAmount: 20000, targetDate: "2027-09-01", asOf: "2026-09-01" });
    expect(goal.type).toBe("home");
    expect(goal.targetAmount).toBe(50000);
    expect(goal.targetDate).toBe("2029-09-01");
  });
});
