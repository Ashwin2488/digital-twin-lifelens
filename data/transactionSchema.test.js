import { describe, expect, it } from "vitest";
import { attachRunningBalances, normalizeTransaction, parseStatementLine, statementLine } from "./transactionSchema.js";
import { ACCOUNTS } from "./sgBankingConventions.js";

describe("transaction schema", () => {
  it("parses a statement line into bank-export fields", () => {
    const raw = statementLine("2026-03-25", "NTUC FAIRPRICE YISHUN", -126.4);
    expect(raw.postDate).toBe("2026-03-25");
    expect(raw.valueDate).toBe("2026-03-25");
    expect(raw.merchantRaw).toBe("NTUC FAIRPRICE YISHUN");
    expect(raw.direction).toBe("debit");
    expect(raw.amount).toBe(126.4);
    expect(raw.currency).toBe("SGD");
    expect(raw.channel).toBe("card");
    expect(raw.category).toBeUndefined();
  });

  it("normalizes to signed amount + UI aliases", () => {
    const tx = normalizeTransaction(statementLine("2026-01-25", "NIMBUS LABS PTE LTD GIRO SALARY", 6200, { channel: "giro" }));
    expect(tx.date).toBe("2026-01-25");
    expect(tx.description).toContain("GIRO SALARY");
    expect(tx.amount).toBe(6200);
    expect(tx.channel).toBe("giro");
  });

  it("rejects zero-amount rows that banks would not post", () => {
    expect(() => statementLine("2026-05-25", "NO PAYROLL RECEIVED", 0)).toThrow(/non-zero/);
  });

  it("attaches per-account running balances", () => {
    const txs = attachRunningBalances([
      normalizeTransaction(statementLine("2026-01-02", "NTUC FAIRPRICE", -100)),
      normalizeTransaction(statementLine("2026-01-01", "PAYROLL", 1000, { channel: "giro" })),
    ], { [ACCOUNTS.checking.id]: 500 });
    expect(txs[0].id).toBe("txn-0001");
    expect(txs[0].merchantRaw).toBe("PAYROLL");
    expect(txs[0].runningBalance).toBe(1500);
    expect(txs[1].runningBalance).toBe(1400);
  });

  it("accepts legacy date/description objects", () => {
    const parsed = parseStatementLine({ date: "2026-02-01", description: "SP SERVICES", amount: -90, channel: "giro" });
    expect(parsed.postDate).toBe("2026-02-01");
    expect(parsed.merchantRaw).toBe("SP SERVICES");
  });
});
