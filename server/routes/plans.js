import { Router } from "express";
import { asyncRoute, HttpError, ok } from "../middleware/errors.js";
import { applyListQuery } from "../store/query.js";
import { deletePlan, getPlan, listPlans, sharePlan } from "../../agents/sharedPlans.js";
import { loadCustomerSource } from "../../agents/goalPlan.js";

const router = Router();

router.get(
  "/",
  asyncRoute((req, res) => {
    const { rows, meta } = applyListQuery(listPlans(), req.query, {
      searchFields: ["label", "customerId", "userIntent"],
    });
    ok(res, { plans: rows }, meta);
  })
);

router.post(
  "/",
  asyncRoute((req, res) => {
    const customerId = String(req.body?.customerId || "").trim();
    if (!customerId || !loadCustomerSource(customerId)) {
      throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    }
    ok(res, sharePlan(req.body), undefined, 201);
  })
);

router.delete(
  "/:id",
  asyncRoute((req, res) => {
    if (!getPlan(req.params.id)) throw new HttpError(404, "NOT_FOUND", "Plan not found.");
    deletePlan(req.params.id);
    ok(res, { ok: true });
  })
);

export default router;
