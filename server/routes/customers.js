import { Router } from "express";
import { asyncRoute, HttpError, ok } from "../middleware/errors.js";
import { applyListQuery } from "../store/query.js";
import {
  getCustomerRecord,
  listCustomerRecords,
  patchCustomerRecord,
  getLedgerRecord,
} from "../store/memoryStore.js";
import { customer360Payload, detectionPayload } from "../lib/domain.js";
import { loadCustomerSource, planGoalForCustomer, enrichGoalCopy, defaultGoal } from "../../agents/goalPlan.js";
import { suggestLevers } from "../../agents/leverSuggest.js";
import { parseLifeIntent, intentToGoal } from "../../agents/intentParse.js";
import { buildCustomerCashflow } from "../../agents/cashflow.js";

const router = Router();

router.get(
  "/",
  asyncRoute((req, res) => {
    const all = listCustomerRecords();
    const { rows, meta } = applyListQuery(all, req.query, {
      searchFields: ["fullName", "phone", "segment", "occupation", "eventLabel", "id"],
    });
    ok(
      res,
      {
        customers: rows,
        portfolioSize: all.length,
        counts: {
          lifeEvents: all.filter((row) => row.status?.key === "life-event").length,
          reviewDue: all.filter((row) => row.status?.key === "review").length,
        },
      },
      meta
    );
  })
);

router.get(
  "/:id",
  asyncRoute((req, res) => {
    const row = getCustomerRecord(req.params.id);
    if (!row) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    ok(res, row);
  })
);

router.patch(
  "/:id",
  asyncRoute((req, res) => {
    const row = patchCustomerRecord(req.params.id, req.body || {});
    if (!row) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    ok(res, row);
  })
);

router.get(
  "/:id/360",
  asyncRoute((req, res) => {
    ok(res, customer360Payload(req.params.id));
  })
);

router.get(
  "/:id/profile",
  asyncRoute((req, res) => {
    ok(res, customer360Payload(req.params.id));
  })
);

router.get(
  "/:id/ledger",
  asyncRoute((req, res) => {
    const ledger = getLedgerRecord(req.params.id);
    if (!ledger) throw new HttpError(404, "NOT_FOUND", "Ledger not found.");
    ok(res, ledger);
  })
);

router.get(
  "/:id/detect",
  asyncRoute((req, res) => {
    ok(res, detectionPayload(req.params.id));
  })
);

router.post(
  "/:id/intent",
  asyncRoute(async (req, res) => {
    const source = loadCustomerSource(req.params.id);
    if (!source) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    const intent = await parseLifeIntent(req.body?.text);
    const cashflow = buildCustomerCashflow({ ...source, id: req.params.id });
    const goal = intentToGoal(intent, { ...defaultGoal(cashflow), asOf: cashflow.asOf });
    const plan = planGoalForCustomer(req.params.id, { goal, levers: req.body?.levers || {} });
    ok(res, { intent, goal, plan: await enrichGoalCopy(plan) });
  })
);

router.post(
  "/:id/goal-plan",
  asyncRoute(async (req, res) => {
    const plan = planGoalForCustomer(req.params.id, {
      goal: req.body?.goal,
      levers: req.body?.levers,
    });
    if (!plan) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    ok(res, await enrichGoalCopy(plan));
  })
);

router.post(
  "/:id/lever-suggest",
  asyncRoute(async (req, res) => {
    const result = await suggestLevers(req.params.id, { goal: req.body?.goal, levers: req.body?.levers });
    if (!result) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    ok(res, result);
  })
);

export default router;
