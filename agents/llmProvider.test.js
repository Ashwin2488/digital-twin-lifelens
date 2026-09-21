import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLlmClient, getLlmMeta, isDetectLlmOn, isLlmEnabled, llmApiKey } from "./llmProvider.js";

const ENV_KEYS = ["OPENAI_API_KEY", "LLM_API_KEY", "LLM_PROVIDER", "LLM_MODEL", "OPENAI_MODEL", "LLM_DETECT"];
let saved;

beforeEach(() => {
  saved = ENV_KEYS.map((k) => [k, process.env[k]]);
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("llmApiKey", () => {
  it("returns empty string when neither key is set", () => {
    expect(llmApiKey()).toBe("");
  });

  it("prefers LLM_API_KEY over OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.LLM_API_KEY = "llm-key";
    expect(llmApiKey()).toBe("llm-key");
  });

  it("falls back to OPENAI_API_KEY when LLM_API_KEY is unset", () => {
    process.env.OPENAI_API_KEY = "openai-key";
    expect(llmApiKey()).toBe("openai-key");
  });
});

describe("getLlmMeta", () => {
  it("defaults to the openai provider and gpt-4.1-mini model", () => {
    expect(getLlmMeta()).toEqual({ provider: "openai", model: "gpt-4.1-mini" });
  });

  it("respects LLM_MODEL over OPENAI_MODEL", () => {
    process.env.LLM_MODEL = "model-a";
    process.env.OPENAI_MODEL = "model-b";
    expect(getLlmMeta().model).toBe("model-a");
  });
});

describe("isLlmEnabled", () => {
  it("is false with no API key configured", () => {
    expect(isLlmEnabled()).toBe(false);
  });

  it("is true once an API key is present and provider is openai (default)", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isLlmEnabled()).toBe(true);
  });

  it("is false for a non-openai provider even with a key set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.LLM_PROVIDER = "anthropic";
    expect(isLlmEnabled()).toBe(false);
  });
});

describe("isDetectLlmOn", () => {
  it("is false when LLM is disabled, regardless of LLM_DETECT", () => {
    process.env.LLM_DETECT = "on";
    expect(isDetectLlmOn()).toBe(false);
  });

  it("is false when LLM is enabled but LLM_DETECT is unset/off", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isDetectLlmOn()).toBe(false);
  });

  it("is true only when both LLM is enabled and LLM_DETECT=on", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.LLM_DETECT = "ON";
    expect(isDetectLlmOn()).toBe(true);
  });
});

describe("getLlmClient", () => {
  it("returns null when the LLM is disabled, so callers never hit the network in fallback mode", () => {
    expect(getLlmClient()).toBeNull();
  });

  it("returns a client instance once an API key is configured", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(getLlmClient()).not.toBeNull();
  });
});
