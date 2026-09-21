/**
 * Public-facing product names already listed in sgBankingConventions.PUBLIC_SC_PRODUCTS,
 * plus the demo recommendable names used by hero candidates.
 * Not a live scrape of sc.com. Eligibility is high-level public positioning only.
 */
export const PRODUCT_CATALOG = [
  catalog("PA-BASIC", "Personal Accident Insurance", "insurance", "Standalone accident cover.", ["Sum assured", "Hospital cash"], { minAge: 18 }, { isInsurance: true }),
  catalog("PA-FAMILY", "Family Protection Plan", "insurance", "Needs-led family protection conversation starter.", ["Income replacement framing"], { minAge: 18 }, { isInsurance: true, requiresAdvisorSuitability: true }),
  catalog("TERM-FAMILY", "Career Transition Cover", "insurance", "Keep essential cover during income interruption.", ["Term-style framing"], { minAge: 21 }, { isInsurance: true, requiresAdvisorSuitability: true }),
  catalog("PA-TRAVEL", "Personal Accident Insurance", "insurance", "Travel and accident overlay.", ["Travel period"], { minAge: 18 }, { isInsurance: true }),
  catalog("WEALTH-SAVER", "Wealth Saver", "savings", "Savings with bonus interest positioning.", ["Flexible deposits"], { minAge: 18 }),
  catalog("BONUSSAVER", "SmartSaver Plus", "savings", "Buffer-building savings conversation.", ["Bonus interest bands"], { minAge: 18, minIncome: 0 }),
  catalog("EDU-BUILD", "Education Builder", "investment", "Long-horizon education funding conversation.", ["Regular contribution"], { riskProfile: ["Balanced", "Growth"] }, { isInvestment: true, requiresAdvisorSuitability: true }),
  catalog("GROWTH-UT", "Couples Wealth Plan", "investment", "Shared wealth journey after a life event.", ["Regular savings plan"], { riskProfile: ["Growth"] }, { isInvestment: true, requiresAdvisorSuitability: true }),
  catalog("CASHONE", "Celebration Instalments", "credit", "Smooth a known expense cluster.", ["Instalment framing"], { minAge: 21, minIncome: 2000 }),
  catalog("FLEXICASH", "FlexiCash Reserve", "credit", "Short-term liquidity bridge.", ["Revolving facility framing"], { minAge: 21, minIncome: 2000 }),
  catalog("MORTGAGEONE", "MortgageOne", "mortgage", "Home-loan servicing and relief conversation.", ["GIRO instalment"], { minAge: 21 }),
  catalog("JOINT", "Premier Joint Account", "savings", "One view of shared finances.", ["Joint operating account"], { minAge: 18 }),
  catalog("RELIEF", "Payment Relief Programme", "credit", "Temporary instalment relief conversation.", ["Not a product sale"], { minAge: 21 }),
];

export function catalogByName(name) {
  return PRODUCT_CATALOG.find((row) => row.name === name) || null;
}

export function catalogByCode(code) {
  return PRODUCT_CATALOG.find((row) => row.code === code) || null;
}

function catalog(code, name, category, description, keyFeatures, publicEligibility, flags = {}) {
  return {
    code,
    name,
    category,
    description,
    keyFeatures,
    publicEligibility,
    complianceFlags: {
      requiresAdvisorSuitability: Boolean(flags.requiresAdvisorSuitability),
      isInsurance: Boolean(flags.isInsurance),
      isInvestment: Boolean(flags.isInvestment),
    },
  };
}
