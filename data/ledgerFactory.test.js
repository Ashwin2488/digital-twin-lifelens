import { describe, expect, it } from "vitest";
import { generateCustomerLedger } from "./ledgerFactory.js";

describe("ledger factory noise", () => {
  it("emits multi-account SGD statements with reversal noise", () => {
    const txs = generateCustomerLedger({ seed: 42, eventType: "none", employer: "PEBBLE LABS PTE LTD" });
    expect(txs.length).toBeGreaterThan(20);
    expect(txs.every((t) => t.currency === "SGD" && t.postDate && t.merchantRaw)).toBe(true);
    expect(new Set(txs.map((t) => t.accountId)).size).toBeGreaterThan(1);
    const grab = txs.filter((t) => /GRAB/.test(t.merchantRaw));
    expect(grab.some((t) => t.amount > 0)).toBe(true);
    expect(grab.some((t) => t.amount < 0)).toBe(true);
  });

  it("job-loss overlay omits payroll after onset instead of posting a dummy row", () => {
    const txs = generateCustomerLedger({
      seed: 7,
      eventType: "job-loss",
      onsetMonth: "2026-04",
      employer: "NORTHSTAR LOGISTICS",
      payroll: 7200,
    });
    const payrollMonths = txs
      .filter((t) => /GIRO SALARY/.test(t.merchantRaw) && t.amount > 0)
      .map((t) => t.postDate.slice(0, 7));
    expect(payrollMonths.some((m) => m >= "2026-04")).toBe(false);
    expect(txs.some((t) => t.merchantRaw === "NO PAYROLL RECEIVED")).toBe(false);
  });
});
