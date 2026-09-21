import { describe, expect, it } from "vitest";
import { buildCustomerCashflow } from "./cashflow.js";

const baseTxs = [
  { postDate: "2026-01-01", category: "income", amount: 5000, merchantRaw: "ACME PAYROLL" },
  { postDate: "2026-01-05", category: "grocery", amount: -300 },
  { postDate: "2026-01-10", category: "dining", amount: -200 },
  { postDate: "2026-02-01", category: "income", amount: 5000, merchantRaw: "ACME PAYROLL" },
  { postDate: "2026-02-05", category: "grocery", amount: -300 },
  { postDate: "2026-02-10", category: "dining", amount: -200 },
];

describe("buildCustomerCashflow", () => {
  it("derives income from payroll credits and monthly spend from non-income categories", () => {
    const cashflow = buildCustomerCashflow({ id: "c1", transactions: baseTxs });
    expect(cashflow.income).toBe(5000);
    expect(cashflow.recurringExpenses).toBe(500);
    expect(cashflow.discretionaryMonthly).toBe(500);
    expect(cashflow.monthCount).toBe(2);
  });

  it("prefers an explicit persona.monthlyIncome / baseline over ledger-derived numbers", () => {
    const cashflow = buildCustomerCashflow({
      id: "c2",
      transactions: baseTxs,
      persona: { monthlyIncome: 9999 },
      baseline: { avgMonthlySpend: 1234, liquidBalance: 42 },
    });
    expect(cashflow.income).toBe(9999);
    expect(cashflow.recurringExpenses).toBe(1234);
    expect(cashflow.startingBalance).toBe(42);
  });

  it("excludes income and internal transfers from spend/discretionary totals", () => {
    const cashflow = buildCustomerCashflow({
      id: "c3",
      transactions: [
        ...baseTxs,
        { postDate: "2026-02-15", category: "internal", amount: -1000 },
        { postDate: "2026-02-16", category: "partnerTransfer", amount: 700 },
      ],
    });
    expect(cashflow.recurringExpenses).toBe(500);
  });

  it("falls back to the last running balance when no baseline liquidBalance is supplied", () => {
    const cashflow = buildCustomerCashflow({
      id: "c4",
      transactions: [{ postDate: "2026-01-01", category: "grocery", amount: -100, runningBalance: 777 }],
    });
    expect(cashflow.startingBalance).toBe(777);
  });

  it("never throws on an empty source", () => {
    const cashflow = buildCustomerCashflow({});
    expect(cashflow.customerId).toBe("unknown");
    expect(cashflow.income).toBe(0);
    expect(cashflow.monthCount).toBe(1);
  });
});
