import { Router } from "express";
import { asyncRoute, HttpError, ok } from "../middleware/errors.js";
import { listScenarios, getScenarioRecord } from "../store/memoryStore.js";
import { buildBranchingProjection, projectWithActions } from "../../agents/projection.js";
import { loadCustomerSource } from "../../agents/goalPlan.js";
import { buildCustomerCashflow } from "../../agents/cashflow.js";

const router = Router();

router.get(
  "/",
  asyncRoute((_req, res) => {
    ok(res, {
      scenarios: listScenarios().map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        customer: scenario.customer,
        event: scenario.event,
        suggestedQuestions: scenario.suggestedQuestions,
      })),
    });
  })
);

router.get(
  "/:id",
  asyncRoute((req, res) => {
    const scenario = getScenarioRecord(req.params.id);
    if (!scenario) throw new HttpError(404, "NOT_FOUND", "Scenario not found.");
    ok(res, {
      scenario,
      projection: buildBranchingProjection(scenario),
    });
  })
);

export function projectHandler(req, res) {
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

  const scenario = getScenarioRecord(req.body.scenarioId);
  if (scenario) {
    const ignored = projectWithActions(scenario, [], { branch: "ignored" });
    const modeled = projectWithActions(scenario, actions, { branch: "modeled" });
    return ok(res, {
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
  if (!source) throw new HttpError(404, "NOT_FOUND", "Scenario not found.");
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
  return ok(res, {
    ignored,
    modeled,
    delta: {
      endingBalance: modeled.endingBalance - ignored.endingBalance,
      minBalance: modeled.minBalance - ignored.minBalance,
      overdraftAvoided: Boolean(ignored.overdraftMonth && !modeled.overdraftMonth),
    },
  });
}

export default router;
