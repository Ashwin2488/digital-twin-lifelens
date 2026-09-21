/**
 * Singapore retail-banking conventions used by the synthetic ledger.
 * Field names follow a typical SC/DBS/OCBC e-statement export, not a core-banking dump.
 * Product names below are public-facing labels only (Workstream 5 will replace eligibility copy).
 */
export const SGD = "SGD";

export const CHANNELS = ["card", "fast", "giro", "atm", "cheque", "paynow", "internal"];

export const ACCOUNTS = {
  checking: { id: "sg-checking-001", name: "SC Everyday Current Account" },
  savings: { id: "sg-savings-001", name: "SC Bonus$aver" },
  joint: { id: "sg-joint-001", name: "SC Joint Account" },
};

export const CONVENTIONS = {
  currency: SGD,
  payrollWindow: "GIRO salary typically posts between the 25th and 28th, ±1–2 working days.",
  housingGiro: "Home-loan / HDB GIRO usually posts on the 1st.",
  cpf: "CPF contributions do not appear on the personal current-account statement.",
  payNowFast: "P2P credits arrive as PAYNOW or FAST with a counterparty name, not a cleaned category.",
  merchantRaw: "Card presentments keep acquirer noise: PTE LTD, city, truncated mid, GRAB *FOOD.",
  mcc: "MCC is present on card presentments only. GIRO, FAST, PayNow, ATM have mcc=null.",
  noMissingRows: "Banks never post a 'NO PAYROLL RECEIVED' row. Absence of GIRO is the signal.",
};

export const PUBLIC_SC_PRODUCTS = [
  "Bonus$aver",
  "Wealth Saver",
  "CashOne Personal Loan",
  "Priority Banking",
  "Personal Accident Insurance",
  "MortgageOne",
];
