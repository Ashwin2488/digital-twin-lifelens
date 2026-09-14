import { describe, expect, it } from "vitest";
import {
  categorySpendGrowth,
  countMissingPayrollCycles,
  daysBetween,
  deriveFeatures,
  isPayroll,
  monthOf,
} from "./features.js";

describe("isPayroll", () => {
  it("matches a positive salary/payroll credit", () => {
    expect(isPayroll({ amount: 6000, merchantRaw: "ACME CORP PAYROLL" })).toBe(true);
    expect(isPayroll({ amount: 6000, merchantRaw: "SALARY GIRO" })).toBe(true);
  });

  it("excludes severance/HR payouts even if they mention payroll-like words", () => {
    expect(isPayroll({ amount: 6000, merchantRaw: "HR PAYOUT SEVERANCE" })).toBe(false);
  });

  it("excludes negative amounts", () => {
    expect(isPayroll({ amount: -6000, merchantRaw: "PAYROLL" })).toBe(false);
  });
});

describe("monthOf / daysBetween", () => {
  it("extracts YYYY-MM from a postDate or date field", () => {
    expect(monthOf({ postDate: "2026-03-15" })).toBe("2026-03");
    expect(monthOf({ date: "2026-07-01" })).toBe("2026-07");
  });

  it("computes whole days between two dates, minimum 1", () => {
    expect(daysBetween("2026-01-01", "2026-01-11")).toBe(10);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(1);
  });
});

describe("categorySpendGrowth", () => {
  it("returns the spend delta between the first and last month with activity", () => {
    const txs = [
      { postDate: "2026-01-05", category: "baby", amount: -100 },
      { postDate: "2026-02-05", category: "baby", amount: -100 },
      { postDate: "2026-03-05", category: "baby", amount: -400 },
    ];
    expect(categorySpendGrowth(txs, "baby")).toBe(300);
  });

  it("returns 0 when there is only one month of activity", () => {
    const txs = [{ postDate: "2026-01-05", category: "baby", amount: -100 }];
    expect(categorySpendGrowth(txs, "baby")).toBe(0);
  });
});

describe("countMissingPayrollCycles", () => {
  it("counts months between the first payroll and the last transaction with no payroll credit", () => {
    const txs = [
      { postDate: "2026-01-05", amount: 6000, merchantRaw: "ACME PAYROLL" },
      { postDate: "2026-02-05", amount: -50, merchantRaw: "GROCERY" },
      { postDate: "2026-03-05", amount: -50, merchantRaw: "GROCERY" },
    ];
    expect(countMissingPayrollCycles(txs)).toBe(2);
  });

  it("returns 0 when there is no payroll at all (nothing to be missing relative to)", () => {
    const txs = [{ postDate: "2026-01-05", amount: -50, merchantRaw: "GROCERY" }];
    expect(countMissingPayrollCycles(txs)).toBe(0);
  });
});

describe("deriveFeatures", () => {
  it("returns zeroed-out features for an empty profile without throwing", () => {
    const features = deriveFeatures({});
    expect(features.transactionCount).toBe(0);
    expect(features.transactionWindowDays).toBe(0);
    expect(features.babySpendTotal).toBe(0);
  });

  it("sums category spend as a positive number regardless of the negative ledger sign", () => {
    const features = deriveFeatures({
      transactions: [
        { postDate: "2026-01-05", category: "baby", amount: -200 },
        { postDate: "2026-02-05", category: "baby", amount: -300 },
      ],
    });
    expect(features.babySpendTotal).toBe(500);
  });
});
