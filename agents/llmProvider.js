import OpenAI from "openai";

export function llmApiKey() {
  return process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
}

export function getLlmMeta() {
  return {
    provider: process.env.LLM_PROVIDER || "openai",
    model: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
  };
}

export function isLlmEnabled() {
  return Boolean(llmApiKey()) && getLlmMeta().provider === "openai";
}

export function isDetectLlmOn() {
  return isLlmEnabled() && String(process.env.LLM_DETECT || "off").toLowerCase() === "on";
}

export function getLlmClient() {
  if (!isLlmEnabled()) return null;
  return new OpenAI({ apiKey: llmApiKey() });
}

export async function completeJson({ system, user, schema, name, temperature = 0.2, maxTokens = 700 }) {
  const client = getLlmClient();
  if (!client) return null;
  const { model } = getLlmMeta();
  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: {
      format: {
        type: "json_schema",
        name,
        strict: true,
        schema,
      },
    },
    temperature,
    max_output_tokens: maxTokens,
  });
  const raw = response.output_text?.trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function completeText({ system, user, history = [], temperature = 0.5, maxTokens = 450 }) {
  const client = getLlmClient();
  if (!client) return null;
  const { model } = getLlmMeta();
  const response = await client.responses.create({
    model,
    input: [{ role: "system", content: system }, ...history.slice(-6), { role: "user", content: user }],
    temperature,
    max_output_tokens: maxTokens,
  });
  return response.output_text?.trim() || null;
}
