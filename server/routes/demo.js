import { Router } from "express";
import { asyncRoute, HttpError, ok } from "../middleware/errors.js";
import { getAvatar, getExperienceCatalog, patchAvatar, resetDemoStore } from "../store/memoryStore.js";
import { bumpMetric, getDemoLog, getDemoMetrics, resetSharedPlans } from "../../agents/sharedPlans.js";
import { resetSessionMemory } from "../../agents/future_you.js";

const router = Router();
const EVENT_MAP = { brief: "briefsOpened", meeting: "meetingsBooked", detect: "detections" };

router.get(
  "/experience",
  asyncRoute((_req, res) => {
    ok(res, getExperienceCatalog());
  })
);

router.get(
  "/metrics",
  asyncRoute((_req, res) => {
    ok(res, getDemoMetrics());
  })
);

router.get(
  "/log",
  asyncRoute((_req, res) => {
    ok(res, { log: getDemoLog() });
  })
);

router.get(
  "/avatar",
  asyncRoute((_req, res) => {
    ok(res, getAvatar());
  })
);

router.patch(
  "/avatar",
  asyncRoute((req, res) => {
    ok(res, patchAvatar(req.body || {}));
  })
);

router.post(
  "/event",
  asyncRoute((req, res) => {
    const mapped = EVENT_MAP[req.body?.type];
    if (!mapped) throw new HttpError(400, "VALIDATION", "Unknown event type.");
    ok(res, bumpMetric(mapped));
  })
);

router.post(
  "/reset",
  asyncRoute((_req, res) => {
    resetSessionMemory();
    resetSharedPlans();
    const { avatar } = resetDemoStore();
    ok(res, {
      ok: true,
      persisted: false,
      cleared: {
        sessionMemory: true,
        sharedPlans: true,
        avatarProfile: "server",
        customerOverlay: true,
      },
      avatarProfile: avatar,
    });
  })
);

export default router;
