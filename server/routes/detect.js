import { Router } from "express";
import { asyncRoute, ok } from "../middleware/errors.js";
import { detectionPayload, legacyComparePayload } from "../lib/domain.js";
import { parseAdhocInput, runAdhocDetection } from "../../agents/adhocDetect.js";
import { bumpMetric } from "../../agents/sharedPlans.js";

const router = Router();

router.post(
  "/adhoc",
  asyncRoute((req, res) => {
    const rows = parseAdhocInput(req.body);
    const result = runAdhocDetection(rows);
    bumpMetric("detections");
    ok(res, result);
  })
);

router.get(
  "/legacy-vs-generalized/:id",
  asyncRoute((req, res) => {
    ok(res, legacyComparePayload(req.params.id));
  })
);

router.get(
  "/:id",
  asyncRoute((req, res) => {
    ok(res, detectionPayload(req.params.id));
  })
);

export default router;
