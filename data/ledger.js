import { attachRunningBalances, normalizeTransaction, statementLine } from "./transactionSchema.js";
import { classifyTransaction } from "./classifyMerchant.js";

export { statementLine };

export function buildLedger(rawTxs, startingBalances = {}) {
  const classified = rawTxs.map((tx) => classifyTransaction(tx));
  const normalized = classified.map((tx) => normalizeTransaction(tx));
  return attachRunningBalances(normalized, startingBalances);
}
