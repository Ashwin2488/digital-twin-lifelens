import { describe, expect, it } from "vitest";
import { classifyMerchant, classifyTransaction } from "./classifyMerchant.js";
import { heroLedgers } from "./heroLedgers.js";

describe("merchant classifier", () => {
  it("maps noisy SG merchant strings without a pre-labelled category", () => {
    expect(classifyMerchant("LITTLE SEEDS CHILDCARE PTE LTD").category).toBe("childcare");
    expect(classifyMerchant("MOTHERCARE SG ORCHARD").category).toBe("baby");
    expect(classifyMerchant("THE WHITE CHAPEL PTE LTD SINGAPORE").category).toBe("wedding");
    expect(classifyMerchant("VERTEX LOGISTICS PTE LTD GIRO SALARY").category).toBe("income");
    expect(classifyMerchant("FAST TFR FROM A. SHAH").category).toBe("partnerTransfer");
    expect(classifyMerchant("TRANSFER FROM EVERYDAY").category).toBe("internal");
    expect(classifyMerchant("SC ATM WITHDRAWAL ORCHARD").category).toBe("cash");
  });

  it("falls back to MCC when the merchant is unknown", () => {
    expect(classifyMerchant("UNKNOWN MID 9981", "5411").category).toBe("grocery");
    expect(classifyMerchant("TOTALLY UNKNOWN COUNTER").category).toBe("uncategorized");
  });

  it("does not trust a caller-supplied category", () => {
    const tx = classifyTransaction({
      merchantRaw: "MOTHERCARE SG",
      mcc: "5641",
      category: "grocery",
    });
    expect(tx.category).toBe("baby");
    expect(tx.classification.method).toBe("catalog");
  });

  it("classifies hero ledgers from merchantRaw only", () => {
    const amira = heroLedgers["new-parent"];
    expect(amira.every((t) => t.merchantRaw && t.channel && t.accountId)).toBe(true);
    expect(amira.filter((t) => t.category === "childcare").length).toBeGreaterThanOrEqual(3);
    expect(amira.filter((t) => t.category === "baby").length).toBeGreaterThanOrEqual(3);
    expect(amira.some((t) => t.accountId !== amira[0].accountId)).toBe(true);

    const daniel = heroLedgers["job-loss"];
    expect(daniel.some((t) => t.description === "NO PAYROLL RECEIVED")).toBe(false);
    expect(daniel.filter((t) => t.category === "income" && /SALARY/i.test(t.merchantRaw)).length).toBe(4);

    const priya = heroLedgers.wedding;
    expect(priya.filter((t) => t.category === "wedding").length).toBeGreaterThanOrEqual(4);
    expect(priya.filter((t) => t.category === "partnerTransfer").length).toBeGreaterThanOrEqual(2);
  });
});
