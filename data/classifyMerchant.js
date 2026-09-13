import { MERCHANT_CATALOG, MCC_CATEGORY } from "./sgMerchants.js";

const KEYWORD_RULES = [
  { test: /PAYROLL|GIRO SALARY|SALARY CR|SALARY CREDIT/i, category: "income" },
  { test: /SEVERANCE|HR PAYOUT BATCH|EX-GRATIA|FREELANCE|CONSULTING GIRO CREDIT/i, category: "income" },
  { test: /NO PAYROLL RECEIVED/i, category: "income" },
  { test: /TRANSFER TO SAVINGS|TRANSFER FROM EVERYDAY/i, category: "internal" },
  { test: /(PAYNOW|FAST).*(FROM)\s+[A-Z]\./i, category: "partnerTransfer" },
  { test: /TRANSFER FROM [A-Z]\.\s*[A-Z]/i, category: "partnerTransfer" },
  { test: /CHILDCARE|INFANT CARE|PRE-SCHOOL|PRESCHOOL|MY FIRST SKOOL|E-BRIDGE/i, category: "childcare" },
  { test: /MOTHERCARE|MOTHERSWORK|PUPSIK|MAMAWAY|BABY|INFANT FORMULA/i, category: "baby" },
  { test: /BRIDAL|WEDDING|CHAPEL|PHOTOGRAPHY|BLOOM & CO|WEDDING NICHE/i, category: "wedding" },
  { test: /HOME LOAN|MORTGAGE|HDB LOAN|HDB MORTGAGE/i, category: "housing" },
  { test: /HOSPITAL|CLINIC|PHARMACY|PARKWAY|MOUNT ELIZABETH/i, category: "healthcare" },
  { test: /FAIRPRICE|SHENG SIONG|COLD STORAGE/i, category: "grocery" },
  { test: /GRAB \*RIDE|GRAB TAXI/i, category: "transport" },
  { test: /GRAB \*FOOD|GRABFOOD|DELIVEROO/i, category: "dining" },
  { test: /SINGTEL|STARHUB|SP SERVICES/i, category: "utilities" },
  { test: /NETFLIX|SPOTIFY/i, category: "subscription" },
  { test: /ATM/i, category: "cash" },
  { test: /SINGAPORE AIRLINES|SCOOT /i, category: "travel" },
  { test: /PICKFORDS|ASIA MOVING/i, category: "relocation" },
  { test: /NETS SETTLEMENT|MERCHANT PAYOUT/i, category: "business_income" },
];

const CATALOG_BY_LENGTH = [...MERCHANT_CATALOG].sort((a, b) => {
  const maxName = (row) => Math.max(...row.names.map((n) => n.length));
  return maxName(b) - maxName(a);
});

function catalogMatch(raw) {
  for (const row of CATALOG_BY_LENGTH) {
    if (row.names.some((name) => raw.includes(name))) return row;
  }
  return null;
}

/**
 * Bank-style cleansing: merchant string + MCC → category.
 * Never trusts an author-supplied category.
 */
export function classifyMerchant(merchantRaw, mcc = null) {
  const raw = String(merchantRaw || "").toUpperCase();
  const hit = catalogMatch(raw);
  if (hit) {
    return { category: hit.category, method: "catalog", catalogId: hit.id, confidence: 0.97 };
  }
  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(raw)) {
      return { category: rule.category, method: "keyword", catalogId: null, confidence: 0.9 };
    }
  }
  if (mcc && MCC_CATEGORY[String(mcc)]) {
    return { category: MCC_CATEGORY[String(mcc)], method: "mcc", catalogId: null, confidence: 0.82 };
  }
  return { category: "uncategorized", method: "fallback", catalogId: null, confidence: 0.2 };
}

export function classifyTransaction(tx) {
  const classification = classifyMerchant(tx.merchantRaw || tx.description, tx.mcc);
  return { ...tx, category: classification.category, classification };
}
