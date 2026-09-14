import { buildLedger } from "../data/ledger.js";
import { deriveFeatures } from "./features.js";
import { detectLifeEvents } from "./detector.js";

export const ADHOC_MAX_ROWS = 500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const WEDDING_SAMPLE = [
  { postDate: "2026-02-04", merchantRaw: "THE ST. REGIS WEDDING", amount: -3800 },
  { postDate: "2026-02-11", merchantRaw: "GIOIELLI BRIDAL", amount: -1420 },
  { postDate: "2026-02-18", merchantRaw: "THE WEDDING NICHE", amount: -640 },
  { postDate: "2026-02-15", merchantRaw: "FAST TFR FROM R. ONG", amount: 700 },
  { postDate: "2026-03-15", merchantRaw: "PAYNOW TFR FROM R. ONG", amount: 700 },
  { postDate: "2026-02-25", merchantRaw: "HARBOR LAW LLP GIRO SALARY", amount: 6900 },
];

export function parseAdhocInput(body) {
  if (body == null) throw badRequest("Body is required.");
  if (typeof body === "string") return parseCsv(body);
  if (Array.isArray(body)) return normalizeRows(body);
  if (typeof body === "object") {
    if (typeof body.csv === "string") return parseCsv(body.csv);
    if (Array.isArray(body.transactions)) return normalizeRows(body.transactions);
  }
  throw badRequest("Send { transactions: [...] } or { csv: \"...\" }.");
}

export function runAdhocDetection(rawRows) {
  if (rawRows.length > ADHOC_MAX_ROWS) {
    throw badRequest(`Too many rows (${rawRows.length}). Cap is ${ADHOC_MAX_ROWS}.`);
  }
  const { rows, rejected } = coerceRows(rawRows);
  if (!rows.length) {
    throw badRequest(rejected[0] || "No valid transactions after date/amount checks.");
  }
  const transactions = buildLedger(rows);
  const features = deriveFeatures({ transactions });
  const { primary, alternatives } = detectLifeEvents(features);
  const empty = primary.id === "none" || primary.confidence < 0.4;
  return {
    persisted: false,
    rowCount: transactions.length,
    rejected,
    empty,
    message: empty ? "No strong signal in this data" : primary.label,
    features,
    primary,
    alternatives,
  };
}

function coerceRows(rawRows) {
  const rows = [];
  const rejected = [];
  for (const [index, raw] of rawRows.entries()) {
    try {
      rows.push(coerceRow(raw, index));
    } catch (error) {
      rejected.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { rows, rejected };
}

function coerceRow(raw, index) {
  const postDate = String(raw.postDate || raw.date || "").slice(0, 10);
  if (!ISO_DATE.test(postDate)) throw new Error(`Row ${index + 1}: postDate must be YYYY-MM-DD`);
  const merchantRaw = String(raw.merchantRaw || raw.description || "").trim();
  if (!merchantRaw) throw new Error(`Row ${index + 1}: merchantRaw is required`);
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount === 0) throw new Error(`Row ${index + 1}: amount must be a non-zero number`);
  return { postDate, merchantRaw, amount, mcc: raw.mcc ?? null };
}

function normalizeRows(rows) {
  if (rows.length > ADHOC_MAX_ROWS) throw badRequest(`Too many rows (${rows.length}). Cap is ${ADHOC_MAX_ROWS}.`);
  return rows;
}

function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw badRequest("CSV needs a header plus at least one row.");
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = header.findIndex((h) => h === "postdate" || h === "date");
  const merchantIdx = header.findIndex((h) => h === "merchantraw" || h === "description");
  const amountIdx = header.findIndex((h) => h === "amount");
  if (dateIdx < 0 || merchantIdx < 0 || amountIdx < 0) {
    throw badRequest("CSV header must include postDate (or date), merchantRaw (or description), amount.");
  }
  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      postDate: cols[dateIdx],
      merchantRaw: cols[merchantIdx],
      amount: Number(cols[amountIdx]),
      _index: i,
    };
  });
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}
