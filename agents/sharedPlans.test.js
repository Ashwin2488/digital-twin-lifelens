import { beforeEach, describe, expect, it } from "vitest";
import {
  bumpMetric,
  getDemoLog,
  getDemoMetrics,
  hasPlanFor,
  listPlans,
  resetSharedPlans,
  sharePlan,
} from "./sharedPlans.js";

beforeEach(() => {
  resetSharedPlans();
});

describe("sharePlan / listPlans / hasPlanFor", () => {
  it("stores a shared plan and makes it discoverable by customerId", () => {
    sharePlan({ customerId: "cust-1", label: "Amira Tan", onTrack: true, endingBalance: 5000 });
    expect(hasPlanFor("cust-1")).toBe(true);
    expect(hasPlanFor("cust-unknown")).toBe(false);
    expect(listPlans()).toHaveLength(1);
  });

  it("lists plans newest-first", async () => {
    sharePlan({ customerId: "cust-1", label: "First" });
    await new Promise((resolve) => setTimeout(resolve, 2));
    sharePlan({ customerId: "cust-2", label: "Second" });
    const plans = listPlans();
    expect(plans[0].label).toBe("Second");
  });

  it("increments the plansShared metric and logs the event", () => {
    sharePlan({ customerId: "cust-1", label: "Amira Tan" });
    expect(getDemoMetrics().plansShared).toBe(1);
    expect(getDemoLog()[0]).toMatchObject({ type: "plan-shared", detail: "Amira Tan" });
  });
});

describe("bumpMetric", () => {
  it("increments a known metric and logs it", () => {
    const result = bumpMetric("detections", "job-loss");
    expect(result.detections).toBe(1);
    expect(getDemoLog()[0]).toMatchObject({ type: "detection", detail: "job-loss" });
  });

  it("is a no-op for an unknown metric name", () => {
    const before = getDemoMetrics();
    const result = bumpMetric("not-a-real-metric", "x");
    expect(result).toEqual(before);
  });
});

describe("resetSharedPlans", () => {
  it("clears plans and metrics, and logs a reset event", () => {
    sharePlan({ customerId: "cust-1" });
    bumpMetric("detections");
    resetSharedPlans();
    expect(listPlans()).toHaveLength(0);
    expect(getDemoMetrics()).toEqual({ detections: 0, briefsOpened: 0, plansShared: 0, meetingsBooked: 0, queuedPlans: 0 });
    expect(getDemoLog()[0]).toMatchObject({ type: "demo-reset" });
  });
});

describe("getDemoLog bound", () => {
  it("caps the log at 40 entries so demo memory never grows unbounded", () => {
    for (let i = 0; i < 50; i += 1) bumpMetric("detections", `event-${i}`);
    expect(getDemoLog().length).toBeLessThanOrEqual(40);
  });
});
