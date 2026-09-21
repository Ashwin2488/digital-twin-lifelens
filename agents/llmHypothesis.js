import { EVENT_TYPES } from "../data/holdout.js";
import { completeJson, isDetectLlmOn } from "./llmProvider.js";

const TYPE_SET = new Set(EVENT_TYPES);

export async function proposeHypotheses(transactions = []) {
  if (!isDetectLlmOn()) return { hypotheses: [], merchantHints: [], source: null };
  const rows = (transactions || []).slice(0, 40).map((t) => ({
    id: t.id,
    postDate: t.postDate || t.date,
    merchantRaw: t.merchantRaw || t.description,
    amount: t.amount,
    category: t.category,
    method: t.classification?.method || null,
  }));
  const parsed = await completeJson({
    system:
      "You propose life-event hypotheses from classified bank transactions. Never invent transaction ids. Never output a confidence number, product name, price, or eligibility. Cite only supplied txn ids.",
    user: JSON.stringify({
      task: "Propose at most 3 event hypotheses and optional category hints for uncategorized merchants.",
      allowedTypes: EVENT_TYPES,
      transactions: rows,
    }),
    name: "detection_hypotheses",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        hypotheses: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string" },
              why: { type: "string" },
              txnIds: { type: "array", items: { type: "string" } },
            },
            required: ["type", "why", "txnIds"],
          },
        },
        merchantHints: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              txnId: { type: "string" },
              category: { type: "string" },
              why: { type: "string" },
            },
            required: ["txnId", "category", "why"],
          },
        },
      },
      required: ["hypotheses", "merchantHints"],
    },
    temperature: 0.1,
    maxTokens: 400,
  });
  if (!parsed) return { hypotheses: [], merchantHints: [], source: null };
  const knownIds = new Set(rows.map((r) => r.id).filter(Boolean));
  return {
    source: "llm-hypothesis",
    hypotheses: (parsed.hypotheses || [])
      .filter((h) => TYPE_SET.has(h.type))
      .map((h) => ({
        type: h.type,
        why: h.why,
        txnIds: (h.txnIds || []).filter((id) => knownIds.has(id)),
      })),
    merchantHints: (parsed.merchantHints || []).filter((h) => knownIds.size === 0 || knownIds.has(h.txnId)),
  };
}

/** Local scorer owns confidence. LLM may only annotate types the scorer already supports. */
export function mergeHypotheses(detected, proposal) {
  const supported = new Set(
    [detected?.primary?.id, ...(detected?.alternatives || []).map((row) => row.id)].filter((id) => id && id !== "none")
  );
  const accepted = [];
  const dropped = [];
  for (const h of proposal?.hypotheses || []) {
    if (supported.has(h.type) && h.txnIds?.length) accepted.push({ ...h, accepted: true });
    else dropped.push({ ...h, accepted: false, reason: "local scorer did not support this type; hypothesis dropped" });
  }
  return {
    llmHypotheses: accepted,
    llmDropped: dropped,
    merchantHints: proposal?.merchantHints || [],
  };
}
