import { describe, expect, it } from "vitest";
import { buildFallbackCandidates, clampLever, sanitizeLeverCandidate } from "./leverSuggest.js";

describe("lever clamp", () => {
  it("clamps out-of-range values into the allowed band", () => {
    expect(clampLever("spendCutPct", 999)).toBe(40);
    expect(clampLever("spendCutPct", -50)).toBe(0);
    expect(clampLever("extraMonthly", 50000)).toBe(2000);
    expect(clampLever("lumpSum", -10)).toBe(0);
  });

  it("falls back to the provided default when the value is not a number", () => {
    expect(clampLever("extraMonthly", "not-a-number", 300)).toBe(300);
  });
});

describe("sanitizeLeverCandidate", () => {
  it("never trusts raw model output outside the allowed ranges", () => {
    const candidate = sanitizeLeverCandidate(
      { label: "Go wild", why: "x".repeat(500), spendCutPct: 900, extraMonthly: -5, lumpSum: 999999 },
      { spendCutPct: 5, extraMonthly: 100, lumpSum: 0 }
    );
    expect(candidate.levers.spendCutPct).toBe(40);
    expect(candidate.levers.extraMonthly).toBe(0);
    expect(candidate.levers.lumpSum).toBe(20000);
    expect(candidate.why.length).toBeLessThanOrEqual(160);
  });

  it("returns null for a non-object candidate", () => {
    expect(sanitizeLeverCandidate(null)).toBeNull();
    expect(sanitizeLeverCandidate("nope")).toBeNull();
  });
});

describe("buildFallbackCandidates", () => {
  it("always returns 3 deterministic candidates within range", () => {
    const candidates = buildFallbackCandidates({ spendCutPct: 35, extraMonthly: 1900, lumpSum: 19000 });
    expect(candidates).toHaveLength(3);
    for (const c of candidates) {
      expect(c.levers.spendCutPct).toBeLessThanOrEqual(40);
      expect(c.levers.extraMonthly).toBeLessThanOrEqual(2000);
      expect(c.levers.lumpSum).toBeLessThanOrEqual(20000);
    }
  });
});
