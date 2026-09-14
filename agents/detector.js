import { deriveFeatures } from "./features.js";
import { getHoldoutSet } from "../data/holdout.js";

const MIN_PRIMARY = 0.4;
const CONFIDENCE_CAP = 0.98;

const TEMPLATES = [
  {
    id: "new-parent",
    type: "childbirth",
    label: "New baby and daycare starts",
    alternative: "Could represent childcare support for another family member",
    score(f, profile) {
      const evidence = [];
      let score = 0;
      if (f.childcareRecurringMonths >= 2) {
        score += 0.48;
        evidence.push(item("Recurring childcare", `${f.childcareRecurringMonths} monthly occurrences`, "transaction_pattern", 0.96, 0.48, citeTx(profile, "childcare")));
      }
      if (f.babySpendGrowth > 250) {
        score += 0.28;
        evidence.push(item("Baby-category acceleration", `S$${f.babySpendGrowth} increase from first to latest observed month`, "category_trend", 0.89, 0.28, citeTx(profile, "baby")));
      }
      if (profile?.persona?.dependants === 1) {
        score += 0.15;
        evidence.push(item("Customer profile change", "Dependants updated from 0 to 1", "customer_record", 1, 0.15));
      }
      return { score, evidence };
    },
  },
  {
    id: "job-loss",
    type: "job_loss",
    label: "Salary stop detected",
    alternative: "Could represent a payroll account switch",
    score(f, profile) {
      const evidence = [];
      let score = 0;
      if (f.missingPayrollCycles >= 2) {
        score += 0.58;
        evidence.push(item("Payroll interruption", `${f.missingPayrollCycles} expected salary cycles missing`, "income_pattern", 0.98, 0.58, citeTx(profile, "income")));
      }
      if (f.priorPayrollAverage > 0) {
        score += 0.2;
        evidence.push(item("Historical salary baseline", `Prior average S$${f.priorPayrollAverage.toLocaleString("en-SG")}/month`, "transaction_baseline", 0.99, 0.2));
      }
      if (f.recentObservedIncome > 0 && f.priorPayrollAverage > 0 && f.recentObservedIncome < f.priorPayrollAverage * 0.5) {
        score += 0.09;
        evidence.push(item("Replacement income gap", `Latest income is ${Math.round((1 - f.recentObservedIncome / f.priorPayrollAverage) * 100)}% below baseline`, "cashflow_change", 0.87, 0.09));
      }
      return { score, evidence };
    },
  },
  {
    id: "wedding",
    type: "marriage",
    label: "Wedding planning spend spike",
    alternative: "Could represent event planning on behalf of someone else",
    score(f, profile) {
      const evidence = [];
      let score = 0;
      if (f.weddingSpend90d > 5000) {
        score += 0.5;
        evidence.push(item("Wedding merchant cluster", `S$${f.weddingSpend90d.toLocaleString("en-SG")} across verified wedding merchants`, "merchant_cluster", 0.95, 0.5, citeTx(profile, "wedding")));
      }
      if (f.partnerContributionMonths >= 2) {
        score += 0.27;
        evidence.push(item("Recurring partner contribution", `S$${f.partnerContributions.toLocaleString("en-SG")} across ${f.partnerContributionMonths} months`, "transfer_pattern", 0.9, 0.27, citeTx(profile, "partnerTransfer")));
      }
      if (profile?.persona?.maritalStatus === "Engaged") {
        score += 0.12;
        evidence.push(item("Customer profile", "Marital status recorded as engaged", "customer_record", 1, 0.12));
      }
      return { score, evidence };
    },
  },
  {
    id: "home-purchase",
    type: "home_purchase",
    label: "Home purchase / renovation cluster",
    alternative: "Could represent a renovation on an existing property",
    score(f, profile) {
      const evidence = [];
      let score = 0;
      if (f.propertyEventSpend > 4000) {
        score += 0.52;
        evidence.push(item("Property / renovation cluster", `S$${Math.round(f.propertyEventSpend).toLocaleString("en-SG")} at agency, HDB, renovation or furnishings`, "merchant_cluster", 0.93, 0.52, citeTx(profile, "home")));
      }
      if (f.homeSpend > 400) {
        score += 0.22;
        evidence.push(item("Home furnishings spend", `S$${Math.round(f.homeSpend).toLocaleString("en-SG")} in home category`, "category_trend", 0.84, 0.22, citeTx(profile, "home")));
      }
      return { score, evidence };
    },
  },
  {
    id: "medical",
    type: "medical",
    label: "Major medical episode",
    alternative: "Could represent a one-off specialist visit",
    score(f) {
      const evidence = [];
      let score = 0;
      if (f.maxHealthcareTx >= 3000) {
        score += 0.55;
        evidence.push(item("Large healthcare presentment", `S$${Math.round(f.maxHealthcareTx).toLocaleString("en-SG")} single healthcare debit`, "cashflow_change", 0.94, 0.55));
      }
      if (f.healthcareSpend > 4000) {
        score += 0.25;
        evidence.push(item("Healthcare category total", `S$${Math.round(f.healthcareSpend).toLocaleString("en-SG")} across the window`, "category_trend", 0.88, 0.25));
      }
      return { score, evidence };
    },
  },
  {
    id: "relocation",
    type: "relocation",
    label: "Relocation",
    alternative: "Could represent a holiday with excess baggage",
    score(f) {
      const evidence = [];
      let score = 0;
      if (f.relocationSpend > 1500) {
        score += 0.5;
        evidence.push(item("Moving merchant cluster", `S$${Math.round(f.relocationSpend).toLocaleString("en-SG")} at movers`, "merchant_cluster", 0.92, 0.5));
      }
      if (f.travelSpend > 800) {
        score += 0.22;
        evidence.push(item("Travel spend alongside move", `S$${Math.round(f.travelSpend).toLocaleString("en-SG")} air travel`, "category_trend", 0.8, 0.22));
      }
      return { score, evidence };
    },
  },
  {
    id: "business-owner",
    type: "business_owner",
    label: "Self-employed cashflow",
    alternative: "Could represent a side gig rather than a primary business",
    score(f) {
      const evidence = [];
      let score = 0;
      if (f.businessIncome > 1500) {
        score += 0.5;
        evidence.push(item("Merchant / settlement credits", `S$${Math.round(f.businessIncome).toLocaleString("en-SG")} business-income credits`, "income_pattern", 0.9, 0.5));
      }
      if (f.taxSpend > 400) {
        score += 0.22;
        evidence.push(item("GST / tax outflow", `S$${Math.round(f.taxSpend).toLocaleString("en-SG")} tax presentments`, "transaction_pattern", 0.86, 0.22));
      }
      return { score, evidence };
    },
  },
  {
    id: "retirement",
    type: "retirement",
    label: "Retirement transition",
    alternative: "Could represent a reduced-hours arrangement",
    score(f, profile) {
      const evidence = [];
      let score = 0;
      if ((profile?.persona?.age || 0) >= 55 && f.priorPayrollAverage > 0 && f.priorPayrollAverage < 4000) {
        score += 0.4;
        evidence.push(item("Age + lower payroll band", `Age ${profile.persona.age}, payroll ~S$${f.priorPayrollAverage.toLocaleString("en-SG")}`, "customer_record", 0.7, 0.4));
      }
      if (f.healthcareSpend > 150 && f.maxHealthcareTx < 3000 && f.healthcareSpend < 2000) {
        score += 0.15;
        evidence.push(item("Routine healthcare, not a spike", `S$${Math.round(f.healthcareSpend).toLocaleString("en-SG")} healthcare, no large episode`, "category_trend", 0.6, 0.15));
      }
      return { score, evidence };
    },
  },
];

function citeTx(profile, category, n = 3) {
  return (profile?.transactions || [])
    .filter((t) => t.category === category)
    .slice(0, n)
    .map((t) => t.id)
    .filter(Boolean);
}

function item(label, value, source, confidence, scoreWeight, txnIds = []) {
  return {
    id: `ev-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}`,
    label,
    value,
    source,
    confidence,
    scoreWeight,
    txnIds,
  };
}

function noneEvent() {
  return {
    id: "none",
    type: "none",
    label: "No strong life-event",
    confidence: 0,
    evidence: [],
    alternativeHypothesis: "Spend looks like a stable month-to-month pattern",
    scoreWeightTotal: 0,
  };
}

function finalize(template, scored) {
  const scoreWeightTotal = scored.evidence.reduce((n, e) => n + e.scoreWeight, 0);
  return {
    id: template.id,
    type: template.type,
    label: template.label,
    confidence: Math.min(CONFIDENCE_CAP, scored.score),
    evidence: scored.evidence,
    alternativeHypothesis: template.alternative,
    scoreWeightTotal,
  };
}

/** Scores every template. Does not take a scenario id. */
export function detectLifeEvents(features, profile = {}) {
  const ranked = TEMPLATES.map((template) => finalize(template, template.score(features, profile))).sort(
    (a, b) => b.confidence - a.confidence
  );
  const primary = ranked[0]?.confidence >= MIN_PRIMARY ? ranked[0] : noneEvent();
  return {
    primary,
    alternatives: ranked.filter((row) => row.id !== primary.id && row.confidence > 0.15),
  };
}

/** Old branch-logic detector. Kept only for Wow gap #6 before/after. Not used live. */
export function legacyDetectLifeEvent(profile, scenario, f) {
  const evidence = [];
  let score = 0;
  if (scenario.id === "new-parent") {
    if (f.childcareRecurringMonths >= 2) {
      score += 0.48;
      evidence.push(item("Recurring childcare", `${f.childcareRecurringMonths} monthly occurrences`, "transaction_pattern", 0.96, 0.48));
    }
    if (f.babySpendGrowth > 250) {
      score += 0.28;
      evidence.push(item("Baby-category acceleration", `S$${f.babySpendGrowth} increase from first to latest observed month`, "category_trend", 0.89, 0.28));
    }
    if (profile.persona?.dependants === 1) {
      score += 0.15;
      evidence.push(item("Customer profile change", "Dependants updated from 0 to 1", "customer_record", 1, 0.15));
    }
  }
  if (scenario.id === "job-loss") {
    if (f.missingPayrollCycles >= 2) {
      score += 0.58;
      evidence.push(item("Payroll interruption", `${f.missingPayrollCycles} expected salary cycles missing`, "income_pattern", 0.98, 0.58));
    }
    if (f.priorPayrollAverage > 0) {
      score += 0.2;
      evidence.push(item("Historical salary baseline", `Prior average S$${f.priorPayrollAverage.toLocaleString("en-SG")}/month`, "transaction_baseline", 0.99, 0.2));
    }
    if (f.recentObservedIncome > 0 && f.recentObservedIncome < f.priorPayrollAverage * 0.5) {
      score += 0.09;
      evidence.push(item("Replacement income gap", `Latest income is ${Math.round((1 - f.recentObservedIncome / f.priorPayrollAverage) * 100)}% below baseline`, "cashflow_change", 0.87, 0.09));
    }
  }
  if (scenario.id === "wedding") {
    if (f.weddingSpend90d > 5000) {
      score += 0.5;
      evidence.push(item("Wedding merchant cluster", `S$${f.weddingSpend90d.toLocaleString("en-SG")} across verified wedding merchants`, "merchant_cluster", 0.95, 0.5));
    }
    if (f.partnerContributionMonths >= 2) {
      score += 0.27;
      evidence.push(item("Recurring partner contribution", `S$${f.partnerContributions.toLocaleString("en-SG")} across ${f.partnerContributionMonths} months`, "transfer_pattern", 0.9, 0.27));
    }
    if (profile.persona?.maritalStatus === "Engaged") {
      score += 0.12;
      evidence.push(item("Customer profile", "Marital status recorded as engaged", "customer_record", 1, 0.12));
    }
  }
  return {
    id: scenario.id,
    type: scenario.event?.type,
    label: scenario.event?.label,
    confidence: Math.min(CONFIDENCE_CAP, score),
    evidence,
    alternativeHypothesis:
      scenario.id === "new-parent"
        ? "Could represent childcare support for another family member"
        : scenario.id === "job-loss"
          ? "Could represent a payroll account switch"
          : "Could represent event planning on behalf of someone else",
  };
}

const LEGACY_EMPTY = {
  id: "none",
  type: null,
  label: "No matching scenario branch",
  confidence: 0,
  evidence: [],
  alternativeHypothesis: "Legacy detector only fires on prepared hero scenario ids",
};

/** Wow gap #6: same ledger through branch-logic vs generalized scorer. */
export function compareLegacyVsGeneralized({ features, profile = {}, scenario = null }) {
  const { primary, alternatives } = detectLifeEvents(features, profile);
  return {
    generalized: primary,
    alternatives,
    legacy: scenario ? legacyDetectLifeEvent(profile, scenario, features) : LEGACY_EMPTY,
  };
}

export function evaluateHoldout(rows = getHoldoutSet()) {
  const results = rows.map((row) => {
    const features = deriveFeatures({ transactions: row.transactions });
    const { primary } = detectLifeEvents(features);
    return {
      id: row.id,
      truth: row.groundTruth.type,
      predicted: primary.id,
      confidence: primary.confidence,
      label: primary.label,
      correct: primary.id === row.groundTruth.type,
    };
  });
  const labeled = results.filter((r) => r.truth !== "none");
  const predicted = results.filter((r) => r.predicted !== "none");
  const tp = results.filter((r) => r.predicted !== "none" && r.predicted === r.truth).length;
  const precision = predicted.length ? tp / predicted.length : 0;
  const recall = labeled.length ? tp / labeled.length : 0;
  const accuracy = results.filter((r) => r.correct).length / results.length;
  const byType = {};
  for (const r of results) {
    if (!byType[r.truth]) byType[r.truth] = { n: 0, correct: 0 };
    byType[r.truth].n += 1;
    if (r.correct) byType[r.truth].correct += 1;
  }
  return {
    size: results.length,
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
    accuracy: Number(accuracy.toFixed(3)),
    byType,
    results,
  };
}
