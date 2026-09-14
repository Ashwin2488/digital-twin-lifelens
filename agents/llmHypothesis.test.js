import { describe, expect, it } from "vitest";
import { mergeHypotheses } from "./llmHypothesis.js";

describe("llm hypothesis merge", () => {
  it("drops hypotheses the local scorer does not support", () => {
    const detected = {
      primary: { id: "home-purchase", confidence: 0.74 },
      alternatives: [{ id: "relocation", confidence: 0.2 }],
    };
    const merged = mergeHypotheses(detected, {
      hypotheses: [
        { type: "home-purchase", why: "renovation cluster", txnIds: ["txn-0038"] },
        { type: "wedding", why: "guess", txnIds: ["txn-0001"] },
      ],
    });
    expect(merged.llmHypotheses.map((h) => h.type)).toEqual(["home-purchase"]);
    expect(merged.llmDropped.map((h) => h.type)).toEqual(["wedding"]);
  });

  it("never treats a none primary as support for an LLM guess", () => {
    const merged = mergeHypotheses(
      { primary: { id: "none", confidence: 0 }, alternatives: [] },
      { hypotheses: [{ type: "new-parent", why: "baby word", txnIds: ["txn-1"] }] }
    );
    expect(merged.llmHypotheses).toHaveLength(0);
    expect(merged.llmDropped).toHaveLength(1);
  });
});
