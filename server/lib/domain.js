import { customerProfiles } from "../../data/customer_profiles.js";
import { getHoldoutById } from "../../data/holdout.js";
import { deriveFeatures } from "../../agents/features.js";
import { compareLegacyVsGeneralized, detectLifeEvents, legacyDetectLifeEvent } from "../../agents/detector.js";
import { buildCustomerCashflow } from "../../agents/cashflow.js";
import { buildDerivedProfile } from "../../agents/derivedProfile.js";
import { loadCustomerSource, planGoalForCustomer } from "../../agents/goalPlan.js";
import { buildBranchingProjection } from "../../agents/projection.js";
import { getCreditRecord, getHoldingsRecord, getIdentityRecord, getScenarioRecord } from "../store/memoryStore.js";
import { HttpError } from "../middleware/errors.js";

export function findScenario(id) {
  return getScenarioRecord(id);
}

export function resolveLedger(id) {
  const profile = customerProfiles[id];
  const holdout = getHoldoutById(id);
  if (!profile && !holdout) return null;
  return {
    profile: profile || null,
    holdout,
    split: profile ? "hero" : "holdout",
    scenario: findScenario(id),
    features: deriveFeatures(profile || { transactions: holdout.transactions }),
  };
}

export function detectionPayload(id) {
  const resolved = resolveLedger(id);
  if (!resolved) throw new HttpError(404, "NOT_FOUND", "Ledger not found.");
  const detected = detectLifeEvents(resolved.features, resolved.profile || { transactions: resolved.holdout?.transactions });
  return {
    id,
    split: resolved.split,
    groundTruth: resolved.holdout?.groundTruth || null,
    features: resolved.features,
    ...detected,
    legacy: resolved.scenario ? legacyDetectLifeEvent(resolved.profile, resolved.scenario, resolved.features) : null,
  };
}

export function legacyComparePayload(id) {
  const resolved = resolveLedger(id);
  if (!resolved) throw new HttpError(404, "NOT_FOUND", "Ledger not found.");
  return {
    id,
    split: resolved.split,
    groundTruth: resolved.holdout?.groundTruth || null,
    ...compareLegacyVsGeneralized({
      features: resolved.features,
      profile: resolved.profile || {},
      scenario: resolved.scenario,
    }),
  };
}

export function customer360Payload(id) {
  const source = loadCustomerSource(id);
  if (!source) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
  const features = deriveFeatures(source);
  const cashflow = buildCustomerCashflow({ ...source, id });
  const { primary } = detectLifeEvents(features, source);
  return {
    identity: getIdentityRecord(id),
    holdings: getHoldingsRecord(id),
    credit: getCreditRecord(id),
    creditNote: "Synthetic bureau profile. Not derived from the transaction ledger.",
    derived: buildDerivedProfile({
      features,
      cashflow,
      event: primary,
      persona: source.persona || {},
    }),
  };
}

export function resolveFutureYouContext(id, branchRaw, extras = {}) {
  const usePlan = Boolean(extras.usePlan || extras.goal || extras.userIntent);
  const scenario = findScenario(id);
  if (scenario && !usePlan) {
    const branch = branchRaw === "ignored" ? "ignored" : "accepted";
    return { scenario, projection: buildBranchingProjection(scenario)[branch] };
  }
  const source = loadCustomerSource(id);
  if (!source) return null;
  const features = deriveFeatures(source);
  const { primary } = detectLifeEvents(features, source);
  const plan = planGoalForCustomer(id, { goal: extras.goal, levers: extras.levers || {} });
  const modeled = branchRaw === "accepted" || branchRaw === "modeled";
  const projection = modeled ? plan.modeled : plan.ignored;
  const intentLine = extras.userIntent ? `Customer said: ${extras.userIntent}` : `${primary.label} from the customer's ledger.`;
  return {
    scenario: {
      id,
      customer: source.persona?.fullName || id,
      event: { ...primary, detectedMonth: "this window" },
      tone: "steady",
      userIntent: extras.userIntent || "",
      trace: [intentLine, `Goal ${plan.goal.type} ${plan.goal.targetAmount} by ${plan.goal.targetDate}`],
      autopilotActions: [],
    },
    projection: {
      ...projection,
      headline: modeled ? "Goal-plan modelled" : "Autopilot ignored",
      acceptedActions: projection.acceptedActions || [],
      declinedActions: projection.declinedActions || [],
    },
  };
}
