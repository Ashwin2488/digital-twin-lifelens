import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { errorHandler, notFound, asyncRoute, ok, HttpError } from "./middleware/errors.js";
import customers from "./routes/customers.js";
import scenarios, { projectHandler } from "./routes/scenarios.js";
import detect from "./routes/detect.js";
import intelligence, { todayTriageHandler } from "./routes/intelligence.js";
import plans from "./routes/plans.js";
import demo from "./routes/demo.js";
import products from "./routes/products.js";
import futureYou, { futureYouHandler } from "./routes/futureYou.js";
import { getHoldoutSummaryRecord, getLedgerRecord, loadStore } from "./store/memoryStore.js";
import { isLlmEnabled, isDetectLlmOn, getLlmMeta } from "../agents/llmProvider.js";
import { evaluateHoldout } from "../agents/detector.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

export function createApp() {
  loadStore();
  const app = express();
  app.use(express.json({ limit: "120kb" }));

  app.get("/api/health", (_req, res) => {
    const { provider, model } = getLlmMeta();
    ok(res, {
      ok: true,
      aiConnected: isLlmEnabled(),
      detectLlmOn: isDetectLlmOn(),
      provider: isLlmEnabled() ? provider : null,
      model: isLlmEnabled() ? model : null,
    });
  });

  app.use("/api/customers", customers);
  app.use("/api/scenarios", scenarios);
  app.use("/api/detect", detect);
  app.use("/api/intelligence", intelligence);
  app.use("/api/plans", plans);
  app.use("/api/demo", demo);
  app.use("/api/products", products);
  app.use("/api/future-you", futureYou);
  app.post("/api/future-you", asyncRoute(futureYouHandler));

  app.post("/api/project", asyncRoute(projectHandler));
  app.get("/api/today-triage", asyncRoute(todayTriageHandler));
  app.get("/api/holdout", asyncRoute((_req, res) => ok(res, getHoldoutSummaryRecord())));
  app.get("/api/eval/holdout-detection", asyncRoute((_req, res) => ok(res, evaluateHoldout())));
  app.get(
    "/api/ledgers/:id",
    asyncRoute((req, res) => {
      const ledger = getLedgerRecord(req.params.id);
      if (!ledger) throw new HttpError(404, "NOT_FOUND", "Ledger not found.");
      ok(res, ledger);
    })
  );

  const clientDist = path.join(root, "client", "dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    const spaRoutes = ["/", "/today", "/customers", "/future", "/client", "/developer"];
    app.get(spaRoutes, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use("/api", notFound);
  app.use(errorHandler);
  return app;
}
