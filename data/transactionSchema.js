import { CHANNELS, SGD, ACCOUNTS } from "./sgBankingConventions.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(message) {
  throw new Error(`TransactionSchema: ${message}`);
}

function inferChannel(merchantRaw = "") {
  const raw = merchantRaw.toUpperCase();
  if (/\bATM\b/.test(raw)) return "atm";
  if (/PAYNOW/.test(raw)) return "paynow";
  if (/\bFAST\b/.test(raw)) return "fast";
  if (/GIRO|PAYROLL|SALARY|HOME LOAN|HDB LOAN|SINGTEL|SP SERVICES/.test(raw)) return "giro";
  if (/\bCHQ\b|CHEQUE/.test(raw)) return "cheque";
  if (/TRANSFER TO SAVINGS|TRANSFER FROM SAVINGS|INTERNAL/.test(raw)) return "internal";
  return "card";
}

/**
 * Authoring helper. `signedAmount` is positive for credits, negative for debits.
 * Category is intentionally omitted — classifyMerchant.js fills it.
 */
export function statementLine(postDate, merchantRaw, signedAmount, extras = {}) {
  const amount = Number(signedAmount);
  if (!Number.isFinite(amount) || amount === 0) fail(`amount must be a non-zero number, got ${signedAmount}`);
  return {
    postDate,
    valueDate: extras.valueDate ?? postDate,
    merchantRaw,
    mcc: extras.mcc ?? null,
    channel: extras.channel ?? inferChannel(merchantRaw),
    direction: extras.direction ?? (amount >= 0 ? "credit" : "debit"),
    amount: Math.abs(amount),
    currency: extras.currency ?? SGD,
    accountId: extras.accountId ?? ACCOUNTS.checking.id,
    accountName: extras.accountName ?? ACCOUNTS.checking.name,
  };
}

export function parseStatementLine(input) {
  if (!input || typeof input !== "object") fail("expected an object");
  if (!ISO_DATE.test(input.postDate || input.date || "")) fail("postDate must be YYYY-MM-DD");
  const merchantRaw = String(input.merchantRaw || input.description || "").trim();
  if (!merchantRaw) fail("merchantRaw is required");
  const channel = input.channel || inferChannel(merchantRaw);
  if (!CHANNELS.includes(channel)) fail(`unknown channel ${channel}`);
  const signed = input.direction
    ? (input.direction === "credit" ? Math.abs(Number(input.amount)) : -Math.abs(Number(input.amount)))
    : Number(input.amount);
  if (!Number.isFinite(signed) || signed === 0) fail("amount/direction must describe a non-zero movement");
  return statementLine(input.postDate || input.date, merchantRaw, signed, {
    valueDate: input.valueDate,
    mcc: input.mcc ?? null,
    channel,
    direction: input.direction,
    currency: input.currency,
    accountId: input.accountId,
    accountName: input.accountName,
  });
}

export function normalizeTransaction(input) {
  const parsed = parseStatementLine(input);
  const signed = parsed.direction === "credit" ? parsed.amount : -parsed.amount;
  return {
    id: input.id,
    postDate: parsed.postDate,
    valueDate: parsed.valueDate,
    merchantRaw: parsed.merchantRaw,
    mcc: parsed.mcc,
    channel: parsed.channel,
    direction: parsed.direction,
    currency: parsed.currency,
    accountId: parsed.accountId,
    accountName: parsed.accountName,
    runningBalance: input.runningBalance,
    category: input.category || "uncategorized",
    classification: input.classification || null,
    date: parsed.postDate,
    description: parsed.merchantRaw,
    amount: signed,
  };
}

export function attachRunningBalances(txs, startingBalances = {}) {
  const sorted = [...txs].sort((a, b) => {
    const dateCmp = a.postDate.localeCompare(b.postDate);
    if (dateCmp) return dateCmp;
    return (a.merchantRaw || "").localeCompare(b.merchantRaw);
  });
  const running = { ...startingBalances };
  return sorted.map((tx, index) => {
    const accountId = tx.accountId || ACCOUNTS.checking.id;
    running[accountId] = Number(running[accountId] || 0) + tx.amount;
    return {
      ...tx,
      id: tx.id || `txn-${String(index + 1).padStart(4, "0")}`,
      runningBalance: Math.round(running[accountId] * 100) / 100,
    };
  });
}
