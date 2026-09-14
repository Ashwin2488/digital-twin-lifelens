import { deriveFeatures } from "./features.js";
import { detectLifeEvents } from "./detector.js";
import { protectionGapFromHoldings } from "../data/policyHoldings.js";
import { catalogByName } from "../data/productCatalog.js";
import { buildCustomerCashflow } from "./cashflow.js";
import { buildDerivedProfile } from "./derivedProfile.js";
import { assertNarrationGrounded, collectAllowedAmounts } from "./narrationGuard.js";
import { completeJson, getLlmMeta, isDetectLlmOn, isLlmEnabled } from "./llmProvider.js";
import { mergeHypotheses, proposeHypotheses } from "./llmHypothesis.js";

export { deriveFeatures };

export async function buildCustomerIntelligence(profile, scenario, options = {}) {
  const customerId = profile.id || scenario?.id;
  const features = deriveFeatures(profile);
  if (customerId) {
    features.protectionGap = protectionGapFromHoldings(customerId, profile.baseline?.estimatedProtectionNeed);
  }
  const detected = detectLifeEvents(features, profile);
  const event = {
    ...detected.primary,
    alternatives: detected.alternatives,
    scenarioId: scenario?.id || profile.id || null,
  };
  if (options.hypothesize !== false && isDetectLlmOn()) {
    try {
      const proposal = await proposeHypotheses(profile.transactions);
      Object.assign(event, mergeHypotheses(detected, proposal));
    } catch {
      event.llmDropped = [{ reason: "hypothesis step failed; local scorer unchanged" }];
    }
  }
  const eligible = rankEligibleProducts(profile, features, event.id);
  const cashflow = buildCustomerCashflow({ ...profile, id: customerId });
  const derived = buildDerivedProfile({ features, cashflow, event, persona: profile.persona || {} });
  const fallback = deterministicInsights(profile, event, eligible, features, derived);
  const grounded = assertNarrationGrounded(`${fallback.ai.executiveSummary} ${Object.values(fallback.ai.productNarratives).join(" ")}`, {
    productNames: eligible.map((p) => p.name),
    amounts: collectAllowedAmounts({ features, event, products: eligible }),
  });
  fallback.citations = event.evidence.map((row) => row.id).filter(Boolean);
  fallback.grounded = grounded;
  if (options.narrate === false || !isLlmEnabled()) {
    return { source: "deterministic-fallback", model: null, ...fallback };
  }
  const { model, provider } = getLlmMeta();
  try {
    const parsed = await completeJson({
      system:
        "You are a bank relationship intelligence analyst. Use only supplied facts. Never invent customer data, eligibility, prices, or outcomes. Produce concise needs-led insights, not sales pressure or financial advice. Cite evidence ids already in the detected event.",
      user: JSON.stringify({
        task: "Explain the detected life event and provide one narrative for every supplied eligible product.",
        persona: profile.persona,
        derivedFeatures: features,
        detectedEvent: event,
        eligibleProducts: eligible,
      }),
      name: "relationship_intelligence",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          executiveSummary: { type: "string" },
          conversationOpener: { type: "string" },
          discoveryQuestions: { type: "array", items: { type: "string" } },
          productNarratives: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { name: { type: "string" }, narrative: { type: "string" } },
              required: ["name", "narrative"],
            },
          },
        },
        required: ["executiveSummary", "conversationOpener", "discoveryQuestions", "productNarratives"],
      },
      temperature: 0.2,
      maxTokens: 700,
    });
    if (!parsed) return { source: "deterministic-fallback", model, ...fallback };
    const allowed = new Set(eligible.map((p) => p.name));
    const narratives = Object.fromEntries(
      (parsed.productNarratives || []).filter((item) => allowed.has(item.name)).map((item) => [item.name, item.narrative])
    );
    if (eligible.length && Object.keys(narratives).length !== eligible.length) {
      return { source: "deterministic-fallback", model, warning: "LLM named a product that was not eligible.", ...fallback };
    }
    const ai = { ...parsed, productNarratives: narratives };
    const liveGrounded = assertNarrationGrounded(`${ai.executiveSummary} ${Object.values(ai.productNarratives).join(" ")}`, {
      productNames: eligible.map((p) => p.name),
      amounts: collectAllowedAmounts({ features, event, products: eligible }),
    });
    if (!liveGrounded.ok) {
      return { source: "deterministic-fallback", model, warning: "LLM introduced amounts or products not in the deterministic input.", ...fallback, grounded: liveGrounded };
    }
    return { source: provider, model, ...fallback, ai, grounded: liveGrounded };
  } catch (error) {
    return { source: "deterministic-fallback", model, warning: error instanceof Error ? error.message : "AI request failed", ...fallback };
  }
}

const CATALOG_BY_EVENT = {
  "new-parent": ["Family Protection Plan", "SmartSaver Plus", "Education Builder"],
  "job-loss": ["Career Transition Cover", "FlexiCash Reserve", "Payment Relief Programme"],
  wedding: ["Couples Wealth Plan", "Celebration Instalments", "Premier Joint Account"],
  "home-purchase": ["MortgageOne", "Wealth Saver", "Personal Accident Insurance"],
  retirement: ["Wealth Saver", "Personal Accident Insurance"],
  "business-owner": ["FlexiCash Reserve", "Wealth Saver"],
  medical: ["Family Protection Plan", "Personal Accident Insurance"],
  relocation: ["Wealth Saver", "Premier Joint Account"],
};

const CATALOG_IMPACT = {
  "Family Protection Plan": { type: "PROTECTION", annualValue: 2400, baseFit: 90, monthlyImpact: 480, impact: "Protects household income" },
  "SmartSaver Plus": { type: "SAVINGS", annualValue: 1800, baseFit: 84, monthlyImpact: 350, impact: "Builds a liquid buffer" },
  "Education Builder": { type: "INVESTMENT", annualValue: 1200, baseFit: 80, monthlyImpact: 250, impact: "Long-horizon education funding" },
  "Career Transition Cover": { type: "PROTECTION", annualValue: 980, baseFit: 86, monthlyImpact: 310, impact: "Keeps essential cover in place" },
  "FlexiCash Reserve": { type: "LIQUIDITY", annualValue: 1500, baseFit: 82, monthlyImpact: 420, impact: "Short-term liquidity bridge" },
  "Payment Relief Programme": { type: "SUPPORT", annualValue: 1600, baseFit: 92, monthlyImpact: 1200, impact: "Temporary instalment relief" },
  "Couples Wealth Plan": { type: "INVESTMENT", annualValue: 1100, baseFit: 80, monthlyImpact: 600, impact: "Shared wealth journey" },
  "Celebration Instalments": { type: "CREDIT", annualValue: 900, baseFit: 84, monthlyImpact: 700, impact: "Smooths a known expense cluster" },
  "Premier Joint Account": { type: "BANKING", annualValue: 700, baseFit: 88, monthlyImpact: 900, impact: "One view of shared finances" },
  MortgageOne: { type: "MORTGAGE", annualValue: 2100, baseFit: 88, monthlyImpact: 220, impact: "Home-loan servicing conversation" },
  "Wealth Saver": { type: "SAVINGS", annualValue: 800, baseFit: 76, monthlyImpact: 180, impact: "Deposit buffer conversation" },
  "Personal Accident Insurance": { type: "PROTECTION", annualValue: 420, baseFit: 74, monthlyImpact: 90, impact: "Accident cover overlay" },
};

function candidatesFor(profile, eventId) {
  if (profile.candidates?.length) return profile.candidates;
  return (CATALOG_BY_EVENT[eventId] || ["Wealth Saver"]).map((name) => {
    const meta = CATALOG_IMPACT[name] || { type: "SAVINGS", annualValue: 600, baseFit: 70, monthlyImpact: 120, impact: "Catalog conversation starter" };
    return { name, ...meta, reason: `Public catalog match for ${eventId}`, checks: [] };
  });
}

function rankEligibleProducts(profile, f, eventId) {
  const candidates = candidatesFor(profile, eventId);
  if (!candidates.length) return [];
  const income = profile.persona?.monthlyIncome || profile.baseline?.avgMonthlyIncome || f.priorPayrollAverage || 0;
  const age = profile.persona?.age || 0;
  return candidates
    .map((p) => {
      const catalog = catalogByName(p.name);
      const checks = {
        contactConsent: profile.persona?.contactConsent,
        positiveSurplus: f.monthlySurplus > 0,
        mortgageHolder: (profile.persona?.productsHeld || []).includes("Home Loan"),
        balancedRisk: ["Balanced", "Growth"].includes(profile.persona?.riskProfile),
        growthRisk: profile.persona?.riskProfile === "Growth",
        minAge: catalog?.publicEligibility?.minAge == null || age >= catalog.publicEligibility.minAge,
        minIncome: catalog?.publicEligibility?.minIncome == null || income >= catalog.publicEligibility.minIncome,
        riskProfile:
          !catalog?.publicEligibility?.riskProfile ||
          catalog.publicEligibility.riskProfile.includes(profile.persona?.riskProfile),
      };
      const required = [...(p.checks || [])];
      if (catalog?.publicEligibility?.minAge) required.push("minAge");
      if (catalog?.publicEligibility?.minIncome != null) required.push("minIncome");
      if (catalog?.publicEligibility?.riskProfile) required.push("riskProfile");
      const results = required.map((name) => ({ name, passed: Boolean(checks[name]) }));
      const eligible = results.every((r) => r.passed);
      return {
        ...p,
        productCode: catalog?.code || null,
        complianceFlags: catalog?.complianceFlags,
        fit: eligible ? p.baseFit : 0,
        eligible,
        guardrails: results,
      };
    })
    .filter((p) => p.eligible)
    .sort((a, b) => b.fit - a.fit);
}

function deterministicInsights(profile, event, products, features, derived) {
  const citation = event.evidence.map((row) => row.id).filter(Boolean).join(", ");
  return {
    persona: profile.persona || { fullName: profile.id, initials: "??" },
    baseline: profile.baseline,
    transactions: profile.transactions,
    features,
    derived,
    event,
    products,
    ai: {
      executiveSummary: `${event.label} detected at ${Math.round(event.confidence * 100)}% confidence from ${event.evidence.length} independent signals${citation ? ` [${citation}]` : ""}. Review changing needs before discussing products.`,
      conversationOpener: `I noticed a few changes in your recent financial patterns and wanted to understand whether your priorities have changed.`,
      discoveryQuestions: [
        "What has changed most in your financial priorities?",
        "How much monthly flexibility would feel comfortable?",
        "Which goal matters most over the next 12 months?",
      ],
      productNarratives: Object.fromEntries(products.map((p) => [p.name, p.reason])),
    },
  };
}
