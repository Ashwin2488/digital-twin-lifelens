import { describe, expect, it } from "vitest";
import { appliesInMonth, buildBranchingProjection, projectWithActions } from "./projection.js";

describe("appliesInMonth", () => {
  it("respects an explicit startsMonth/endsMonth window", () => {
    const item = { startsMonth: 2, endsMonth: 4 };
    expect(appliesInMonth(item, 1)).toBe(false);
    expect(appliesInMonth(item, 2)).toBe(true);
    expect(appliesInMonth(item, 4)).toBe(true);
    expect(appliesInMonth(item, 5)).toBe(false);
  });

  it("treats an autopilot action (monthlyImpact) as indefinite without an explicit endsMonth", () => {
    expect(appliesInMonth({ monthlyImpact: 100, startsMonth: 1 }, 36)).toBe(true);
  });

  it("treats a one-off scenario event (a single month, not repeating) as ending after its own month", () => {
    expect(appliesInMonth({ month: 3, amount: -500 }, 3)).toBe(true);
    expect(appliesInMonth({ month: 3, amount: -500 }, 4)).toBe(false);
  });
});

describe("projectWithActions", () => {
  const flatScenario = { id: "s", startingBalance: 1000, income: 500, recurringExpenses: 500, monthlyEvents: [] };

  it("holds the balance flat when income equals expenses and there are no actions", () => {
    const result = projectWithActions(flatScenario, [], { months: 3 });
    expect(result.trajectory).toHaveLength(3);
    expect(result.endingBalance).toBe(1000);
    expect(result.overdraftMonth).toBeNull();
  });

  it("detects the first month the balance goes negative", () => {
    const scenario = { id: "s", startingBalance: 100, income: 0, recurringExpenses: 200, monthlyEvents: [] };
    const result = projectWithActions(scenario, [], { months: 3 });
    expect(result.overdraftMonth).toBe(1);
    expect(result.minBalance).toBeLessThan(0);
  });

  it("only applies a monthly action's impact inside its own active window", () => {
    const scenario = { id: "s", startingBalance: 0, income: 0, recurringExpenses: 0, monthlyEvents: [] };
    const oneOff = [{ id: "lump", monthlyImpact: 100, startsMonth: 1, endsMonth: 1 }];
    const result = projectWithActions(scenario, oneOff, { months: 2 });
    expect(result.trajectory[0].projectedBalance).toBe(100);
    expect(result.trajectory[1].projectedBalance).toBe(100);
    expect(result.trajectory[1].actionAdjustment).toBe(0);
  });

  it("compounds a repeating extra-save action across every month", () => {
    const scenario = { id: "s", startingBalance: 0, income: 0, recurringExpenses: 0, monthlyEvents: [] };
    const repeating = [{ id: "save", monthlyImpact: 50, startsMonth: 1 }];
    const result = projectWithActions(scenario, repeating, { months: 4 });
    expect(result.endingBalance).toBe(200);
  });
});

describe("buildBranchingProjection", () => {
  it("shows the accepted path ending higher than the ignored path when autopilot actions help", () => {
    const scenario = {
      id: "s1",
      startingBalance: 500,
      income: 1000,
      recurringExpenses: 900,
      monthlyEvents: [],
      autopilotActions: [{ id: "a", monthlyImpact: 200, startsMonth: 1 }],
    };
    const result = buildBranchingProjection(scenario, 2);
    expect(result.accepted.endingBalance).toBeGreaterThan(result.ignored.endingBalance);
    expect(result.delta.endingBalance).toBeGreaterThan(0);
  });

  it("reports overdraftAvoided only when ignored dips negative and accepted does not", () => {
    const scenario = {
      id: "s2",
      startingBalance: 100,
      income: 0,
      recurringExpenses: 200,
      monthlyEvents: [],
      autopilotActions: [{ id: "relief", monthlyImpact: 300, startsMonth: 1 }],
    };
    const result = buildBranchingProjection(scenario, 2);
    expect(result.ignored.overdraftMonth).not.toBeNull();
    expect(result.accepted.overdraftMonth).toBeNull();
    expect(result.delta.overdraftAvoided).toBe(true);
  });
});
