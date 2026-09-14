const MAX_PLANS = 200;
const plans = new Map();
const metrics = {
  detections: 0,
  briefsOpened: 0,
  plansShared: 0,
  meetingsBooked: 0,
};
const MAX_LOG = 40;
const log = [];

function pushLog(type, detail) {
  log.unshift({ type, detail: detail || "", at: new Date().toISOString() });
  if (log.length > MAX_LOG) log.length = MAX_LOG;
}

export function sharePlan(payload) {
  const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row = {
    id,
    customerId: payload.customerId,
    label: payload.label || payload.customerId,
    userIntent: String(payload.userIntent || "").trim(),
    goal: payload.goal || null,
    onTrack: Boolean(payload.onTrack),
    endingBalance: payload.endingBalance,
    receivedAt: new Date().toISOString(),
  };
  plans.set(id, row);
  if (plans.size > MAX_PLANS) plans.delete(plans.keys().next().value); // evict oldest, demo-only memory guard
  metrics.plansShared += 1;
  pushLog("plan-shared", row.label);
  return row;
}

export function listPlans() {
  return [...plans.values()].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function hasPlanFor(customerId) {
  return listPlans().some((row) => row.customerId === customerId);
}

export function resetSharedPlans() {
  plans.clear();
  metrics.detections = 0;
  metrics.briefsOpened = 0;
  metrics.plansShared = 0;
  metrics.meetingsBooked = 0;
  log.length = 0;
  pushLog("demo-reset", "Session state cleared");
}

const LOG_LABELS = {
  detections: "detection",
  briefsOpened: "brief-opened",
  plansShared: "plan-shared",
  meetingsBooked: "meeting-booked",
};

export function bumpMetric(name, detail) {
  if (name in metrics) {
    metrics[name] += 1;
    pushLog(LOG_LABELS[name] || name, detail);
  }
  return getDemoMetrics();
}

export function getDemoMetrics() {
  return { ...metrics, queuedPlans: plans.size };
}

export function getDemoLog() {
  return [...log];
}
