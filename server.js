import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scenarios } from "./data/scenarios.js";
import { buildBranchingProjection, projectWithActions } from "./agents/projection.js";
import { answerAsFutureYou, resetSessionMemory } from "./agents/future_you.js";
import { customerProfiles } from "./data/customer_profiles.js";
import { buildCustomerIntelligence } from "./agents/intelligence.js";
import { getHoldoutById, holdoutSummary } from "./data/holdout.js";
import { deriveFeatures } from "./agents/features.js";
import { compareLegacyVsGeneralized, detectLifeEvents, evaluateHoldout, legacyDetectLifeEvent } from "./agents/detector.js";
import { parseAdhocInput, runAdhocDetection } from "./agents/adhocDetect.js";
import { loadCustomerSource, planGoalForCustomer, enrichGoalCopy, defaultGoal } from "./agents/goalPlan.js";
import { suggestLevers } from "./agents/leverSuggest.js";
import { parseLifeIntent, intentToGoal } from "./agents/intentParse.js";
import { isLlmEnabled, isDetectLlmOn, getLlmMeta } from "./agents/llmProvider.js";
import { buildCustomerCashflow } from "./agents/cashflow.js";
import { buildDerivedProfile } from "./agents/derivedProfile.js";
import { getIdentity } from "./data/identity.js";
import { getCreditProfile } from "./data/creditProfile.js";
import { holdingsFor } from "./data/policyHoldings.js";
import { PRODUCT_CATALOG } from "./data/productCatalog.js";
import { sharePlan, listPlans, resetSharedPlans, bumpMetric, getDemoMetrics, getDemoLog } from "./agents/sharedPlans.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "120kb" }));
app.use((err, _req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request too large. Cap is 120kb." });
  }
  return next(err);
});
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  const { provider, model } = getLlmMeta();
  res.json({
    ok: true,
    aiConnected: isLlmEnabled(),
    detectLlmOn: isDetectLlmOn(),
    provider: isLlmEnabled() ? provider : null,
    model: isLlmEnabled() ? model : null,
  });
});

app.get("/api/scenarios", (_req, res) => {
  res.json({
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      customer: scenario.customer,
      event: scenario.event,
      suggestedQuestions: scenario.suggestedQuestions,
    })),
  });
});

app.get("/api/scenarios/:id", (req, res) => {
  const scenario = findScenario(req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found." });
  }

  res.json({
    scenario,
    projection: buildBranchingProjection(scenario),
  });
});

app.post("/api/project", (req, res) => {
  const actions = Array.isArray(req.body.actions)
    ? req.body.actions.map((action) => ({
        id: action.id || action.name,
        label: action.label || action.name,
        name: action.name,
        monthlyImpact: Number(action.monthlyImpact) || 0,
        startsMonth: action.startsMonth ?? 1,
        endsMonth: action.endsMonth,
      }))
    : [];

  const scenario = findScenario(req.body.scenarioId);
  if (scenario) {
    const ignored = projectWithActions(scenario, [], { branch: "ignored" });
    const modeled = projectWithActions(scenario, actions, { branch: "modeled" });
    return res.json({
      ignored,
      modeled,
      delta: {
        endingBalance: modeled.endingBalance - ignored.endingBalance,
        minBalance: modeled.minBalance - ignored.minBalance,
        overdraftAvoided: Boolean(ignored.overdraftMonth && !modeled.overdraftMonth),
      },
    });
  }

  const source = loadCustomerSource(req.body.scenarioId);
  if (!source) return res.status(404).json({ error: "Scenario not found." });
  const cashflow = buildCustomerCashflow({ ...source, id: req.body.scenarioId });
  const stub = {
    id: req.body.scenarioId,
    startingBalance: cashflow.startingBalance,
    income: cashflow.income,
    recurringExpenses: cashflow.recurringExpenses,
    monthlyEvents: [],
  };
  const ignored = projectWithActions(stub, [], { branch: "ignored" });
  const modeled = projectWithActions(stub, actions, { branch: "modeled" });
  res.json({
    ignored,
    modeled,
    delta: {
      endingBalance: modeled.endingBalance - ignored.endingBalance,
      minBalance: modeled.minBalance - ignored.minBalance,
      overdraftAvoided: Boolean(ignored.overdraftMonth && !modeled.overdraftMonth),
    },
  });
});

app.get("/api/intelligence/:id", async (req, res) => {
  const source = loadCustomerSource(req.params.id);
  if (!source) return res.status(404).json({ error: "Customer not found." });
  try {
    bumpMetric("detections");
    res.json(await buildCustomerIntelligence(source, findScenario(req.params.id)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Customer intelligence pipeline failed." });
  }
});

app.get("/api/today-triage", async (_req, res) => {
  const ids = ["h-hp-01", "new-parent", "job-loss", "wedding"];
  try {
    const rows = [];
    for (const id of ids) {
      const source = loadCustomerSource(id);
      const intel = await buildCustomerIntelligence(source, findScenario(id), { narrate: false, hypothesize: false });
      const eligibleValue = (intel.products || []).reduce((n, p) => n + (p.annualValue || 0), 0);
      rows.push({
        id,
        split: customerProfiles[id] ? "hero" : "holdout",
        persona: intel.persona,
        event: { id: intel.event.id, label: intel.event.label, confidence: intel.event.confidence },
        eligibleValue,
        score: Number((intel.event.confidence * eligibleValue).toFixed(2)),
      });
    }
    rows.sort((a, b) => b.score - a.score || b.event.confidence - a.event.confidence);
    res.json({ rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Triage failed." });
  }
});

function customer360(req, res) {
  const source = loadCustomerSource(req.params.id);
  if (!source) return res.status(404).json({ error: "Customer not found." });
  const features = deriveFeatures(source);
  const cashflow = buildCustomerCashflow({ ...source, id: req.params.id });
  const { primary } = detectLifeEvents(features, source);
  res.json({
    identity: getIdentity(req.params.id),
    holdings: holdingsFor(req.params.id),
    credit: getCreditProfile(req.params.id),
    creditNote: "Synthetic bureau profile. Not derived from the transaction ledger.",
    derived: buildDerivedProfile({
      features,
      cashflow,
      event: primary,
      persona: source.persona || {},
    }),
  });
}
app.get("/api/customers/:id/360", customer360);
app.get("/api/customers/:id/profile", customer360);

app.get("/api/products", (_req, res) => {
  res.json({ products: PRODUCT_CATALOG, scraped: false });
});

app.get("/api/holdout", (_req, res) => {
  res.json(holdoutSummary());
});

app.get("/api/eval/holdout-detection", (_req, res) => {
  res.json(evaluateHoldout());
});

app.post("/api/detect/adhoc", (req, res) => {
  try {
    const rows = parseAdhocInput(req.body);
    const result = runAdhocDetection(rows);
    bumpMetric("detections");
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ error: error instanceof Error ? error.message : "Adhoc detection failed." });
  }
});

app.get("/api/detect/legacy-vs-generalized/:id", (req, res) => {
  const resolved = resolveLedger(req.params.id);
  if (!resolved) return res.status(404).json({ error: "Ledger not found." });
  res.json({
    id: req.params.id,
    split: resolved.split,
    groundTruth: resolved.holdout?.groundTruth || null,
    ...compareLegacyVsGeneralized({
      features: resolved.features,
      profile: resolved.profile || {},
      scenario: resolved.scenario,
    }),
  });
});

app.get("/api/detect/:id", (req, res) => {
  sendDetect(req, res);
});

app.get("/api/customers/:id/detect", (req, res) => {
  sendDetect(req, res);
});

app.post("/api/customers/:id/intent", async (req, res) => {
  const source = loadCustomerSource(req.params.id);
  if (!source) return res.status(404).json({ error: "Customer not found." });
  try {
    const intent = await parseLifeIntent(req.body?.text);
    const cashflow = buildCustomerCashflow({ ...source, id: req.params.id });
    const goal = intentToGoal(intent, { ...defaultGoal(cashflow), asOf: cashflow.asOf });
    const plan = planGoalForCustomer(req.params.id, { goal, levers: req.body?.levers || {} });
    res.json({ intent, goal, plan: await enrichGoalCopy(plan) });
  } catch (error) {
    res.status(error.status || 400).json({ error: error instanceof Error ? error.message : "Intent failed." });
  }
});

app.post("/api/customers/:id/goal-plan", async (req, res) => {
  try {
    const plan = planGoalForCustomer(req.params.id, {
      goal: req.body?.goal,
      levers: req.body?.levers,
    });
    if (!plan) return res.status(404).json({ error: "Customer not found." });
    res.json(await enrichGoalCopy(plan));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Goal plan failed." });
  }
});

app.post("/api/plans", (req, res) => {
  const customerId = String(req.body?.customerId || "").trim();
  if (!customerId || !loadCustomerSource(customerId)) return res.status(404).json({ error: "Customer not found." });
  res.json(sharePlan(req.body));
});

app.get("/api/plans", (_req, res) => {
  res.json({ plans: listPlans() });
});

app.get("/api/demo/metrics", (_req, res) => {
  res.json(getDemoMetrics());
});

app.get("/api/demo/log", (_req, res) => {
  res.json({ log: getDemoLog() });
});

app.post("/api/customers/:id/lever-suggest", async (req, res) => {
  try {
    const result = await suggestLevers(req.params.id, { goal: req.body?.goal, levers: req.body?.levers });
    if (!result) return res.status(404).json({ error: "Customer not found." });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Lever suggestion failed." });
  }
});

app.post("/api/demo/event", (req, res) => {
  const type = req.body?.type;
  const map = { brief: "briefsOpened", meeting: "meetingsBooked", detect: "detections" };
  if (!map[type]) return res.status(400).json({ error: "Unknown event type." });
  res.json(bumpMetric(map[type]));
});

app.post("/api/demo/reset", (_req, res) => {
  resetSessionMemory();
  resetSharedPlans();
  res.json({
    ok: true,
    persisted: false,
    cleared: {
      sessionMemory: true,
      sharedPlans: true,
      avatarProfile: "client-applied",
    },
    avatarProfile: { coins: 120, owned: [], equipped: [], colour: "sky" },
  });
});

app.get("/api/ledgers/:id", (req, res) => {
  const profile = customerProfiles[req.params.id];
  if (profile) {
    return res.json({
      id: req.params.id,
      split: "hero",
      transactions: profile.transactions,
    });
  }
  const holdout = getHoldoutById(req.params.id);
  if (holdout) return res.json(holdout);
  return res.status(404).json({ error: "Ledger not found." });
});

app.post("/api/future-you", async (req, res) => {
  const question = String(req.body.question || "").trim();
  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  const ctx = resolveFutureYouContext(req.body.scenarioId, req.body.branch, req.body);
  if (!ctx) return res.status(404).json({ error: "Scenario not found." });

  try {
    const result = await answerAsFutureYou({
      scenario: ctx.scenario,
      projection: ctx.projection,
      question,
      sessionId: req.body.sessionId || "demo",
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Future You failed to respond.",
    });
  }
});

function resolveFutureYouContext(id, branchRaw, extras = {}) {
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

function sendDetect(req, res) {
  const resolved = resolveLedger(req.params.id);
  if (!resolved) return res.status(404).json({ error: "Ledger not found." });
  const detected = detectLifeEvents(resolved.features, resolved.profile || { transactions: resolved.holdout?.transactions });
  res.json({
    id: req.params.id,
    split: resolved.split,
    groundTruth: resolved.holdout?.groundTruth || null,
    features: resolved.features,
    ...detected,
    legacy: resolved.scenario ? legacyDetectLifeEvent(resolved.profile, resolved.scenario, resolved.features) : null,
  });
}

function findScenario(id) {
  return scenarios.find((scenario) => scenario.id === id);
}

function resolveLedger(id) {
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

const spaRoutes = ["/today", "/customers", "/future", "/play-future", "/client", "/developer"];
app.get(spaRoutes, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`LifeLens running at http://localhost:${port}`);
});
