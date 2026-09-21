import { completeJson, getLlmMeta, isLlmEnabled } from "./llmProvider.js";

const TYPES = ["emergency", "home", "wedding", "savings"];
const EVENTS = ["new-parent", "job-loss", "wedding", "home-purchase", "retirement", "none"];

export async function parseLifeIntent(text) {
  const raw = String(text || "").trim();
  if (raw.length < 4) {
    const err = new Error("Say a bit more about the future you want.");
    err.status = 400;
    throw err;
  }
  const fallback = parseLifeIntentFallback(raw);
  if (!isLlmEnabled()) return fallback;
  try {
    const parsed = await completeJson({
      system:
        "Extract a savings goal from the customer's words. Never invent an amount or date that is not in the text. If they only describe a life event, set type/eventHint and leave amounts null. Not financial advice.",
      user: JSON.stringify({ text: raw, allowedTypes: TYPES, allowedEvents: EVENTS }),
      name: "life_intent",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          eventHint: { type: "string" },
          targetAmount: { type: ["number", "null"] },
          horizonYears: { type: ["number", "null"] },
          summary: { type: "string" },
        },
        required: ["type", "eventHint", "targetAmount", "horizonYears", "summary"],
      },
      temperature: 0.1,
      maxTokens: 250,
    });
    if (!parsed) return fallback;
    return sanitizeIntent(raw, parsed, fallback, getLlmMeta().provider);
  } catch {
    return fallback;
  }
}

export function parseLifeIntentFallback(text) {
  const q = String(text).toLowerCase();
  let type = "savings";
  let eventHint = "none";
  if (/parent|baby|pregnan|childcare|new.?born|dependant/.test(q)) {
    type = "emergency";
    eventHint = "new-parent";
  } else if (/house|home|hdb|condo|renovat|mortgage|deposit/.test(q)) {
    type = "home";
    eventHint = "home-purchase";
  } else if (/wed|marry|engaged|fiance/.test(q)) {
    type = "wedding";
    eventHint = "wedding";
  } else if (/job.?loss|retrench|unemploy|laid off|career reset/.test(q)) {
    type = "emergency";
    eventHint = "job-loss";
  } else if (/retir/.test(q)) {
    type = "savings";
    eventHint = "retirement";
  }
  return {
    type,
    eventHint,
    targetAmount: extractStatedAmount(text),
    horizonYears: extractHorizonYears(text),
    summary: String(text).trim().slice(0, 280),
    source: "keyword",
  };
}

function sanitizeIntent(text, parsed, fallback, source) {
  const type = TYPES.includes(parsed.type) ? parsed.type : fallback.type;
  const eventHint = EVENTS.includes(parsed.eventHint) ? parsed.eventHint : fallback.eventHint;
  const stated = extractStatedAmount(text);
  const llmAmount = Number(parsed.targetAmount);
  const targetAmount = Number.isFinite(llmAmount) && stated && Math.abs(llmAmount - stated) / stated < 0.15 ? Math.round(llmAmount) : stated;
  const years = Number(parsed.horizonYears);
  const horizonYears = Number.isFinite(years) && years >= 1 && years <= 15 ? years : fallback.horizonYears;
  return {
    type,
    eventHint,
    targetAmount,
    horizonYears,
    summary: String(parsed.summary || fallback.summary).slice(0, 280),
    source,
  };
}

function extractStatedAmount(text) {
  const s = String(text).replace(/,/g, "");
  const withMark = s.match(/(?:s\$|\$)\s*(\d+(?:\.\d+)?)\s*(k)?/i);
  const withK = s.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  const hit = withMark || withK;
  if (!hit) return null;
  let n = Number(hit[1]);
  if (!Number.isFinite(n)) return null;
  if (/k/i.test(hit[2] || "")) n *= 1000;
  if (n < 1000 || n > 2_000_000) return null;
  return Math.round(n);
}

function extractHorizonYears(text) {
  const m = String(text).toLowerCase().match(/in\s+(\d+)\s+years?/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 15 ? n : null;
}

export function intentToGoal(intent, fallbackGoal) {
  const base = fallbackGoal || { type: "savings", targetAmount: 20000, targetDate: "2027-09-01" };
  const targetDate = intent.horizonYears
    ? addMonths(base.asOf || "2026-09-01", intent.horizonYears * 12)
    : base.targetDate;
  return {
    type: intent.type || base.type,
    targetAmount: intent.targetAmount || base.targetAmount,
    targetDate,
  };
}

function addMonths(iso, count) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})/);
  const y = match ? Number(match[1]) : 2026;
  const m = match ? Number(match[2]) : 9;
  const date = new Date(Date.UTC(y, m - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
