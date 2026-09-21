import { Router } from "express";
import { asyncRoute, HttpError, ok } from "../middleware/errors.js";
import { findScenario } from "../lib/domain.js";
import { loadCustomerSource } from "../../agents/goalPlan.js";
import { buildCustomerIntelligence } from "../../agents/intelligence.js";
import { bumpMetric } from "../../agents/sharedPlans.js";
import { customerProfiles } from "../../data/customer_profiles.js";

export async function todayTriageHandler(req, res) {
  const fromQuery = String(req.query.ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const ids = fromQuery.length ? fromQuery : ["h-hp-01", "new-parent", "job-loss", "wedding"];
  const limit = Math.min(24, Math.max(1, Number(req.query.limit) || ids.length));
  const rows = [];
  for (const id of ids.slice(0, limit)) {
    const source = loadCustomerSource(id);
    if (!source) continue;
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
  ok(res, { rows });
}

const router = Router();

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const source = loadCustomerSource(req.params.id);
    if (!source) throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    bumpMetric("detections");
    ok(res, await buildCustomerIntelligence(source, findScenario(req.params.id)));
  })
);

export default router;
