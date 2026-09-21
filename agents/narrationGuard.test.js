import { describe, expect, it } from "vitest";
import { assertNarrationGrounded, collectAllowedAmounts } from "./narrationGuard.js";

describe("assertNarrationGrounded — money amounts", () => {
  it("passes when every S$ amount in the text is in the allowed list", () => {
    const result = assertNarrationGrounded("Set aside S$1,234 to keep pace.", { amounts: [1234, 900] });
    expect(result.ok).toBe(true);
    expect(result.extraMoney).toHaveLength(0);
  });

  it("flags an S$ amount that was never supplied to the narrator", () => {
    const result = assertNarrationGrounded("Set aside S$5,000 to keep pace.", { amounts: [1234, 900] });
    expect(result.ok).toBe(false);
    expect(result.extraMoney).toContain("5000");
  });

  it("skips the money check entirely when no allowed amounts were supplied", () => {
    const result = assertNarrationGrounded("This costs S$999.", { amounts: [] });
    expect(result.extraMoney).toHaveLength(0);
  });
});

describe("assertNarrationGrounded — product names", () => {
  it("flags a plan/cover/account-shaped phrase that isn't in the allowed product names", () => {
    const result = assertNarrationGrounded("Consider the Global Wealth Builder Plan today.", {
      productNames: ["Family Protection Plan"],
      amounts: [],
    });
    expect(result.ok).toBe(false);
    expect(result.unknownProducts.length).toBeGreaterThan(0);
  });

  it("does not flag a phrase that matches an allowed product name", () => {
    const result = assertNarrationGrounded("Consider the Family Protection Plan today.", {
      productNames: ["Family Protection Plan"],
      amounts: [],
    });
    expect(result.unknownProducts).toHaveLength(0);
  });

  it("ignores framing phrases like Future You and Month N", () => {
    const result = assertNarrationGrounded("Future You says Month 3 looks tight.", { amounts: [] });
    expect(result.unknownProducts).toHaveLength(0);
  });

  it("does not flag ordinary capitalized phrases that aren't plan/cover/account-shaped", () => {
    const result = assertNarrationGrounded("Talk to Jamie Lee about your Priority Banking review.", { amounts: [] });
    expect(result.unknownProducts).toHaveLength(0);
  });
});

describe("collectAllowedAmounts", () => {
  it("gathers amounts from event confidence, products, projection, and features", () => {
    const amounts = collectAllowedAmounts({
      event: { confidence: 0.82 },
      products: [{ annualValue: 500 }, {}],
      projection: { startingBalance: 1000, endingBalance: 2000, minBalance: 300 },
      features: { protectionGap: 42000 },
    });
    expect(amounts).toEqual([82, 500, 1000, 2000, 300, 42000]);
  });

  it("drops non-finite values and tolerates missing sections", () => {
    const amounts = collectAllowedAmounts({ event: { confidence: 0 }, products: [] });
    expect(amounts).toEqual([]);
  });
});
