import { describe, expect, it } from "vitest";
import { evaluateAchievements } from "./achievements.js";
import { buildCustomerCashflow } from "./cashflow.js";
import { planGoalForCustomer } from "./goalPlan.js";
import { customerProfiles } from "../data/customer_profiles.js";
import { buildBranchingProjection } from "./projection.js";
import { scenarios } from "../data/scenarios.js";

describe("goal plan", () => {
  it("plans any hero ledger without a prepared scenario cashflow", () => {
    const plan = planGoalForCustomer("new-parent", {
      goal: { type: "emergency", targetAmount: 27900, targetDate: "2027-09-01" },
      levers: { spendCutPct: 0, extraMonthly: 0 },
    });
    expect(plan.persisted).toBe(false);
    expect(plan.cashflow.income).toBe(6200);
    expect(plan.cashflow.recurringExpenses).toBe(4650);
    expect(plan.modeled.trajectory.length).toBeGreaterThanOrEqual(3);
    expect(plan.requiredMonthly).toBeGreaterThan(0);
    expect(plan.copy).toMatch(/\$27,900/);
  });

  it("runs on an unseen holdout with no persona", () => {
    const plan = planGoalForCustomer("h-hp-01", {
      goal: { type: "home", targetAmount: 40000, targetDate: "2027-09-01" },
      levers: { spendCutPct: 10, extraMonthly: 200 },
    });
    expect(plan.customerId).toBe("h-hp-01");
    expect(plan.cashflow.income).toBeGreaterThan(0);
    expect(plan.modeled.endingBalance).not.toBeNull();
    expect(plan.levers.spendCutAmount).toBeGreaterThanOrEqual(0);
  });

  it("a spend cut raises ending cash vs the ignored path", () => {
    const base = planGoalForCustomer("wedding", {
      goal: { type: "savings", targetAmount: 20000, targetDate: "2027-09-01" },
      levers: { spendCutPct: 0 },
    });
    const cut = planGoalForCustomer("wedding", {
      goal: { type: "savings", targetAmount: 20000, targetDate: "2027-09-01" },
      levers: { spendCutPct: 30 },
    });
    expect(cut.modeled.endingBalance).toBeGreaterThan(base.modeled.endingBalance);
    expect(cut.delta.endingBalance).toBeGreaterThan(0);
  });

  it("a longer horizon lowers the required monthly set-aside", () => {
    const short = planGoalForCustomer("new-parent", {
      goal: { type: "savings", targetAmount: 40000, targetDate: "2027-03-01" },
    });
    const long = planGoalForCustomer("new-parent", {
      goal: { type: "savings", targetAmount: 40000, targetDate: "2028-09-01" },
    });
    expect(long.requiredMonthly).toBeLessThan(short.requiredMonthly);
  });
});

describe("achievements", () => {
  it("fires 6-month buffer only when projected cash covers 6 months of spend", () => {
    expect(evaluateAchievements({ emergencyFundMonths: 5.9, minBalance: 100, onTrack: true, monthlyNet: 100 }).find((a) => a.id === "emergency-6").earned).toBe(false);
    expect(evaluateAchievements({ emergencyFundMonths: 6, minBalance: 100, onTrack: true, monthlyNet: 100 }).find((a) => a.id === "emergency-6").earned).toBe(true);
    expect(evaluateAchievements({ emergencyFundMonths: 8, minBalance: -1, onTrack: false, monthlyNet: 10 }).find((a) => a.id === "stayed-liquid").earned).toBe(false);
  });

  it("hero cashflow snapshot is derived from the ledger, not a second game state", () => {
    const cashflow = buildCustomerCashflow({ id: "new-parent", eventType: "new-parent", ...customerProfiles["new-parent"] });
    expect(cashflow.startingBalance).toBe(customerProfiles["new-parent"].baseline.liquidBalance);
    expect(cashflow.income).toBe(6200);
  });
});

describe("existing hero projection still branches", () => {
  it("ignored vs accepted still moves Amira's 12-month path", () => {
    const projection = buildBranchingProjection(scenarios.find((s) => s.id === "new-parent"));
    expect(projection.accepted.endingBalance).not.toBe(projection.ignored.endingBalance);
  });
});
