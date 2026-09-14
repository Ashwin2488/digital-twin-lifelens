import { describe, expect, it } from "vitest";
import { parseAdhocInput, runAdhocDetection, WEDDING_SAMPLE, ADHOC_MAX_ROWS } from "./adhocDetect.js";
import { compareLegacyVsGeneralized } from "./detector.js";
import { deriveFeatures } from "./features.js";
import { getHoldoutById } from "../data/holdout.js";
import { customerProfiles } from "../data/customer_profiles.js";
import { scenarios } from "../data/scenarios.js";

describe("adhoc detect", () => {
  it("classifies a pasted wedding sample without a persona", () => {
    const result = runAdhocDetection(WEDDING_SAMPLE);
    expect(result.persisted).toBe(false);
    expect(result.empty).toBe(false);
    expect(result.primary.id).toBe("wedding");
    expect(result.primary.confidence).toBeGreaterThan(0.7);
  });

  it("parses csv and rejects over-cap payloads", () => {
    const rows = parseAdhocInput({
      csv: "postDate,merchantRaw,amount\n2026-01-01,NTUC FAIRPRICE,-12.5",
    });
    expect(rows).toHaveLength(1);
    expect(() => runAdhocDetection(Array.from({ length: ADHOC_MAX_ROWS + 1 }, () => WEDDING_SAMPLE[0]))).toThrow(/Cap is/);
    expect(() => runAdhocDetection([{ postDate: "13-02-2026", merchantRaw: "X", amount: -1 }])).toThrow(/YYYY-MM-DD/);
  });

  it("returns no-strong-signal instead of a fake event", () => {
    const result = runAdhocDetection([
      { postDate: "2026-01-25", merchantRaw: "PEBBLE LABS PTE LTD GIRO SALARY", amount: 5300 },
      { postDate: "2026-01-12", merchantRaw: "NTUC FAIRPRICE JURONG", amount: -80 },
    ]);
    expect(result.empty).toBe(true);
    expect(result.primary.id).toBe("none");
  });
});

describe("legacy vs generalized", () => {
  it("fires both on a prepared hero", () => {
    const profile = customerProfiles.wedding;
    const scenario = scenarios.find((s) => s.id === "wedding");
    const compared = compareLegacyVsGeneralized({
      features: deriveFeatures(profile),
      profile,
      scenario,
    });
    expect(compared.generalized.id).toBe("wedding");
    expect(compared.legacy.confidence).toBeGreaterThan(0.7);
  });

  it("legacy is blank on an unseen holdout; generalized is not", () => {
    const holdout = getHoldoutById("h-hp-01");
    const compared = compareLegacyVsGeneralized({
      features: deriveFeatures({ transactions: holdout.transactions }),
      profile: {},
      scenario: null,
    });
    expect(compared.legacy.confidence).toBe(0);
    expect(compared.generalized.id).toBe("home-purchase");
    expect(compared.generalized.confidence).toBeGreaterThan(0.5);
  });
});
