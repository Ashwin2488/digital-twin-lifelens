import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { answerAsFutureYou, buildSystemPrompt, resetSessionMemory } from "./future_you.js";
import { projectScenario } from "./projection.js";

const ENV_KEYS = ["OPENAI_API_KEY", "LLM_API_KEY", "LLM_PROVIDER"];
let saved;

beforeEach(() => {
  saved = ENV_KEYS.map((k) => [k, process.env[k]]);
  for (const k of ENV_KEYS) delete process.env[k];
  resetSessionMemory();
});

afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function makeScenario(overrides = {}) {
  return {
    id: "new-parent",
    customer: "Test Customer",
    userIntent: "",
    tone: "steady",
    event: { label: "New parent", type: "new-parent", confidence: 0.8, detectedMonth: "Month 3" },
    trace: ["Signal one.", "Signal two.", "Signal three."],
    startingBalance: 8000,
    income: 6000,
    recurringExpenses: 5000,
    monthlyEvents: [],
    autopilotActions: [],
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes the mandatory disclaimer instruction and grounds the prompt in the scenario/projection", () => {
    const scenario = makeScenario();
    const projection = projectScenario(scenario, { acceptActions: false });
    const prompt = buildSystemPrompt(scenario, projection);
    expect(prompt).toContain("Open with: 'Simulated projection only, not financial advice.'");
    expect(prompt).toContain("Test Customer");
    expect(prompt).toContain("New parent");
    expect(prompt).toContain(projection.headline);
  });
});

describe("answerAsFutureYou — LLM disabled (no API key configured)", () => {
  it("returns a cached-demo answer opening with the disclaimer, grounded in the projection", async () => {
    const scenario = makeScenario();
    const projection = projectScenario(scenario, { acceptActions: false });
    const result = await answerAsFutureYou({
      scenario,
      projection,
      question: "What should I watch out for next month?",
      sessionId: "session-1",
    });
    expect(result.source).toBe("cached-demo");
    expect(result.answer).toMatch(/^Simulated projection only, not financial advice\./);
    expect(result.sentences.length).toBeGreaterThan(0);
    expect(result.traceability.event).toEqual(scenario.event);
    expect(result.traceability.branch).toBe(projection.branch);
  });

  it("is deterministic for the same scenario/question so the demo never flickers", async () => {
    const scenario = makeScenario();
    const projection = projectScenario(scenario, { acceptActions: false });
    const first = await answerAsFutureYou({ scenario, projection, question: "Will I run out of cash?", sessionId: "s" });
    const second = await answerAsFutureYou({ scenario, projection, question: "Will I run out of cash?", sessionId: "s" });
    expect(second.answer).toBe(first.answer);
  });
});

describe("resetSessionMemory", () => {
  it("clears remembered history without throwing", () => {
    expect(() => resetSessionMemory()).not.toThrow();
  });
});
