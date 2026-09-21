import { Router } from "express";
import { asyncRoute, HttpError, ok } from "../middleware/errors.js";
import { requireFields } from "../middleware/validate.js";
import { resolveFutureYouContext } from "../lib/domain.js";
import { answerAsFutureYou } from "../../agents/future_you.js";

export async function futureYouHandler(req, res) {
  const question = String(req.body.question || "").trim();
  if (!question) throw new HttpError(400, "VALIDATION", "Question is required.");
  const ctx = resolveFutureYouContext(req.body.scenarioId, req.body.branch, req.body);
  if (!ctx) throw new HttpError(404, "NOT_FOUND", "Scenario not found.");
  const result = await answerAsFutureYou({
    scenario: ctx.scenario,
    projection: ctx.projection,
    question,
    sessionId: req.body.sessionId || "demo",
  });
  ok(res, result);
}

const router = Router();
router.post("/", requireFields("body", ["question"]), asyncRoute(futureYouHandler));
export default router;
