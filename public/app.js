import { getCustomerBook, PORTFOLIO_SIZE } from "./customer_book.js";

const state = {
  view: "today",
  scenarioId: "new-parent",
  scenario: null,
  projection: null,
  intelligence: null,
  selected: new Set(),
  sim: null,
  customerBook: getCustomerBook(),
  bookFilter: "all",
  bookQuery: "",
  scenariosList: [],
  twinCards: null,
  homePreviewId: "job-loss",
  futureBranch: "ignored",
  futureMessages: [],
  futureBusy: false,
  futureSessionId: `demo-${Date.now()}`,
  game: null,
  avatarProfile: { coins: 120, owned: [], equipped: [], colour: "sky" },
  futureCanvas: { events: [], filter: "all", connections: [] },
  goalCustomerId: "h-hp-01",
  goalPlan: null,
  goalTouched: false,
  lastIntentText: "",
  earnedAchievementIds: [],
};

const VIEW_META = {
  today: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / <span>TODAY</span>",
    title: "Good morning, Jamie.",
    subhead: "Three customers have high-intent life events worth reviewing today.",
  },
  client: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / <span>DIGITAL TWIN</span>",
    title: "Client twin outlook",
    subhead: "See how this life event changes the next 12 months — then prepare to engage.",
  },
  customers: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / <span>CUSTOMERS</span>",
    title: "Your customers",
    subhead: "148 relationships · filter to life events, then open the twin.",
  },
  future: {
    breadcrumb: "LIFELENS / <span>FUTURE YOU</span>",
    title: "Talk to your twin.",
    subhead: "Say what you’re becoming — then watch the same engine move the path.",
  },
  developer: {
    breadcrumb: "LIFELENS / <span>DEVELOPER</span>",
    title: "How this actually works.",
    subhead: "Holdout evaluation, live detector lab, and this session's activity log.",
  },
};

const VIEW_PATHS = {
  today: "/today",
  customers: "/customers",
  future: "/future",
  client: "/client",
  developer: "/developer",
};

const PATH_VIEWS = {
  "/": "today",
  "/today": "today",
  "/customers": "customers",
  "/future": "future",
  "/play-future": "future",
  "/client": "client",
  "/developer": "developer",
};

const money = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

function isLiveLlm(source) {
  return Boolean(source) && !/fallback|cached-demo|error|deterministic/i.test(String(source));
}

const customerDetails = {
  "new-parent": {
    initials: "AM",
    fullName: "Amira Malik",
    age: 34,
    occupation: "Product Director",
    tenure: "6y 4m",
    aum: "S$186,400",
    income: "S$6,200/mo",
    tier: "Priority",
    health: 76,
    context: "Growing family",
    phone: "+65 9123 8841",
    products: [
      { name: "Family Protection Plan", type: "PROTECTION", fit: 96, value: "S$2,400/yr", icon: "♢", color: "blue", why: "New dependant detected; current protection gap estimated at S$420K.", impact: "Protects 7 years of household income", action: 480 },
      { name: "SmartSaver Plus", type: "SAVINGS", fit: 91, value: "+2.8% p.a.", icon: "↗", color: "teal", why: "Recurring childcare costs create a need for a dedicated liquid buffer.", impact: "Builds a 4-month family buffer", action: 350 },
      { name: "Education Builder", type: "INVESTMENT", fit: 84, value: "From S$250/mo", icon: "◈", color: "gold", why: "Long time horizon and stable surplus suit a goal-based education plan.", impact: "Potential S$82K by age 18", action: 250 },
    ],
  },
  "job-loss": {
    initials: "DT",
    fullName: "Daniel Tan",
    age: 42,
    occupation: "Operations Lead",
    tenure: "9y 1m",
    aum: "S$312,800",
    income: "Income interrupted",
    tier: "Priority",
    health: 79,
    context: "Income transition",
    phone: "+65 9782 3306",
    products: [
      { name: "Payment Relief Programme", type: "SUPPORT", fit: 98, value: "3 months", icon: "⌁", color: "blue", why: "Salary interruption detected while fixed commitments remain elevated.", impact: "Extends cash runway by 3 months", action: 1200 },
      { name: "FlexiCash Reserve", type: "LIQUIDITY", fit: 89, value: "S$15K limit", icon: "↗", color: "teal", why: "Strong relationship history and short-term liquidity pressure.", impact: "Creates an emergency bridge", action: 420 },
      { name: "Career Transition Cover", type: "PROTECTION", fit: 78, value: "S$68/mo", icon: "♢", color: "gold", why: "Protection review is timely during employment transition.", impact: "Maintains essential coverage", action: 310 },
    ],
  },
  wedding: {
    initials: "PS",
    fullName: "Priya Shah",
    age: 31,
    occupation: "Legal Counsel",
    tenure: "4y 8m",
    aum: "S$228,600",
    income: "S$7,800/mo",
    tier: "Priority",
    health: 74,
    context: "Getting married",
    phone: "+65 9014 5572",
    products: [
      { name: "Premier Joint Account", type: "BANKING", fit: 97, value: "+1.5% bonus", icon: "∞", color: "blue", why: "Shared vendor payments and partner contributions signal joint money management.", impact: "One view of shared finances", action: 900 },
      { name: "Celebration Instalments", type: "CREDIT", fit: 90, value: "0% for 6 mo", icon: "↗", color: "teal", why: "Known wedding expenses cluster over the next five months.", impact: "Smooths peak vendor payments", action: 700 },
      { name: "Couples Wealth Plan", type: "INVESTMENT", fit: 83, value: "From S$500/mo", icon: "◈", color: "gold", why: "High combined surplus supports post-wedding goal planning.", impact: "Starts a shared wealth journey", action: 600 },
    ],
  },
  "h-hp-01": {
    initials: "WL",
    fullName: "Wei Lin Chen",
    age: 38,
    occupation: "Greenfield Engr",
    tenure: "—",
    aum: "—",
    income: "Ledger-derived",
    tier: "Priority",
    health: 72,
    context: "Home purchase / renovation",
    phone: "",
    products: [],
  },
  "h-none-01": {
    initials: "OS",
    fullName: "Omar Sim",
    age: 36,
    occupation: "Pebble Labs",
    tenure: "—",
    aum: "—",
    income: "Ledger-derived",
    tier: "Priority",
    health: 70,
    context: "No strong life-event",
    phone: "",
    products: [],
  },
};

/** Product icons — stroke-SVG, consistent with the sidebar nav icons. Unicode glyphs (♢ ↗ ◈ …)
 * used to vary per-persona by array index; this maps by product TYPE so every customer's
 * "PROTECTION" product looks the same regardless of which hero/holdout it belongs to. */
const PRODUCT_TYPE_ICON = {
  PROTECTION: '<path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z"/>',
  SAVINGS: '<path d="M4 15l5-5 4 4 7-7"/><path d="M15 6h6v6"/>',
  INVESTMENT: '<path d="M6 3h12l4 6-10 12L2 9l4-6z"/>',
  SUPPORT: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
  LIQUIDITY: '<path d="M12 3c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11z"/>',
  BANKING: '<path d="M3 21h18"/><path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-7M15 21v-7"/>',
  CREDIT: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>',
};
const SPARK_ICON_PATH = '<path d="M12 2l2.4 7.2L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.8L12 2z"/>';

function productIconSvg(type) {
  const inner = PRODUCT_TYPE_ICON[String(type || "").toUpperCase()];
  if (inner) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SPARK_ICON_PATH}</svg>`;
}

const $ = (selector) => document.querySelector(selector);
const nodes = {
  twinImpactStrip: $("#twinImpactStrip"),
  productList: $("#productList"),
  chart: $("#chart"),
  homeChart: $("#homeChart"),
};

init();

async function init() {
  const params = new URLSearchParams(window.location.search);
  const sharedScenario = params.get("scenario");
  const clientInvite = params.get("future") === "client";
  if (sharedScenario) {
    state.scenarioId = sharedScenario;
    state.goalCustomerId = sharedScenario;
  }
  const list = await fetchJson("/api/scenarios");
  state.scenariosList = list.scenarios;
  await Promise.all([loadTwinImpactStrip(), loadScenario(state.scenarioId), loadHoldoutEval()]);
  populateGoalCustomers();
  bindActions();
  if (clientInvite) {
    document.body.dataset.clientExperience = "true";
    setView("future", { history: "replace" });
  } else {
    setView(viewFromLocation() || "today", { history: "replace" });
  }
  renderFuturePicker();
  renderFutureSuggestions();
  renderFutureThread();
}

function normalizePath(pathname = window.location.pathname) {
  const cleaned = pathname.replace(/\/+$/, "");
  return cleaned || "/";
}

function viewFromLocation() {
  return PATH_VIEWS[normalizePath()] || null;
}

function pathForView(name) {
  return VIEW_PATHS[name] || VIEW_PATHS.today;
}

function syncUrl(name, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.pathname = pathForView(name);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) {
    history.replaceState({ view: name }, "", next);
    return;
  }
  if (replace) history.replaceState({ view: name }, "", next);
  else history.pushState({ view: name }, "", next);
}

function setView(name, { history: historyMode = "push" } = {}) {
  if (!VIEW_META[name] && name !== "client") name = "today";
  state.view = name;
  document.querySelectorAll(".app-view").forEach((panel) => {
    const active = panel.dataset.viewPanel === name;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  // Client is a drill-in from Today — keep Today highlighted in the nav
  const navView = name === "client" ? "today" : name;
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    const active = btn.dataset.view === navView;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  if (name === "client") {
    const d = customerDetails[state.scenarioId];
    $("#topBreadcrumb").innerHTML = VIEW_META.client.breadcrumb;
    $("#topTitle").textContent = d?.fullName || VIEW_META.client.title;
    $("#topSubhead").textContent = VIEW_META.client.subhead;
  } else {
    const meta = VIEW_META[name] || VIEW_META.today;
    $("#topBreadcrumb").innerHTML = meta.breadcrumb;
    $("#topTitle").textContent = meta.title;
    $("#topSubhead").textContent = meta.subhead;
  }

  if (historyMode === "push") syncUrl(name);
  else if (historyMode === "replace") syncUrl(name, { replace: true });

  if (name === "customers") openCustomerBook();
  if (name === "today" && state.twinCards) {
    renderPortfolioStrip(state.twinCards);
    renderTwinImpactStrip(state.twinCards);
    renderHomeOutlook(state.homePreviewId);
  }
  if (name === "future") {
    syncGoalCustomer(state.scenarioId);
    renderFuturePicker();
    renderFutureSuggestions();
    renderFutureThread();
    renderPlayFuture();
    refreshGoalPlan();
  }
  if (name === "developer") {
    loadDeveloperPanel();
  }
}

function syncGoalCustomer(id) {
  if (!id) return;
  const sel = $("#goalCustomer");
  if (sel && [...sel.options].some((o) => o.value === id)) sel.value = id;
  state.goalCustomerId = $("#goalCustomer")?.value || id;
}

function activeTwinId() {
  return state.goalCustomerId || state.scenarioId;
}

function activeTwinDetails() {
  return customerDetails[activeTwinId()] || customerDetails[state.scenarioId] || { fullName: "You", initials: "FY" };
}

function activeTwinFirstName() {
  return String(activeTwinDetails().fullName || "You").split(" ")[0];
}

function populateGoalCustomers() {
  const sel = $("#goalCustomer");
  if (!sel) return;
  const seen = new Set();
  const rows = [];
  const add = (id, name, extra) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    rows.push(`<option value="${escapeHtml(id)}">${escapeHtml(name)}${extra ? ` · ${escapeHtml(extra)}` : ""}</option>`);
  };
  for (const c of state.customerBook) {
    if (c.scenarioId) add(c.scenarioId, c.fullName, c.eventLabel);
  }
  add("h-none-01", "Omar Sim", "holdout none");
  add("h-rt-01", "Ethan Teo", "holdout retirement");
  sel.innerHTML = rows.join("");
  if (state.goalCustomerId && seen.has(state.goalCustomerId)) sel.value = state.goalCustomerId;
  else if (state.scenarioId && seen.has(state.scenarioId)) sel.value = state.scenarioId;
  state.goalCustomerId = sel.value || state.goalCustomerId;
}

async function openClient(scenarioId) {
  await loadScenario(scenarioId);
  setView("client");
}

async function loadScenario(id) {
  state.scenarioId = id;
  $("#aiSource").innerHTML = "<i></i> ANALYSING";
  setTimelineStep(2);
  const intelligence = await fetchJson(`/api/intelligence/${id}`);
  ensureClientDetails(id, intelligence);
  try {
    const payload = await fetchJson(`/api/scenarios/${id}`);
    state.scenario = payload.scenario;
    state.projection = payload.projection;
  } catch {
    const plan = await postJson(`/api/customers/${id}/goal-plan`, {});
    state.scenario = {
      id,
      title: intelligence.event.label,
      customer: intelligence.persona?.fullName || id,
      event: intelligence.event,
      suggestedQuestions: ["What should I watch out for next month?", "How different are the two futures?"],
    };
    state.projection = { ignored: plan.ignored, accepted: plan.modeled, delta: plan.delta };
  }
  state.selected = new Set(intelligence.products?.length ? [0] : []);
  state.intelligence = intelligence;
  try {
    state.c360 = await fetchJson(`/api/customers/${id}/360`);
  } catch {
    state.c360 = null;
  }
  hydrateCustomerDetails();
  checkTwinEngagement(id);
  $("#aiSource").innerHTML = `<i></i> ${isLiveLlm(intelligence.source) ? `${String(intelligence.source).toUpperCase()} · LIVE` : "VERIFIED FALLBACK"}`;
  document.querySelectorAll(".triage-card").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
  renderProfile();
  renderProducts();
  await renderSimulation();
  setTimelineStep(3);
  if (state.view === "client") {
    const d = customerDetails[id];
    $("#topTitle").textContent = d?.fullName || VIEW_META.client.title;
  }
  if (state.view === "future") {
    state.futureMessages = [];
    state.game = null;
    renderFuturePicker();
    renderFutureSuggestions();
    renderFutureThread();
    renderPlayFuture();
  }
}

async function checkTwinEngagement(id) {
  const banner = $("#twinEmptyState");
  if (!banner) return;
  try {
    const { plans } = await fetchJson("/api/plans");
    const engaged = (plans || []).some((row) => row.customerId === id);
    banner.hidden = engaged;
    if (!engaged) {
      const name = customerDetails[id]?.fullName?.split(" ")[0] || "This customer";
      $("#twinEmptyTitle").textContent = `${name} hasn't explored their own Future You yet.`;
    }
  } catch {
    banner.hidden = true;
  }
}

function ensureClientDetails(id, intel) {
  if (customerDetails[id]) return;
  const p = intel.persona || {};
  const name = p.fullName || id;
  customerDetails[id] = {
    initials: (p.initials || name.replace(/[^A-Za-z]/g, "").slice(0, 2) || "XX").toUpperCase(),
    fullName: name,
    age: p.age || "—",
    occupation: p.occupation || p.employer || "Holdout customer",
    tenure: "—",
    aum: "—",
    income: "Ledger-derived",
    tier: p.segment || "Priority",
    health: 70,
    context: intel.event?.label || id,
    phone: p.phone || "",
    products: [],
  };
}

function hydrateCustomerDetails() {
  const i = state.intelligence;
  const p = i.persona || {};
  ensureClientDetails(state.scenarioId, i);
  const d = customerDetails[state.scenarioId];
  Object.assign(d, {
    initials: p.initials || d.initials,
    fullName: p.fullName || d.fullName,
    age: p.age || d.age,
    occupation: p.occupation || d.occupation,
    tenure: p.tenureMonths != null ? `${Math.floor(p.tenureMonths / 12)}y ${p.tenureMonths % 12}m` : d.tenure,
    aum: p.totalAssets ? money.format(p.totalAssets) : d.aum,
    income: p.monthlyIncome ? `${money.format(p.monthlyIncome)}/mo` : d.income,
    tier: p.segment || d.tier,
    health: p.tenureMonths != null ? Math.round(70 + Math.min(25, p.tenureMonths / 12)) : d.health,
    context: p.goals?.[0] || i.event?.label || d.context,
    phone: p.phone || d.phone,
    products: (i.products || []).map((x, index) => ({
      name: x.name,
      type: x.type,
      fit: x.fit,
      value: x.annualValue ? `${money.format(x.annualValue)}/yr` : "No fee",
      icon: ["♢", "↗", "◈"][index] || "✦",
      color: ["blue", "teal", "gold"][index] || "blue",
      why: i.ai?.productNarratives?.[x.name] || x.reason,
      impact: x.impact,
      action: Number(x.monthlyImpact) || 0,
      guardrails: x.guardrails,
    })),
  });
}

function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function telHref(phone) {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : "#";
}

function whatsappHref(phone) {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : "#";
}

function renderContactActions(d) {
  const call = $("#callCustomer");
  const wa = $("#whatsappCustomer");
  const phoneEl = $("#customerPhone");
  const phone = d?.phone;
  const hasPhone = Boolean(phoneDigits(phone));

  if (call) {
    call.hidden = !hasPhone;
    call.href = telHref(phone);
    call.setAttribute("aria-label", hasPhone ? `Call ${d.fullName} at ${phone}` : "Call unavailable");
  }
  if (wa) {
    wa.hidden = !hasPhone;
    wa.href = whatsappHref(phone);
    wa.setAttribute("aria-label", hasPhone ? `WhatsApp ${d.fullName}` : "WhatsApp unavailable");
  }
  if (phoneEl) {
    phoneEl.hidden = !hasPhone;
    phoneEl.textContent = phone || "";
  }
}

function renderProfile() {
  const d = customerDetails[state.scenarioId];
  const s = state.scenario;
  $("#profileInitials").textContent = d.initials;
  $("#customerName").textContent = d.fullName;
  $("#customerMeta").textContent = `${d.age} years · ${d.occupation}`;
  $(".tier").textContent = d.tier.toUpperCase();
  renderContactActions(d);
  $("#profileGrid").innerHTML = [
    ["TOTAL RELATIONSHIP", d.tenure],
    ["ASSETS WITH US", d.aum],
    ["MONTHLY INCOME", d.income],
    ["MOBILE", d.phone || "—"],
    ["LIFE STAGE", d.context],
  ]
    .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
    .join("");
  $("#eventTitle").textContent = s.event.label;
  const onset = s.event.detectedMonth || state.intelligence.event.detectedMonth || "the latest statement window";
  $("#eventMeta").textContent = `Detected in ${onset} · High relevance to financial health`;
  $("#confidence").textContent = `${Math.round(state.intelligence.event.confidence * 100)}%`;
  renderDetectedChanges();
  renderClient360();
  $("#signalTrace").innerHTML = state.intelligence.event.evidence
    .slice(0, 2)
    .map(
      (e) =>
        `<div><i></i><span><b>${escapeHtml(e.label)}:</b> ${escapeHtml(e.value)}</span></div>`
    )
    .join("");
  const lede = $("#twinLede");
  if (lede) {
    lede.textContent = `If ${s.event.label.toLowerCase()} is left unmanaged, the twin shows where stress appears — and how support changes the path.`;
  }
  updateWellbeingScore(d.health, d.health);
}

function renderDetectedChanges() {
  const el = $("#detectedChanges");
  if (!el || !state.intelligence) return;
  const evidence = state.intelligence.event?.evidence || [];
  const kindFor = (source) => {
    if (/income|payroll/i.test(source || "")) return "income";
    if (/cashflow|transfer/i.test(source || "")) return "savings";
    return "spend";
  };
  const changes = evidence.slice(0, 3).map((row) => ({
    kind: kindFor(row.source),
    label: row.label,
    detail: row.value,
    confidence: row.confidence,
  }));
  if (!changes.length) {
    el.innerHTML = `<p class="book-empty">No strong behavioural change in this window.</p>`;
    return;
  }
  el.innerHTML = changes
    .map(
      (c) =>
        `<div class="detected-chip kind-${c.kind}"><em>${Math.round((c.confidence || 0) * 100)}%</em><span class="detected-kind">${c.kind}</span><strong>${escapeHtml(c.label)}</strong><small>${escapeHtml(c.detail)}</small></div>`
    )
    .join("");
}

function renderClient360() {
  const el = $("#client360");
  if (!el) return;
  const rec = state.c360;
  if (!rec) {
    el.innerHTML = "";
    return;
  }
  const cover = (rec.holdings || [])
    .filter((h) => h.category === "insurance" && h.status === "active")
    .reduce((n, h) => n + (h.sumAssuredOrAUM || 0), 0);
  const tags = rec.derived?.lifestyleTags?.join(", ") || "—";
  el.innerHTML = `<div><span>IDENTITY</span><strong>${escapeHtml(rec.identity?.idMasked || "—")}</strong><small>synthetic · not an NRIC</small></div><div><span>INSURANCE IN FORCE</span><strong>${cover ? money.format(cover) : "—"}</strong><small>${(rec.holdings || []).length} holdings</small></div><div><span>BUREAU (SYNTHETIC)</span><strong>${rec.credit?.scoreBand || "—"} · ${rec.credit?.bureauScore || "—"}</strong><small>not derived from the ledger</small></div><div><span>SPEND MIX</span><strong>${escapeHtml(tags)}</strong><small>${escapeHtml(rec.derived?.benchmarkSource || "")}</small></div>`;
}

function renderProducts() {
  const products = customerDetails[state.scenarioId].products;
  nodes.productList.innerHTML = products
    .map((p, i) => {
      const why = p.why || p.impact || "Fits the customer's current life-event context.";
      return `<button class="product ${state.selected.has(i) ? "selected" : ""}" data-index="${i}" type="button"><span class="check">✓</span><span class="product-icon ${p.color}">${productIconSvg(p.type)}</span><span class="product-copy"><small class="product-type">${p.type}</small><strong>${escapeHtml(p.name)}</strong><span class="impact">${escapeHtml(p.impact)}</span><span class="why"><b>Why this fits</b>${escapeHtml(why)}</span></span><span class="product-meta"><b>${p.fit}%</b><strong>${escapeHtml(p.value)}</strong></span></button>`;
    })
    .join("");
  nodes.productList.querySelectorAll(".product").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const i = Number(btn.dataset.index);
      if (state.selected.has(i)) state.selected.delete(i);
      else state.selected.add(i);
      renderProducts();
      setTimelineStep(3);
      await renderSimulation();
    })
  );
}

async function renderSimulation() {
  const products = customerDetails[state.scenarioId]?.products || [];
  const chosen = [...state.selected]
    .map((i) => products[i])
    .filter(Boolean)
    .map((p) => ({
      name: p.name,
      label: p.name,
      monthlyImpact: Number(p.action) || 0,
      startsMonth: 1,
    }));

  let payload;
  try {
    payload = await fetchJson("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: state.scenarioId, actions: chosen }),
    });
  } catch {
    const ignored = state.projection.ignored;
    const modeled = state.projection.accepted || state.projection.modeled;
    payload = { ignored, modeled, delta: state.projection.delta || { endingBalance: (modeled?.endingBalance || 0) - ignored.endingBalance } };
  }

  const base = payload.ignored.trajectory.map((p) => p.projectedBalance);
  const modeled = payload.modeled.trajectory.map((p) => p.projectedBalance);
  const delta = Number.isFinite(payload.delta.endingBalance) ? payload.delta.endingBalance : 0;
  const baseEnding = base.at(-1) || 0;
  const pct =
    chosen.length === 0
      ? 0
      : Math.round(Math.min(99, Math.abs(delta) / (Math.abs(baseEnding) || 1000) * 100));

  const low = Math.min(...modeled);
  const baseLow = Math.min(...base);
  const lowDelta = low - baseLow;
  const riskElevated = modeled.some((v) => v < 0);
  const riskAvoided = Boolean(payload.ignored.overdraftMonth && !payload.modeled.overdraftMonth);
  const riskLabel = riskElevated ? "Elevated" : riskAvoided || chosen.length ? "Protected" : "Watch";

  state.sim = {
    delta,
    pct,
    low,
    lowDelta,
    riskLabel,
    riskAvoided,
    baseEnding,
    modeledEnding: modeled.at(-1),
    chosen,
    overdraftMonth: payload.modeled.overdraftMonth,
    baseOverdraftMonth: payload.ignored.overdraftMonth,
  };

  $("#deltaEnding").textContent = money.format(delta);
  $("#deltaEnding").classList.toggle("is-zero", delta === 0);
  $("#upliftPercent").textContent = `+${pct}%`;
  $("#upliftRing").style.setProperty("--progress", `${Math.max(12, pct * 3.6)}deg`);
  $("#lowestBalance").textContent = money.format(low);
  $("#lowestDelta").textContent =
    lowDelta === 0 ? "Same as current path" : `↑ ${money.format(lowDelta)} vs current path`;
  $("#riskAvoided").textContent = riskLabel;
  $("#riskAvoided").classList.toggle("risk-elevated", riskElevated);

  renderChart(base, modeled, payload);
  updateProjectedWellbeing(delta, riskAvoided, chosen);
}

function renderChart(base, modeled, payload, target = nodes.chart, fillId = "fill") {
  if (!target) return;
  const max = Math.max(...modeled, ...base);
  const min = Math.min(...modeled, ...base, 0);
  const range = max - min || 1;
  const dipIndex = payload.ignored.overdraftMonth
    ? payload.ignored.overdraftMonth - 1
    : base.indexOf(Math.min(...base));
  const protectedNow = !payload.modeled.overdraftMonth && Boolean(payload.ignored.overdraftMonth);

  const callout =
    dipIndex >= 0
      ? `<g class="chart-callout"><circle cx="${x(dipIndex)}" cy="${y(base[dipIndex], min, range)}" r="5" class="${protectedNow ? "safe" : "warn"}"/><text x="${x(dipIndex)}" y="${Math.max(14, y(base[dipIndex], min, range) - 10)}" text-anchor="middle">${protectedNow ? "Risk avoided" : "Risk window"}</text></g>`
      : "";

  target.innerHTML = `<svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="12 month liquidity projection"><defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-brand-blue)" stop-opacity=".22"/><stop offset="1" stop-color="var(--sc-brand-blue)" stop-opacity="0"/></linearGradient></defs><path class="area chart-animate" style="fill:url(#${fillId})" d="${areaPath(modeled, min, range)}"/><path class="line base chart-animate" d="${linePath(base, min, range)}"/><path class="line solution chart-animate" d="${linePath(modeled, min, range)}"/>${modeled.map((v, i) => `<circle class="chart-animate" cx="${x(i)}" cy="${y(v, min, range)}" r="3"/>`).join("")}${callout}</svg><div class="chart-labels">${["NOW", "M3", "M6", "M9", "M12"].map((v) => `<span>${v}</span>`).join("")}</div>`;
}

function updateWellbeingScore(base, projected) {
  const scoreEl = $("#healthScore");
  const projectedEl = $("#projectedHealth");
  const noteEl = $("#healthNote");
  const deltaEl = $("#healthDelta");
  const panel = $("#wellbeingPanel");
  const lifted = projected > base;

  if (scoreEl) scoreEl.textContent = String(base);
  if (projectedEl) {
    projectedEl.textContent = lifted ? `→ ${projected}` : "";
    projectedEl.hidden = !lifted;
  }
  const bar = $("#healthBar");
  if (bar) bar.style.width = `${projected}%`;

  if (deltaEl) {
    deltaEl.textContent = lifted ? `+${projected - base} pts` : "";
    deltaEl.hidden = !lifted;
  }
  if (panel) panel.classList.toggle("is-lifted", lifted);

  if (noteEl) {
    noteEl.textContent = lifted
      ? `Projected financial health after recommended actions · +${projected - base} pts`
      : "Select recommended support to see how wellbeing improves";
  }
}

function updateProjectedWellbeing(delta, riskAvoided, chosen) {
  const d = customerDetails[state.scenarioId];
  const base = d.health;
  if (!chosen.length) {
    updateWellbeingScore(base, base);
    return;
  }
  const liquidityBoost = Math.min(12, Math.round(Math.abs(delta) / 2500));
  const fitBoost = Math.min(6, Math.round(chosen.reduce((s, p) => s + (customerDetails[state.scenarioId].products.find((x) => x.name === p.name)?.fit || 0), 0) / chosen.length / 20));
  const riskBoost = riskAvoided ? 5 : 0;
  const projected = Math.min(98, base + liquidityBoost + fitBoost + riskBoost);
  updateWellbeingScore(base, projected);
  state.sim.projectedHealth = projected;
  state.sim.baseHealth = base;
}

function setTimelineStep(active) {
  document.querySelectorAll(".journey-step").forEach((step) => {
    const n = Number(step.dataset.step);
    step.classList.toggle("active", n === active);
    step.classList.toggle("done", n < active);
  });
}

const x = (i) => 10 + i * (580 / 11);
const y = (v, min, range) => 205 - ((v - min) / range) * 180;
function linePath(values, min, range) {
  return values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v, min, range)}`).join(" ");
}
function areaPath(values, min, range) {
  return `${linePath(values, min, range)} L${x(11)},215 L${x(0)},215 Z`;
}

async function loadHoldoutEval() {
  const precisionEl = $("#holdoutPrecision");
  if (!precisionEl) return;
  try {
    const report = await fetchJson("/api/eval/holdout-detection");
    precisionEl.textContent = `${Math.round(report.precision * 100)}%`;
    $("#holdoutRecall").textContent = `${Math.round(report.recall * 100)}%`;
    $("#holdoutSize").textContent = String(report.size);
    $("#holdoutEvalHeadline").textContent = `${Math.round(report.precision * 100)}% precision on unseen ledgers.`;
    $("#holdoutEvalNote").textContent = `${report.size} labelled customers · ${Math.round(report.accuracy * 100)}% accuracy · scorer never sees ground truth`;
  } catch {
    $("#holdoutEvalNote").textContent = "Holdout eval unavailable";
  }
}

async function loadDeveloperPanel() {
  await Promise.all([loadSystemStatus(), loadSessionLog(), loadDemoMetrics()]);
}

async function loadSystemStatus() {
  const el = $("#systemStatus");
  if (!el) return;
  try {
    const health = await fetchJson("/api/health");
    const rows = [
      ["AI CONNECTED", health.aiConnected ? "Live" : "Fallback", health.aiConnected],
      ["DETECTION LLM", health.detectLlmOn ? "On" : "Off", health.detectLlmOn],
      ["PROVIDER", health.provider || "—", health.aiConnected],
      ["MODEL", health.model || "—", health.aiConnected],
    ];
    el.innerHTML = rows
      .map(([label, value, live]) => `<div><span>${escapeHtml(label)}</span><strong class="${live ? "status-live" : "status-off"}">${escapeHtml(value)}</strong></div>`)
      .join("");
  } catch {
    el.innerHTML = `<p class="lab-empty">Status unavailable</p>`;
  }
}

async function loadSessionLog() {
  const el = $("#sessionLog");
  if (!el) return;
  try {
    const { log } = await fetchJson("/api/demo/log");
    el.innerHTML = log.length
      ? log
          .map(
            (row) =>
              `<div class="log-row"><span><b>${escapeHtml(row.type)}</b> ${escapeHtml(row.detail || "")}</span><small>${new Date(row.at).toLocaleTimeString()}</small></div>`
          )
          .join("")
      : `<p class="lab-empty">No activity yet this process.</p>`;
  } catch {
    el.innerHTML = `<p class="lab-empty">Log unavailable</p>`;
  }
}

const WEDDING_ADHOC_SAMPLE = {
  transactions: [
    { postDate: "2026-02-04", merchantRaw: "THE ST. REGIS WEDDING", amount: -3800 },
    { postDate: "2026-02-11", merchantRaw: "GIOIELLI BRIDAL", amount: -1420 },
    { postDate: "2026-02-18", merchantRaw: "THE WEDDING NICHE", amount: -640 },
    { postDate: "2026-02-15", merchantRaw: "FAST TFR FROM R. ONG", amount: 700 },
    { postDate: "2026-03-15", merchantRaw: "PAYNOW TFR FROM R. ONG", amount: 700 },
    { postDate: "2026-02-25", merchantRaw: "HARBOR LAW LLP GIRO SALARY", amount: 6900 },
  ],
};

function parseAdhocPaste(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Paste a JSON ledger or CSV first.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? { transactions: parsed } : parsed;
  }
  return { csv: trimmed };
}

function evidenceMini(event) {
  if (!event?.evidence?.length) return "";
  return `<div class="evidence-mini">${event.evidence
    .map((row) => {
      const pct = Math.max(0, Math.min(100, Math.round((row.scoreWeight || 0) * 100)));
      return `<div><span class="row-top"><span><b>+${pct} pts</b> ${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></span><div class="weight-track"><i style="width:${pct}%"></i></div></div>`;
    })
    .join("")}</div>`;
}

function renderAdhocResult(result) {
  const el = $("#adhocResult");
  if (!el) return;
  if (result.empty) {
    el.innerHTML = `<p class="lab-empty">${escapeHtml(result.message || "No strong signal in this data")}</p>`;
    return;
  }
  const primary = result.primary;
  el.innerHTML = `<div class="lab-hit"><h3>${escapeHtml(primary.label)}</h3><small>${Math.round(primary.confidence * 100)}% · ${result.rowCount} classified rows · not persisted</small>${evidenceMini(primary)}</div>`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function runAdhocFromUi() {
  const el = $("#adhocResult");
  try {
    const result = await postJson("/api/detect/adhoc", parseAdhocPaste($("#adhocInput")?.value));
    renderAdhocResult(result);
  } catch (error) {
    if (el) el.innerHTML = `<p class="lab-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function runCompareFromUi() {
  const el = $("#compareResult");
  const id = $("#compareId")?.value || "h-hp-01";
  try {
    const result = await fetchJson(`/api/detect/legacy-vs-generalized/${id}`);
    el.innerHTML = `<div class="compare-cols"><article class="compare-col"><span>LEGACY</span><strong>${escapeHtml(result.legacy.label)}</strong><small>${Math.round(result.legacy.confidence * 100)}%</small>${evidenceMini(result.legacy)}</article><article class="compare-col"><span>GENERALIZED</span><strong>${escapeHtml(result.generalized.label)}</strong><small>${Math.round(result.generalized.confidence * 100)}%</small>${evidenceMini(result.generalized)}</article></div>`;
  } catch (error) {
    if (el) el.innerHTML = `<p class="lab-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function resetDemoState() {
  const result = await postJson("/api/demo/reset", {});
  state.avatarProfile = { ...(result.avatarProfile || { coins: 120, owned: [], equipped: [], colour: "sky" }) };
  state.futureMessages = [];
  state.futureSessionId = `demo-${Date.now()}`;
  state.game = null;
  state.goalPlan = null;
  state.goalTouched = false;
  state.earnedAchievementIds = [];
  applyAvatarProfile();
  if ($("#avatarCoins")) $("#avatarCoins").textContent = state.avatarProfile.coins;
  if ($("#studioCoins")) $("#studioCoins").textContent = state.avatarProfile.coins;
  renderFutureThread();
  showToast("Demo state reset");
}

let goalTimer = 0;
function scheduleGoalPlan() {
  window.clearTimeout(goalTimer);
  goalTimer = window.setTimeout(refreshGoalPlan, 120);
}

function readGoalForm() {
  return {
    type: $("#goalType")?.value || "savings",
    targetAmount: Number($("#goalAmount")?.value || 0),
    targetDate: $("#goalDate")?.value,
  };
}

function fillGoalForm(goal) {
  if (!goal) return;
  const allowed = ["emergency", "home", "wedding", "savings"];
  if ($("#goalType")) $("#goalType").value = allowed.includes(goal.type) ? goal.type : "savings";
  if ($("#goalAmount")) $("#goalAmount").value = goal.targetAmount;
  if ($("#goalDate")) $("#goalDate").value = goal.targetDate;
}

function renderGoalChart(base, modeled) {
  const target = $("#goalChart");
  if (!target || !base?.length || !modeled?.length) return;
  const n = Math.max(base.length, modeled.length, 2);
  const xs = (i) => 10 + i * (580 / Math.max(1, n - 1));
  const ys = (v, min, range) => 205 - ((v - min) / range) * 180;
  const max = Math.max(...modeled, ...base);
  const min = Math.min(...modeled, ...base, 0);
  const range = max - min || 1;
  const line = (values) => values.map((v, i) => `${i ? "L" : "M"}${xs(i)},${ys(v, min, range)}`).join(" ");
  const area = `${line(modeled)} L${xs(modeled.length - 1)},215 L${xs(0)},215 Z`;
  target.innerHTML = `<svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Goal trajectory"><defs><linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-brand-blue)" stop-opacity=".22"/><stop offset="1" stop-color="var(--sc-brand-blue)" stop-opacity="0"/></linearGradient></defs><path class="area" style="fill:url(#goalFill)" d="${area}"/><path class="line base" d="${line(base)}"/><path class="line solution" d="${line(modeled)}"/></svg>`;
}

function renderMood(mood, target = "#goalMood") {
  const el = $(target);
  if (!el || !mood) return;
  el.className = `goal-mood mood-${mood.key}`;
  el.innerHTML = `<span>${mood.key === "calm" ? "🙂" : mood.key === "stressed" ? "😟" : "😐"}</span><span>${escapeHtml(mood.label)} — ${escapeHtml(mood.detail)}</span>`;
}

function renderGoalPlan(plan) {
  if (!plan) return;
  $("#goalStats").innerHTML = `<div><span>REQUIRED / MO</span><strong>${money.format(plan.requiredMonthly)}</strong></div><div><span>MODELED NET</span><strong>${money.format(plan.monthlyNet)}</strong></div><div><span>ENDING CASH</span><strong>${money.format(plan.modeled.endingBalance)}</strong></div><div><span>STATUS</span><strong>${plan.onTrack ? "On track" : "Short"}</strong></div>`;
  renderMood(plan.mood);
  if ($("#goalLumpSumLabel")) $("#goalLumpSumLabel").textContent = plan.lumpSumLabel || "One-off lump sum";
  if ($("#goalCopy")) $("#goalCopy").textContent = plan.copy;
  if ($("#goalCopySource")) $("#goalCopySource").textContent = plan.copySource === "deterministic" || !plan.copySource ? "" : `Narration: ${plan.copySource}`;
  renderGoalChart(
    plan.ignored.trajectory.map((p) => p.projectedBalance),
    plan.modeled.trajectory.map((p) => p.projectedBalance)
  );
  $("#goalAchievements").innerHTML = plan.achievements
    .map((row) => `<div class="${row.earned ? "earned" : ""}"><b>${row.earned ? "✓" : "○"}</b><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.detail)}</small></div>`)
    .join("");
}

function awardGoalAchievements(plan) {
  let gained = 0;
  for (const row of plan.achievements) {
    if (row.earned && !state.earnedAchievementIds.includes(row.id)) {
      state.earnedAchievementIds.push(row.id);
      gained += 40;
    }
  }
  if (!gained) return;
  state.avatarProfile.coins += gained;
  if ($("#avatarCoins")) $("#avatarCoins").textContent = state.avatarProfile.coins;
  showToast(`+${gained} coins · projection milestone`);
}

async function refreshGoalPlan() {
  if (!$("#goalCustomer")) return;
  const id = $("#goalCustomer").value || state.goalCustomerId;
  state.goalCustomerId = id;
  const levers = {
    spendCutPct: Number($("#goalCut")?.value || 0),
    extraMonthly: Number($("#goalExtra")?.value || 0),
    lumpSum: Number($("#goalLumpSum")?.value || 0),
  };
  if ($("#goalCutLabel")) $("#goalCutLabel").textContent = `${levers.spendCutPct}%`;
  if ($("#goalExtraLabel")) $("#goalExtraLabel").textContent = money.format(levers.extraMonthly);
  if ($("#goalLumpSumValue")) $("#goalLumpSumValue").textContent = money.format(levers.lumpSum);
  try {
    const plan = await postJson(`/api/customers/${id}/goal-plan`, state.goalTouched ? { goal: readGoalForm(), levers } : { levers });
    state.goalPlan = plan;
    if (!state.goalTouched) fillGoalForm(plan.goal);
    renderGoalPlan(plan);
    if (state.goalTouched) awardGoalAchievements(plan);
  } catch (error) {
    if ($("#goalCopy")) $("#goalCopy").textContent = error.message;
  }
}

async function loadHandoffQueue() {
  const el = $("#handoffQueue");
  if (!el) return;
  try {
    const payload = await fetchJson("/api/plans");
    const plans = payload.plans || [];
    el.innerHTML = plans.length
      ? plans.slice(0, 4).map((row) => `<div class="handoff-row"><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.customerId)} · ${row.onTrack ? "on track" : "short"}${row.userIntent ? ` · “${escapeHtml(String(row.userIntent).slice(0, 48))}”` : ""}</small></div>`).join("")
      : `<p class="lab-empty">No consented shares yet. Customer Goal Plan → Share with RM.</p>`;
  } catch {
    el.innerHTML = "";
  }
}

async function loadDemoMetrics() {
  try {
    const metrics = await fetchJson("/api/demo/metrics");
    if ($("#queuedHandoffs")) $("#queuedHandoffs").textContent = String(metrics.queuedPlans ?? 0);
    if ($("#demoShareCount")) $("#demoShareCount").textContent = String(metrics.plansShared || 0);
  } catch {
    /* ignore */
  }
}

async function submitLifeIntent(text) {
  const id = $("#goalCustomer")?.value || state.goalCustomerId;
  const levers = {
    spendCutPct: Number($("#goalCut")?.value || 0),
    extraMonthly: Number($("#goalExtra")?.value || 0),
    lumpSum: Number($("#goalLumpSum")?.value || 0),
  };
  const payload = await postJson(`/api/customers/${id}/intent`, { text, levers });
  state.lastIntentText = text;
  state.goalTouched = true;
  state.goalCustomerId = id;
  fillGoalForm(payload.goal);
  state.goalPlan = payload.plan;
  renderGoalPlan(payload.plan);
  if ($("#intentNote")) {
    $("#intentNote").textContent = `${payload.intent.source}: ${payload.intent.eventHint} · ${payload.goal.type} ${money.format(payload.goal.targetAmount)} by ${payload.goal.targetDate}`;
  }
  return payload;
}

function looksLikeIntent(q) {
  return /\b(i am going|i['’]m going|i want to|i will be|going to be|becoming|save .+ for|buy a (house|home))\b/i.test(q);
}

function moodClass(mood) {
  return mood?.key === "stressed" ? "is-stressed" : "";
}

function renderLeverSuggestions(result) {
  const el = $("#leverSuggestions");
  if (!el) return;
  if (!result?.candidates?.length) {
    el.innerHTML = `<p class="lab-empty">No alternative levers to suggest right now.</p>`;
    return;
  }
  el.innerHTML = result.candidates
    .map(
      (c, i) =>
        `<div class="lever-candidate ${moodClass(c.mood)}"><strong>${escapeHtml(c.label)}</strong><small>${escapeHtml(c.why || "")}</small><div class="candidate-foot"><em>${c.onTrack ? "On track" : "Short"} · ${money.format(c.endingBalance)} ending</em><button type="button" data-index="${i}">Apply</button></div></div>`
    )
    .join("");
  el.querySelectorAll("button[data-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const candidate = result.candidates[Number(btn.dataset.index)];
      if (!candidate) return;
      applyLeverCandidate(candidate.levers);
    });
  });
  if ($("#leverSuggestSource")) {
    $("#leverSuggestSource").textContent = /deterministic/.test(result.source) ? "" : `Suggested by ${result.source}`;
  }
}

function applyLeverCandidate(levers) {
  if ($("#goalCut")) $("#goalCut").value = levers.spendCutPct;
  if ($("#goalExtra")) $("#goalExtra").value = levers.extraMonthly;
  if ($("#goalLumpSum")) $("#goalLumpSum").value = levers.lumpSum;
  state.goalTouched = true;
  refreshGoalPlan();
  showToast("Levers applied");
}

async function suggestLeversFromUi() {
  const id = $("#goalCustomer")?.value || state.goalCustomerId;
  const el = $("#leverSuggestions");
  if (el) el.innerHTML = `<p class="lab-empty">Thinking…</p>`;
  try {
    const goal = state.goalTouched ? readGoalForm() : undefined;
    const levers = {
      spendCutPct: Number($("#goalCut")?.value || 0),
      extraMonthly: Number($("#goalExtra")?.value || 0),
      lumpSum: Number($("#goalLumpSum")?.value || 0),
    };
    const result = await postJson(`/api/customers/${id}/lever-suggest`, { goal, levers });
    renderLeverSuggestions(result);
  } catch (error) {
    if (el) el.innerHTML = `<p class="lab-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function shareGoalPlan() {
  if (!state.goalPlan) await refreshGoalPlan();
  const plan = state.goalPlan;
  if (!plan) return;
  const intent = String(state.lastIntentText || "").trim();
  const baseLabel = plan.cashflow?.label || state.goalCustomerId;
  await postJson("/api/plans", {
    customerId: state.goalCustomerId,
    label: intent ? `${baseLabel} · ${intent.slice(0, 80)}` : baseLabel,
    userIntent: intent,
    goal: plan.goal,
    onTrack: plan.onTrack,
    endingBalance: plan.modeled.endingBalance,
  });
  showToast("Plan queued for Jamie");
  loadHandoffQueue();
  loadDemoMetrics();
}

async function loadTwinImpactStrip() {
  const strip = nodes.twinImpactStrip;
  if (!strip) return;
  if (state.twinCards) {
    renderPortfolioStrip(state.twinCards);
    renderTwinImpactStrip(state.twinCards);
    renderHomeOutlook(state.homePreviewId);
    loadHandoffQueue();
    loadDemoMetrics();
    return;
  }
  strip.innerHTML = `<p class="book-empty">Loading twin projections…</p>`;
  try {
    const triage = await fetchJson("/api/today-triage");
    const cards = await Promise.all(
      (triage.rows || []).map(async (row) => {
        const id = row.id;
        let scenario;
        let projection;
        try {
          const payload = await fetchJson(`/api/scenarios/${id}`);
          scenario = payload.scenario;
          projection = payload.projection;
        } catch {
          const plan = await postJson(`/api/customers/${id}/goal-plan`, {});
          scenario = { id, event: row.event };
          projection = { ignored: plan.ignored, accepted: plan.modeled, delta: plan.delta };
        }
        return {
          id,
          score: row.score,
          eligibleValue: row.eligibleValue,
          scenario,
          projection,
          details: customerDetails[id] || {
            initials: String(row.persona?.fullName || id).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "XX",
            fullName: row.persona?.fullName || id,
          },
        };
      })
    );
    state.twinCards = cards;
    state.homePreviewId = cards[0]?.id || state.scenarioId;
    renderMomentumSpark();
    renderPortfolioStrip(cards);
    renderTwinImpactStrip(cards);
    renderHomeOutlook(state.homePreviewId);
    loadHandoffQueue();
    loadDemoMetrics();
  } catch (error) {
    strip.innerHTML = `<p class="book-empty">Could not load twin impact.</p>`;
    console.error(error);
  }
}

function twinVerdict(projection) {
  const ignored = projection.ignored;
  if (ignored.overdraftMonth) {
    return `Stress in month ${ignored.overdraftMonth} if ignored`;
  }
  if (ignored.minBalance < ignored.startingBalance * 0.35) {
    return `Buffer thins sharply if unmanaged`;
  }
  return `Accepted path +${money.format(projection.delta.endingBalance)} ending balance`;
}

function miniSparkSvg(projection, fillId) {
  const base = projection.ignored.trajectory.map((p) => p.projectedBalance);
  const modeled = projection.accepted.trajectory.map((p) => p.projectedBalance);
  const max = Math.max(...modeled, ...base);
  const min = Math.min(...modeled, ...base, 0);
  const range = max - min || 1;
  const w = 160;
  const h = 40;
  const pad = 2;
  const sx = (i) => pad + (i * (w - pad * 2)) / Math.max(1, base.length - 1);
  const sy = (v) => h - pad - ((v - min) / range) * (h - pad * 2);
  const path = (values) =>
    values.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const area = `${path(modeled)} L${sx(modeled.length - 1).toFixed(1)},${h - pad} L${sx(0).toFixed(1)},${h - pad} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-brand-blue)" stop-opacity=".28"/><stop offset="1" stop-color="var(--sc-brand-blue)" stop-opacity="0"/></linearGradient></defs><path class="area" style="fill:url(#${fillId})" d="${area}"/><path class="line base" d="${path(base)}"/><path class="line solution" d="${path(modeled)}"/></svg>`;
}

function renderPortfolioStrip(cards) {
  const reviewDue = state.customerBook.filter((c) => c.status.key === "review" || c.status.key === "life-event").length;
  const opportunity = cards.reduce((sum, c) => sum + (Number(c.projection?.delta?.endingBalance) || 0), 0);
  const highPriority = cards.length;

  const portfolioEl = $("#statPortfolio");
  const opportunityEl = $("#statOpportunity");
  const reviewEl = $("#statReview");
  const reviewNote = $("#statReviewNote");
  const opportunityDelta = $("#statOpportunityDelta");

  if (portfolioEl) portfolioEl.textContent = String(PORTFOLIO_SIZE);
  if (opportunityEl) {
    opportunityEl.textContent =
      opportunity >= 1000 ? `S$${(opportunity / 1000).toFixed(1)}K` : money.format(opportunity);
  }
  if (opportunityDelta) opportunityDelta.textContent = "↑ twin uplift if supported";
  if (reviewEl) reviewEl.textContent = String(reviewDue);
  if (reviewNote) reviewNote.textContent = `${highPriority} high priority`;
}

function renderMomentumSpark() {
  const el = $("#momentumSpark");
  if (!el) return;
  const points = [6, 9, 8, 12, 11, 14, 13, 17, 16, 19, 18, 22];
  const w = 88;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((v, i) => {
      const xPos = (i / (points.length - 1)) * w;
      const yPos = h - 3 - ((v - min) / range) * (h - 8);
      return `${i ? "L" : "M"}${xPos.toFixed(1)},${yPos.toFixed(1)}`;
    })
    .join(" ");
  el.innerHTML = `<path d="${d}"/>`;
}

function renderTwinImpactStrip(cards) {
  const strip = nodes.twinImpactStrip;
  if (!strip) return;

  strip.innerHTML = cards
    .map((card) => {
      const { id, scenario, projection, details } = card;
      const conf = Math.round(scenario.event.confidence * 100);
      const active = id === state.homePreviewId;
      return `<button type="button" class="triage-card ${active ? "active" : ""}" data-id="${id}">
        <div class="triage-card-head">
          <span class="tab-avatar">${escapeHtml(details.initials)}</span>
          <span class="triage-card-copy">
            <strong>${escapeHtml(details.fullName)}</strong>
            <small>${escapeHtml(scenario.event.label)}</small>
          </span>
          <span class="confidence">${conf}%</span>
        </div>
        <div class="triage-spark">${miniSparkSvg(projection, `triageFill-${id}`)}</div>
        <p class="twin-verdict">${escapeHtml(twinVerdict(projection))}</p>
        <span class="triage-cta">Rank ${escapeHtml(String(card.score ?? "—"))} · view outlook <span aria-hidden="true">→</span></span>
      </button>`;
    })
    .join("");

  strip.querySelectorAll(".triage-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.homePreviewId = btn.dataset.id;
      renderTwinImpactStrip(cards);
      renderHomeOutlook(btn.dataset.id);
    });
    btn.addEventListener("dblclick", () => openClient(btn.dataset.id));
  });
}

function renderHomeOutlook(scenarioId) {
  const card = state.twinCards?.find((c) => c.id === scenarioId);
  const title = $("#homeOutlookTitle");
  const lede = $("#homeOutlookLede");
  const deltaEl = $("#homeDelta");
  const lowestEl = $("#homeLowest");
  const riskEl = $("#homeRisk");
  if (!card || !nodes.homeChart) {
    if (lede) lede.textContent = "Loading twin projections…";
    return;
  }

  const { scenario, projection, details } = card;
  const base = projection.ignored.trajectory.map((p) => p.projectedBalance);
  const modeled = projection.accepted.trajectory.map((p) => p.projectedBalance);
  const delta = Number(projection.delta.endingBalance) || 0;
  const low = Math.min(...modeled);
  const riskElevated = modeled.some((v) => v < 0) || Boolean(projection.ignored.overdraftMonth);
  const riskLabel = riskElevated
    ? projection.ignored.overdraftMonth
      ? `Elevated · M${projection.ignored.overdraftMonth}`
      : "Elevated"
    : "Protected";

  if (title) title.textContent = `${details.fullName} · projected liquidity`;
  if (lede) {
    lede.textContent = `${scenario.event.label} — ignored vs supported path over the next 12 months.`;
  }
  if (deltaEl) deltaEl.textContent = money.format(delta);
  if (lowestEl) lowestEl.textContent = money.format(low);
  if (riskEl) {
    riskEl.textContent = riskLabel;
    riskEl.classList.toggle("risk-elevated", riskElevated);
  }

  renderChart(
    base,
    modeled,
    {
      ignored: projection.ignored,
      modeled: projection.accepted,
    },
    nodes.homeChart,
    "homeFill"
  );
}

function renderFuturePicker() {
  const el = $("#futurePicker");
  if (!el) return;
  el.innerHTML = Object.entries(customerDetails)
    .map(
      ([id, d]) =>
        `<button type="button" class="future-client ${id === state.scenarioId ? "active" : ""}" data-id="${id}"><span class="chapter-icon">${id === "new-parent" ? "✦" : id === "job-loss" ? "↗" : "♡"}</span><span><strong>${escapeHtml(id === "new-parent" ? "Growing a family" : id === "job-loss" ? "Career reset" : "Getting married")}</strong><small>${escapeHtml(d.context)}</small></span></button>`
    )
    .join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.id === state.scenarioId) return;
      state.futureMessages = [];
      await loadScenario(btn.dataset.id);
      renderFuturePicker();
      renderFutureSuggestions();
      renderFutureThread();
    });
  });
}

const GAME_ROUNDS = [
  { month: 1, icon: "✦", kind: "LIFE EVENT", title: "Your baby arrives early", story: "Everyone is healthy—but the extra medical care and baby essentials cost S$1,800. How do you handle it?", choices: [
    { label: "Use the emergency fund", detail: "Pay today and keep debt at zero.", effects: { cash: -1800, stress: 7, happy: 4 }, reaction: "We are debt-free, but our safety net suddenly feels very small.", tag: "buffer" },
    { label: "Put it on your credit card", detail: "Protect cash now; carry the balance forward.", effects: { debt: 1800, stress: 12, happy: 2 }, reaction: "Cash is intact, but that bill followed us home.", tag: "credit" },
    { label: "Choose a 6-month instalment plan", detail: "S$300 monthly, with no interest.", effects: { cash: -300, monthly: -300, stress: 5, happy: 3 }, reaction: "The cost feels manageable—provided nothing else goes wrong.", tag: "instalment" },
  ]},
  { month: 2, icon: "⌂", kind: "FAMILY CHOICE", title: "The daycare decision", story: "Your preferred daycare has one place left. Every option changes more than just your bank balance.", choices: [
    { label: "Nearby premium daycare", detail: "More family time, S$1,250 per month.", effects: { cash: -1250, monthly: -1250, stress: -8, happy: 12 }, reaction: "The commute is easy and we get precious evenings back.", tag: "premium-care" },
    { label: "Affordable daycare farther away", detail: "S$850 per month, but a longer commute.", effects: { cash: -850, monthly: -850, stress: 6, happy: 4 }, reaction: "We save money, though the long days take a little more from us.", tag: "value-care" },
    { label: "Extend parental leave", detail: "Lose S$1,600 income monthly for three months.", effects: { cash: -1600, monthly: -400, stress: -3, happy: 15 }, reaction: "The budget tightens, but we get a chapter together that will not return.", tag: "leave" },
  ]},
  { month: 3, icon: "◇", kind: "HIDDEN GAP REVEALED", title: "Your protection check", story: "LifeLens finds a S$420K family protection gap. You can protect more, preserve cash, or postpone the decision.", choices: [
    { label: "Close the full protection gap", detail: "S$118 monthly for comprehensive cover.", effects: { cash: -118, monthly: -118, protection: 45, stress: -9 }, reaction: "Knowing the family is protected changes how I sleep at night.", tag: "full-cover" },
    { label: "Start with essential cover", detail: "S$62 monthly; review again next year.", effects: { cash: -62, monthly: -62, protection: 27, stress: -4 }, reaction: "We covered the biggest risks without over-stretching today.", tag: "basic-cover" },
    { label: "Decide later", detail: "Keep every dollar available for now.", effects: { protection: -8, stress: 8 }, reaction: "We kept the cash, but the gap is still sitting quietly behind us.", tag: "no-cover" },
  ]},
  { month: 5, icon: "!", kind: "SURPRISE EVENT", title: "The fridge stops working", story: "Milk, meal prep and groceries are at risk. Your earlier choices determine how painful this feels.", choices: [
    { label: "Repair it today", detail: "S$480 and a shorter lifespan.", effects: { cash: -480, stress: 4, happy: -2 }, reaction: "Not glamorous, but the groceries are safe and life keeps moving.", tag: "repair" },
    { label: "Replace it with an efficient model", detail: "S$1,400 now; lower future electricity costs.", effects: { cash: -1400, monthly: 35, stress: 2, happy: 8 }, reaction: "It hurt today, but Future Me will thank us every month.", tag: "replace" },
    { label: "Use credit and preserve the buffer", detail: "S$1,400 debt, paid over time.", effects: { debt: 1400, stress: 10, happy: 5 }, reaction: "The fridge is fixed. The payment is now tomorrow's problem.", tag: "fridge-credit" },
  ]},
  { month: 8, icon: "↗", kind: "OPPORTUNITY", title: "A promotion comes with a catch", story: "The role adds S$900 monthly, but requires longer hours and more childcare support.", choices: [
    { label: "Take the promotion", detail: "+S$900 income, −S$300 extra childcare monthly.", effects: { cash: 600, monthly: 600, stress: 14, happy: -4 }, reaction: "The future grows faster, though our weekdays feel heavier.", tag: "promotion" },
    { label: "Negotiate flexible hours", detail: "+S$450 monthly with more time at home.", effects: { cash: 450, monthly: 450, stress: 2, happy: 8 }, reaction: "Not the biggest raise, but it fits the life we actually want.", tag: "flex" },
    { label: "Stay in the current role", detail: "Protect stability and family time.", effects: { stress: -8, happy: 6 }, reaction: "We chose enough—for now—and that can be a powerful choice too.", tag: "stay" },
  ]},
  { month: 12, icon: "★", kind: "FINAL DECISION", title: "Your first family holiday", story: "You made it through the year. Do you celebrate now, protect the buffer, or split the difference?", choices: [
    { label: "Take the S$2,200 holiday", detail: "Spend on a memory you will keep.", effects: { cash: -2200, stress: -12, happy: 20 }, reaction: "The balance is lower, but this year gave us a memory—not only a spreadsheet.", tag: "holiday" },
    { label: "Keep building the safety net", detail: "Put the full amount toward resilience.", effects: { cash: 300, stress: -3, protection: 8, happy: -3 }, reaction: "We delayed the trip and bought ourselves calm for the next surprise.", tag: "save" },
    { label: "Choose a nearby S$750 getaway", detail: "Celebrate while preserving most of the buffer.", effects: { cash: -750, stress: -8, happy: 12 }, reaction: "We found a middle path: a little joy now and some safety later.", tag: "mini-break" },
  ]},
];

const AVATAR_ITEMS = [
  { id: "cap", name: "Future Builder Cap", type: "hat", icon: "⌒", cost: 120, description: "For people with a plan—or at least a spreadsheet." },
  { id: "glasses", name: "Focus Frames", type: "glasses", icon: "○—○", cost: 160, description: "See the trade-offs a little more clearly." },
  { id: "plant", name: "Growing Goals", type: "room", icon: "♧", cost: 90, description: "A tiny reminder that consistency compounds." },
  { id: "lamp", name: "Calm Glow", type: "room", icon: "◉", cost: 140, description: "Makes every future feel slightly warmer." },
  { id: "pet", name: "Buffer Buddy", type: "companion", icon: "●ᴥ●", cost: 240, description: "Stays calm through surprise expenses." },
];

const DECISION_RESOURCES = [
  { id: "twin", icon: "✦", title: "Consult Future You", copy: "Get a personalised clue based on your current position.", limited: true },
  { id: "guide", icon: "?", title: "Open quick guide", copy: "Understand the financial principle behind this decision." },
  { id: "rm", icon: "◌", title: "Ask Jamie", copy: "See the question your RM would help you work through." },
];

const CANVAS_EVENTS = [
  { id: "second-child", icon: "●", title: "Second child", category: "family", recommended: true, cost: 1800, monthly: -950, stress: 8, protection: 12, caption: "A growing family needs more space, protection and monthly flexibility." },
  { id: "home", icon: "⌂", title: "Buy a family home", category: "assets", recommended: true, cost: 65000, monthly: -1700, stress: 10, asset: 720000, caption: "A home builds an asset while creating a much larger fixed commitment." },
  { id: "car", icon: "▰", title: "Buy a car", category: "assets", recommended: true, cost: 38000, monthly: -1100, stress: 4, caption: "More convenience for the family, with a significant total ownership cost." },
  { id: "promotion", icon: "↗", title: "Career promotion", category: "career", recommended: true, cost: 0, monthly: 1200, stress: 12, caption: "Higher income accelerates goals, but the extra workload changes wellbeing." },
  { id: "career-break", icon: "Ⅱ", title: "Six-month career break", category: "career", recommended: false, cost: 12000, monthly: -650, stress: -18, caption: "Time away supports recovery or caregiving but temporarily reduces income." },
  { id: "wedding", icon: "◇", title: "Wedding celebration", category: "family", recommended: false, cost: 42000, monthly: -250, stress: 7, caption: "A major celebration creates a short-term cash peak and shared-money decisions." },
  { id: "eldercare", icon: "♡", title: "Support ageing parents", category: "family", recommended: true, cost: 5000, monthly: -600, stress: 9, protection: 8, caption: "Care responsibilities add recurring costs and make family protection more important." },
  { id: "business", icon: "✦", title: "Start a side business", category: "career", recommended: false, cost: 10000, monthly: 450, stress: 15, asset: 18000, caption: "Entrepreneurship adds uncertainty today and potential income later." },
];

function newGame() {
  return { round: 0, cash: 4200, debt: 0, happy: 72, stress: 28, protection: 35, monthly: 0, choices: [], history: [4200], complete: false, rewindMode: false, consults: 2, earnedCoins: 0, resourceOpen: null };
}

function clampGame(value) { return Math.max(0, Math.min(100, value)); }

function applyGameChoice(choiceIndex) {
  const game = state.game;
  const round = GAME_ROUNDS[game.round];
  const choice = round.choices[choiceIndex];
  const e = choice.effects;
  game.cash += (e.cash || 0) + game.monthly * Math.max(1, round.month - (GAME_ROUNDS[game.round - 1]?.month || 0));
  game.debt = Math.max(0, game.debt + (e.debt || 0));
  game.happy = clampGame(game.happy + (e.happy || 0));
  game.stress = clampGame(game.stress + (e.stress || 0));
  game.protection = clampGame(game.protection + (e.protection || 0));
  game.monthly += e.monthly || 0;
  game.choices.push({ round: game.round, choiceIndex, label: choice.label, tag: choice.tag, reaction: choice.reaction });
  game.resourceOpen = null;
  game.history.push(game.cash);
  const earned = 55 + (game.stress < 55 ? 15 : 0) + (game.cash > 0 ? 10 : 0);
  game.earnedCoins += earned;
  state.avatarProfile.coins += earned;
  game.round += 1;
  game.complete = game.round >= GAME_ROUNDS.length;
  renderPlayFuture();
}

function gameScore(game) {
  const cashScore = Math.max(0, Math.min(30, 15 + game.cash / 500));
  const debtPenalty = Math.min(20, game.debt / 250);
  return Math.max(0, Math.min(100, Math.round(cashScore + game.happy * .22 + (100 - game.stress) * .18 + game.protection * .25 - debtPenalty)));
}

function gameAchievements(game) {
  const spend = 4650;
  const snapshot = {
    emergencyFundMonths: spend ? game.cash / spend : 0,
    minBalance: Math.min(...(game.history || [game.cash])),
    onTrack: game.cash >= 0,
    monthlyNet: 6200 - spend + (game.monthly || 0),
  };
  const items = [];
  if (snapshot.emergencyFundMonths >= 6) items.push(["☂", "6-month buffer", `${snapshot.emergencyFundMonths.toFixed(1)} months of spend in cash — same threshold as Goal Plan`]);
  if (snapshot.minBalance >= 0) items.push(["◇", "Stayed liquid", "Never went negative"]);
  if (snapshot.onTrack) items.push(["⬡", "Goal in reach", "Ended the year with a positive buffer"]);
  if (snapshot.monthlyNet > 0) items.push(["☼", "Paying yourself first", "Modeled monthly net stayed positive"]);
  return items.slice(0, 4);
}

function renderGameTimeline() {
  const game = state.game;
  $("#gameTimeline").innerHTML = GAME_ROUNDS.map((r, i) => `<div class="month-node ${i < game.round ? "done" : i === game.round && !game.complete ? "active" : ""}"><b>${i < game.round ? "✓" : r.icon}</b><span><strong>Month ${r.month}</strong><small>${escapeHtml(r.title)}</small></span></div>`).join("");
}

function renderGameHud() {
  const g = state.game;
  $("#gameCash").textContent = money.format(g.cash);
  $("#gameDebt").textContent = money.format(g.debt);
  $("#gameHappy").textContent = g.happy;
  $("#gameStress").textContent = g.stress;
  $("#gameProtection").textContent = g.protection;
  $("#gameHappyBar").style.width = `${g.happy}%`;
  $("#gameStressBar").style.width = `${g.stress}%`;
  $("#gameProtectionBar").style.width = `${g.protection}%`;
  $("#gameCashDelta").textContent = g.cash >= 0 ? "available buffer" : "buffer exhausted";
  $("#gameLevel").textContent = Math.min(6, g.round + 1);
  $("#gameRank").textContent = g.complete ? "Year completed" : `Month ${GAME_ROUNDS[g.round]?.month || 12} · Future Builder`;
  $("#avatarCoins").textContent = state.avatarProfile.coins;
}

function renderRoom() {
  const g = state.game;
  const last = g.choices.at(-1);
  $("#twinReaction").textContent = `“${last?.reaction || "I’m counting on the choices you make today."}”`;
  $("#roomLabel").textContent = g.complete ? "Month 12 · Your future is here" : `Month ${GAME_ROUNDS[g.round]?.month || 1} · ${GAME_ROUNDS[g.round]?.kind || "Future"}`;
  $("#roomScene").classList.toggle("room-stressed", g.stress >= 60);
  $("#roomScene").classList.toggle("room-thriving", g.cash > 2500 && g.stress < 55);
  $("#roomBills").style.opacity = String(Math.min(.95, .15 + g.debt / 3500));
  $("#roomShield").style.opacity = String(g.protection / 100);
  $("#gameCharacter").className = `game-character ${g.stress >= 60 ? "character-stressed" : g.happy >= 78 ? "character-happy" : ""}`;
  applyAvatarProfile();
  $("#decisionLog").innerHTML = g.choices.length ? g.choices.slice(-4).reverse().map((c) => `<div><b>M${GAME_ROUNDS[c.round].month}</b><span>${escapeHtml(c.label)}</span></div>`).join("") : "<small>No decisions yet.</small>";
}

function renderGameRound() {
  const g = state.game;
  const round = GAME_ROUNDS[g.round];
  const stage = $("#gameRound");
  stage.innerHTML = `<div class="round-progress"><span>DECISION ${g.round + 1} OF ${GAME_ROUNDS.length}</span><div><i style="width:${(g.round / GAME_ROUNDS.length) * 100}%"></i></div><b>Month ${round.month}</b></div><div class="event-banner ${round.kind.includes("SURPRISE") ? "surprise" : ""}"><span>${round.icon}</span><div><small>${round.kind}</small><h2>${escapeHtml(round.title)}</h2></div></div><p class="event-story">${escapeHtml(round.story)}</p><div class="decision-support"><div class="support-head"><span>NEED HELP DECIDING?</span><small>Resources inform your choice—they do not choose for you.</small></div><div class="support-actions">${DECISION_RESOURCES.map((r) => `<button type="button" data-resource="${r.id}"><b>${r.icon}</b><span><strong>${r.title}</strong><small>${r.limited ? `${g.consults} consultation${g.consults === 1 ? "" : "s"} left` : r.copy}</small></span></button>`).join("")}</div><div class="resource-answer" id="resourceAnswer" ${g.resourceOpen ? "" : "hidden"}>${g.resourceOpen ? resourceAnswer(g.resourceOpen, round, g) : ""}</div></div><div class="story-choices">${round.choices.map((c, i) => `<button type="button" data-choice="${i}"><span class="choice-letter">${String.fromCharCode(65 + i)}</span><span><strong>${escapeHtml(c.label)}</strong><small>${escapeHtml(c.detail)}</small></span><span class="choice-preview">${formatEffects(c.effects)}</span></button>`).join("")}</div><p class="choice-note">There is no perfect answer. Choose what matters most to you.</p>`;
  stage.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => applyGameChoice(Number(button.dataset.choice))));
  stage.querySelectorAll("[data-resource]").forEach((button) => button.addEventListener("click", () => openDecisionResource(button.dataset.resource)));
  $("#resourceRmIntent")?.addEventListener("click", () => showToast("Question saved for Jamie · no meeting requested yet"));
}

function openDecisionResource(id) {
  const g = state.game;
  if (id === "twin" && g.resourceOpen !== "twin") {
    if (g.consults <= 0) { showToast("You have used both Future You consultations this run"); return; }
    g.consults -= 1;
  }
  g.resourceOpen = id;
  renderGameRound();
}

function resourceAnswer(id, round, g) {
  const answers = {
    twin: g.cash < 1500 ? `<b>Future You:</b> “Our buffer is already thin. Look beyond today's payment and notice which option adds a recurring commitment.”` : g.stress > 55 ? `<b>Future You:</b> “Money matters, but our stress is becoming expensive too. Which choice creates breathing room we can sustain?”` : `<b>Future You:</b> “We still have room to choose. Compare the recurring cost, the risk it removes and what we value as a family.”`,
    guide: round.month <= 2 ? `<b>Quick guide:</b> Emergency funds protect against unplanned costs. Instalments preserve cash today but reduce flexibility in future months.` : round.month === 3 ? `<b>Quick guide:</b> A protection gap estimates the financial support dependants may need if income is interrupted. More cover is not automatically better—affordability matters.` : round.month === 5 ? `<b>Quick guide:</b> Compare total cost, useful life and effect on your emergency buffer. Cheap today can cost more later; debt also has a flexibility cost.` : `<b>Quick guide:</b> A sustainable plan balances money, time and wellbeing. Test whether the choice still works after another unexpected expense.`,
    rm: `<b>Jamie would ask:</b> “What outcome worries you most here—and what monthly commitment would still feel comfortable if another surprise happened?” <button type="button" class="resource-rm-link" id="resourceRmIntent">Save this for my RM</button>`,
  };
  return answers[id] || "";
}

function formatEffects(e) {
  const parts = [];
  if (e.cash) parts.push(`${e.cash > 0 ? "+" : ""}${money.format(e.cash)} cash`);
  if (e.debt) parts.push(`+${money.format(e.debt)} debt`);
  if (e.happy) parts.push(`${e.happy > 0 ? "+" : ""}${e.happy} wellbeing`);
  if (e.stress) parts.push(`${e.stress > 0 ? "+" : ""}${e.stress} stress`);
  if (e.protection) parts.push(`${e.protection > 0 ? "+" : ""}${e.protection} protection`);
  return parts.slice(0, 2).join(" · ");
}

function renderGameResults() {
  const g = state.game;
  const score = gameScore(g);
  const persona = score >= 82 ? ["The Resilient Planner", "You protected what mattered without forgetting to live."] : score >= 65 ? ["The Adaptive Balancer", "You navigated the year with heart, making thoughtful trade-offs under pressure."] : ["The Courageous Improviser", "You made it through a demanding year. Your next opportunity is rebuilding the safety net."];
  const ignored = [4200, 3750, 2550, 1600, 650, -300, -1250];
  const uplift = g.cash - ignored.at(-1);
  const achievements = gameAchievements(g);
  $("#gameRound").innerHTML = `<div class="results-celebrate"><span>YEAR COMPLETE · +${g.earnedCoins} FUTURE COINS</span><h2>Meet Future ${escapeHtml(activeTwinFirstName())}.</h2><p>${escapeHtml(persona[1])}</p></div><div class="result-score"><div class="score-orbit"><strong>${score}</strong><span>FUTURE SCORE</span></div><div><p class="eyebrow">YOUR FINANCIAL PERSONALITY</p><h2>${escapeHtml(persona[0])}</h2><p>Ending cash <b>${money.format(g.cash)}</b> · Debt <b>${money.format(g.debt)}</b> · Protection <b>${g.protection}/100</b></p></div></div><div class="scenario-comparison"><div class="comparison-head"><p class="eyebrow">THREE POSSIBLE FUTURES</p><h3>Same life event. Different levels of support.</h3></div>${scenarioComparison(g)}</div><div class="result-chart"><div><p class="eyebrow">THE FUTURE YOU CREATED</p><h3>${uplift >= 0 ? "+" : ""}${money.format(uplift)} vs unmanaged path</h3></div>${gameResultChart(g.history)}</div><div class="achievement-grid">${achievements.map(([icon,title,copy]) => `<div><b>${icon}</b><span><strong>${title}</strong><small>${copy}</small></span></div>`).join("")}</div><div class="result-actions"><button type="button" class="secondary-button" id="rewindFuture">↶ Rewind one decision</button><button type="button" class="primary-button" id="shareGameRm">Share this future with Jamie</button><button type="button" class="text-button" id="restartGame">Play again</button></div><div class="rm-handoff result-handoff" id="gameHandoff" hidden><span>✓</span><div><strong>Jamie received more than a product lead</strong><small>Priority: family liquidity · Main trade-off: ${escapeHtml(g.choices[1]?.label || "daycare")} · Protection: ${g.protection}/100 · Customer requested a conversation.</small></div></div>`;
  $("#rewindFuture").addEventListener("click", renderRewindChoices);
  $("#restartGame").addEventListener("click", () => { state.game = newGame(); renderPlayFuture(); });
  $("#shareGameRm").addEventListener("click", () => { $("#gameHandoff").hidden = false; $("#shareGameRm").textContent = "Shared with Jamie ✓"; $("#shareGameRm").disabled = true; showToast("Your future and priorities were shared with Jamie ✓"); });
}

function scenarioComparison(g) {
  const current = { cash: Math.round(g.cash), stress: g.stress, protection: g.protection };
  const conservative = { cash: Math.round(g.cash - 2400), stress: Math.min(100, g.stress + 18), protection: Math.max(10, g.protection - 25) };
  const optimised = { cash: Math.round(Math.max(g.cash + 3200, 4800)), stress: Math.max(18, g.stress - 14), protection: Math.max(78, g.protection) };
  return `<div class="comparison-grid"><div><span>CONSERVATIVE</span><strong>${money.format(conservative.cash)}</strong><small>Stress ${conservative.stress} · Protection ${conservative.protection}</small><i style="width:${Math.max(5, conservative.protection)}%"></i></div><div class="current"><span>YOUR CURRENT PATH</span><strong>${money.format(current.cash)}</strong><small>Stress ${current.stress} · Protection ${current.protection}</small><i style="width:${Math.max(5, current.protection)}%"></i></div><div class="optimised"><span>OPTIMISED SUPPORT</span><strong>${money.format(optimised.cash)}</strong><small>Stress ${optimised.stress} · Protection ${optimised.protection}</small><i style="width:${Math.max(5, optimised.protection)}%"></i></div></div><p class="comparison-note">Illustrative—not a promise or credit decision. “Optimised” combines an affordable buffer, suitable protection and sustainable cashflow changes.</p>`;
}

function applyAvatarProfile() {
  const p = state.avatarProfile;
  const equipped = new Set(p.equipped);
  [$("#gameCharacter"), $("#studioCharacter")].filter(Boolean).forEach((el) => { el.dataset.colour = p.colour; });
  [$("#avatarHat"), $("#studioHat")].filter(Boolean).forEach((el) => { el.hidden = !equipped.has("cap"); });
  [$("#avatarGlasses"), $("#studioGlasses")].filter(Boolean).forEach((el) => { el.hidden = !equipped.has("glasses"); });
  [$("#avatarPet"), $("#studioPet")].filter(Boolean).forEach((el) => { el.hidden = !equipped.has("pet"); });
  [$("#avatarLamp"), $("#studioLamp")].filter(Boolean).forEach((el) => { el.hidden = !equipped.has("lamp"); });
  document.querySelectorAll(".room-plant").forEach((el) => { el.hidden = !equipped.has("plant"); });
}

function renderAvatarStudio() {
  const p = state.avatarProfile;
  $("#studioCoins").textContent = p.coins;
  $("#avatarShop").innerHTML = AVATAR_ITEMS.map((item) => { const owned = p.owned.includes(item.id); const equipped = p.equipped.includes(item.id); return `<article class="shop-item ${equipped ? "equipped" : ""}"><b>${item.icon}</b><div><strong>${item.name}</strong><small>${item.description}</small><span>${owned ? "Owned" : `✦ ${item.cost}`}</span></div><button type="button" data-shop="${item.id}">${equipped ? "Equipped ✓" : owned ? "Equip" : "Buy"}</button></article>`; }).join("");
  $("#avatarShop").querySelectorAll("[data-shop]").forEach((button) => button.addEventListener("click", () => buyOrEquipAvatarItem(button.dataset.shop)));
  $("#avatarColours").querySelectorAll("[data-colour]").forEach((button) => button.classList.toggle("active", button.dataset.colour === p.colour));
  applyAvatarProfile();
}

function buyOrEquipAvatarItem(id) {
  const p = state.avatarProfile;
  const item = AVATAR_ITEMS.find((x) => x.id === id);
  if (!item) return;
  if (!p.owned.includes(id)) {
    if (p.coins < item.cost) { showToast(`Earn ${item.cost - p.coins} more coins to unlock ${item.name}`); return; }
    p.coins -= item.cost; p.owned.push(id); p.equipped.push(id); showToast(`${item.name} unlocked!`);
  } else if (p.equipped.includes(id)) p.equipped = p.equipped.filter((x) => x !== id);
  else p.equipped.push(id);
  renderAvatarStudio(); renderGameHud(); applyAvatarProfile();
}

function setFutureExperience(name) {
  const panels = {
    goal: $("#goalExperience"),
    game: $("#gameExperience"),
    canvas: $("#canvasExperience"),
  };
  for (const [key, el] of Object.entries(panels)) {
    if (!el) continue;
    const on = key === name;
    el.hidden = !on;
    el.classList.toggle("active", on);
  }
  $("#experienceTabs")?.querySelectorAll("[data-experience]").forEach((button) => {
    const active = button.dataset.experience === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (name === "goal") refreshGoalPlan();
  if (name === "canvas") renderFutureCanvas();
  if (name === "game") renderPlayFuture();
}

function renderFutureCanvas() {
  const d = activeTwinDetails();
  const firstName = activeTwinFirstName();
  if ($("#canvasPersonaEyebrow")) $("#canvasPersonaEyebrow").textContent = `FUTURE CANVAS · PERSONALISED FOR ${firstName.toUpperCase()}`;
  if ($("#canvasProfileTags")) {
    const tags = [d.age && d.age !== "—" ? `Age ${d.age}` : null, d.context, d.tier].filter(Boolean);
    $("#canvasProfileTags").innerHTML = tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("");
  }
  renderEventPalette();
  renderDropTimeline();
  renderCanvasWorld();
  renderConnections();
}

function renderEventPalette() {
  const el = $("#eventPalette");
  if (!el) return;
  const chosen = new Set(state.futureCanvas.events.map((x) => x.id));
  const list = CANVAS_EVENTS.filter((event) => state.futureCanvas.filter === "all" || event.category === state.futureCanvas.filter);
  el.innerHTML = list.map((event) => `<button type="button" class="event-drag-card ${chosen.has(event.id) ? "used" : ""}" draggable="true" data-event-id="${event.id}"><b>${event.icon}</b><span><strong>${escapeHtml(event.title)}</strong><small>${event.recommended ? "Recommended for your life stage" : "Explore this possibility"}</small></span><em>${event.monthly >= 0 ? "+" : ""}${money.format(event.monthly)}/mo</em><i>⋮⋮</i></button>`).join("");
  el.querySelectorAll("[data-event-id]").forEach((card) => {
    card.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", card.dataset.eventId); e.dataTransfer.effectAllowed = "copy"; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("click", () => addCanvasEvent(card.dataset.eventId));
  });
}

function renderDropTimeline() {
  const el = $("#dropTimeline");
  if (!el) return;
  const years = ["Now", "+2 years", "+5 years", "+10 years"];
  el.innerHTML = years.map((label, slot) => `<div class="year-drop-zone ${state.futureCanvas.events.some((e) => e.slot === slot) ? "has-events" : ""}" data-slot="${slot}"><span>${label}</span><div>${state.futureCanvas.events.filter((e) => e.slot === slot).map((placed) => { const event = CANVAS_EVENTS.find((x) => x.id === placed.id); return `<button type="button" class="placed-event" data-remove-event="${event.id}" title="Remove ${escapeHtml(event.title)}"><b>${event.icon}</b><small>${escapeHtml(event.title)}</small><i>×</i></button>`; }).join("") || "<small>Drop an event here</small>"}</div></div>`).join("");
  el.querySelectorAll(".year-drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("drag-over"); addCanvasEvent(e.dataTransfer.getData("text/plain"), Number(zone.dataset.slot)); });
  });
  el.querySelectorAll("[data-remove-event]").forEach((button) => button.addEventListener("click", () => removeCanvasEvent(button.dataset.removeEvent)));
}

function addCanvasEvent(id, slot) {
  if (!CANVAS_EVENTS.some((event) => event.id === id)) return;
  const existing = state.futureCanvas.events.find((event) => event.id === id);
  if (existing) {
    if (Number.isInteger(slot)) existing.slot = slot;
    else showToast("That event is already on your canvas");
  } else {
    const occupied = new Set(state.futureCanvas.events.map((event) => event.slot));
    const nextSlot = Number.isInteger(slot) ? slot : [0, 1, 2, 3].find((x) => !occupied.has(x)) ?? 3;
    state.futureCanvas.events.push({ id, slot: nextSlot });
  }
  renderFutureCanvas();
}

function removeCanvasEvent(id) {
  state.futureCanvas.events = state.futureCanvas.events.filter((event) => event.id !== id);
  renderFutureCanvas();
}

function renderCanvasWorld() {
  const selected = state.futureCanvas.events.map((placed) => CANVAS_EVENTS.find((event) => event.id === placed.id)).filter(Boolean);
  const ids = new Set(selected.map((event) => event.id));
  $("#worldHouse").classList.toggle("visible", ids.has("home"));
  $("#worldCar").classList.toggle("visible", ids.has("car"));
  $("#worldFamily").classList.toggle("visible", ids.has("second-child") || ids.has("eldercare"));
  $("#worldRing").classList.toggle("visible", ids.has("wedding"));
  $("#futureWorld").classList.toggle("world-busy", selected.reduce((sum, event) => sum + event.stress, 0) > 22);
  $("#worldCaption").textContent = selected.at(-1)?.caption || `Add a life event to begin building ${activeTwinFirstName()}'s future.`;

  const upfront = selected.reduce((sum, event) => sum + event.cost, 0);
  const monthly = selected.reduce((sum, event) => sum + event.monthly, 0);
  const assets = selected.reduce((sum, event) => sum + (event.asset || 0), 0);
  const stress = Math.max(0, Math.min(100, 28 + selected.reduce((sum, event) => sum + event.stress, 0) - state.futureCanvas.connections.length * 2));
  const runway = Math.max(-24, Math.round((186400 - upfront) / Math.max(1, 4650 - Math.min(1550, monthly))));
  $("#canvasForecast").innerHTML = `<div><span>UPFRONT FUNDING</span><strong>${money.format(upfront)}</strong><small>${selected.length ? `${selected.length} planned event${selected.length === 1 ? "" : "s"}` : "No events added"}</small></div><div><span>MONTHLY CASHFLOW CHANGE</span><strong class="${monthly < 0 ? "negative" : ""}">${monthly >= 0 ? "+" : ""}${money.format(monthly)}</strong><small>once all events begin</small></div><div><span>PROJECTED ASSETS</span><strong>${money.format(186400 + assets)}</strong><small>illustrative 10-year position</small></div><div><span>RESILIENCE WINDOW</span><strong>${runway > 24 ? "24+ mo" : `${runway} mo`}</strong><small>before safeguards</small></div><div><span>WELLBEING PRESSURE</span><strong>${stress}/100</strong><small>${state.futureCanvas.connections.length ? "informed by connected context" : "estimated from event load"}</small></div>`;
}

function renderConnections() {
  const connected = new Set(state.futureCanvas.connections);
  $("#connectionList")?.querySelectorAll("[data-provider]").forEach((button) => {
    const active = connected.has(button.dataset.provider);
    button.classList.toggle("connected", active);
    button.querySelector("b").textContent = active ? "Connected ✓" : "Connect";
  });
  if (!$("#healthInsight")) return;
  $("#healthInsight").innerHTML = connected.size ? `<span>WELLBEING CONTEXT ACTIVE</span><div class="health-mini-grid"><div><strong>8,420</strong><small>avg daily steps</small></div><div><strong>7h 04m</strong><small>avg sleep</small></div><div><strong>Good</strong><small>recovery trend</small></div></div><p>Simulated summary from ${[...connected].join(", ")}. Used only to personalise wellbeing assumptions.</p>` : `<span>NO DATA CONNECTED</span><p>Connecting is optional. Health data adds wellbeing context; it never changes credit eligibility or suitability rules.</p>`;
}

function gameResultChart(values) {
  const min = Math.min(...values, 0), max = Math.max(...values, 1), range = max - min || 1;
  const pts = values.map((v, i) => `${20 + i * (460 / Math.max(1, values.length - 1))},${125 - ((v - min) / range) * 95}`).join(" ");
  return `<svg viewBox="0 0 500 150" role="img" aria-label="Cash buffer through the year"><line x1="20" y1="125" x2="480" y2="125" stroke="var(--line)"/><polyline points="${pts}" fill="none" stroke="var(--sc-brand-blue)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${values.map((v,i)=>`<circle cx="${20+i*(460/Math.max(1,values.length-1))}" cy="${125-((v-min)/range)*95}" r="4" fill="white" stroke="var(--sc-brand-blue)" stroke-width="3"/>`).join("")}</svg>`;
}

function renderRewindChoices() {
  const g = state.game;
  $("#gameRound").innerHTML = `<div class="rewind-head"><span>↶</span><div><p class="eyebrow">REWIND THE FUTURE</p><h2>Which decision would you change?</h2><p>Replay from that moment and watch a different future unfold.</p></div></div><div class="rewind-list">${g.choices.map((c, i) => `<button data-rewind="${i}"><b>Month ${GAME_ROUNDS[c.round].month}</b><span><strong>${escapeHtml(GAME_ROUNDS[c.round].title)}</strong><small>You chose: ${escapeHtml(c.label)}</small></span><em>Change →</em></button>`).join("")}</div>`;
  $("#gameRound").querySelectorAll("[data-rewind]").forEach((button) => button.addEventListener("click", () => rewindGame(Number(button.dataset.rewind))));
}

function rewindGame(choicePosition) {
  const previous = state.game.choices.slice(0, choicePosition);
  const retainedCoins = state.avatarProfile.coins;
  state.game = newGame();
  previous.forEach((saved) => applyGameChoice(saved.choiceIndex));
  state.avatarProfile.coins = retainedCoins;
  renderPlayFuture();
  showToast(`Rewound to Month ${GAME_ROUNDS[choicePosition].month} · choose a different path`);
}

function renderPlayFuture() {
  if (!state.scenario || !$("#gameRound")) return;
  if (!state.game) state.game = newGame();
  if ($("#gamePlayerName")) $("#gamePlayerName").textContent = activeTwinFirstName();
  renderGameHud();
  renderGameTimeline();
  renderRoom();
  if (state.game.complete) renderGameResults(); else renderGameRound();
}

function renderFutureSuggestions() {
  const el = $("#futureSuggestions");
  if (!el) return;
  const fromList = state.scenariosList.find((s) => s.id === state.scenarioId);
  const questions = fromList?.suggestedQuestions || state.scenario?.suggestedQuestions || [
    "What should I watch out for next month?",
    "How different are the two futures?",
  ];
  el.innerHTML = questions
    .map((q, i) => `<button type="button" class="suggest-chip" data-index="${i}">${escapeHtml(q)}</button>`)
    .join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => askFutureYou(questions[Number(btn.dataset.index)]));
  });
}

function twinPathLabel(branch) {
  if (branch === "accepted") return "With my moves";
  if (branch === "ignored") return "Without my moves";
  return null;
}

function twinMetaLabel(message) {
  const d = customerDetails[activeTwinId()];
  const firstName = d?.fullName?.split(" ")[0] || "You";
  const path = twinPathLabel(message.branch);

  if (message.role === "thinking") {
    return `Future ${firstName} · Thinking`;
  }
  if (message.source === "error") {
    return `Future ${firstName} · Unavailable`;
  }
  if (isLiveLlm(message.source)) {
    return path ? `Future ${firstName} · ${path}` : `Future ${firstName} · Live`;
  }
  // cached-demo / cached-demo-fallback — keep demo plumbing out of the UI
  return path ? `Future ${firstName} · ${path}` : `Future ${firstName}`;
}

function renderFutureThread() {
  const el = $("#futureThread");
  if (!el) return;
  const started = state.futureMessages.length > 0;
  if ($("#intentSamples")) $("#intentSamples").hidden = started;
  if ($("#intentSend")) $("#intentSend").textContent = started ? "Reshape this future" : "Show me that future";
  const d = customerDetails[activeTwinId()] || { initials: "FY", fullName: "You" };
  if (!state.futureMessages.length) {
    const path = twinPathLabel(state.futureBranch)?.toLowerCase() || state.futureBranch;
    el.innerHTML = `<div class="chat-empty"><div class="profile-avatar">${escapeHtml(d.initials)}</div><p><strong>Future ${escapeHtml(d.fullName.split(" ")[0])}</strong> is ready.</p><small>Type <b>I am going to be…</b> above, or ask how this event changes liquidity on the <b>${escapeHtml(path)}</b>.</small></div>`;
    return;
  }
  el.innerHTML = state.futureMessages
    .map((m) => {
      if (m.role === "user") {
        return `<div class="chat-bubble user"><p>${escapeHtml(m.text)}</p></div>`;
      }
      if (m.role === "thinking") {
        return `<div class="chat-bubble twin thinking" aria-live="polite"><span class="chat-meta">${escapeHtml(twinMetaLabel(m))}</span><p><span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHtml(m.text)}</p></div>`;
      }
      return `<div class="chat-bubble twin"><span class="chat-meta">${escapeHtml(twinMetaLabel(m))}</span><p>${escapeHtml(m.text)}</p>${m.cites ? `<small class="cite-chip">${escapeHtml(m.cites)}</small>` : ""}</div>`;
    })
    .join("");
  el.scrollTop = el.scrollHeight;
}

function thinkingCue(question) {
  const q = String(question || "").toLowerCase();
  if (q.includes("watch")) return "Scanning next month’s liquidity trough…";
  if (q.includes("different") || q.includes("two futures")) return "Comparing without vs with my moves…";
  if (q.includes("daycare")) return "Tracing daycare’s effect on monthly surplus…";
  if (q.includes("run out") || q.includes("out of cash")) return "Walking the cash runway month by month…";
  if (q.includes("buys") || q.includes("which action")) return "Ranking autopilot levers by impact…";
  if (q.includes("month four") || q.includes("month 4")) return "Zooming into month four cashflow…";
  if (q.includes("afford")) return "Stress-testing wedding spikes against the balance path…";
  if (q.includes("month five") || q.includes("month 5")) return "Opening the month-five ledger…";
  if (q.includes("calm") || q.includes("accepted") || q.includes("with my moves")) return "Measuring how much calmer the path with my moves feels…";
  return "Reading the projection trajectory…";
}

async function askFutureYou(question) {
  const q = String(question || "").trim();
  if (!q || state.futureBusy) return;
  state.futureBusy = true;
  state.futureMessages.push({ role: "user", text: q });
  state.futureMessages.push({ role: "thinking", text: thinkingCue(q) });
  renderFutureThread();
  const send = $("#futureSend");
  if (send) send.disabled = true;
  try {
    const [result] = await Promise.all([
      fetchJson("/api/future-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: activeTwinId(),
          branch: state.futureBranch,
          question: q,
          sessionId: state.futureSessionId,
          usePlan: true,
          goal: readGoalForm(),
          levers: {
            spendCutPct: Number($("#goalCut")?.value || 0),
            extraMonthly: Number($("#goalExtra")?.value || 0),
          },
          userIntent: state.lastIntentText || q,
        }),
      }),
      new Promise((resolve) => setTimeout(resolve, 700)),
    ]);
    state.futureMessages = state.futureMessages.filter((m) => m.role !== "thinking");
    state.futureMessages.push({
      role: "twin",
      text: result.answer,
      source: result.source,
      branch: state.futureBranch,
      cites: (result.sentences || []).map((row) => row.cite).join(" · "),
    });
  } catch (error) {
    state.futureMessages = state.futureMessages.filter((m) => m.role !== "thinking");
    state.futureMessages.push({
      role: "twin",
      text: "The twin could not answer just now. Try again in a moment.",
      source: "error",
    });
    console.error(error);
  } finally {
    state.futureBusy = false;
    if (send) send.disabled = false;
    renderFutureThread();
  }
}

function bindActions() {
  $("#generateBrief").addEventListener("click", () => {
    setTimelineStep(4);
    openBrief();
    postJson("/api/demo/event", { type: "brief" }).then(loadDemoMetrics).catch(() => {});
  });
  $("#closeBrief").addEventListener("click", () => $("#briefDialog").close());
  $("#doneBrief").addEventListener("click", () => {
    $("#briefDialog").close();
    showToast("Brief added to client timeline ✓");
    postJson("/api/demo/event", { type: "meeting" }).then(loadDemoMetrics).catch(() => {});
  });
  $("#copyBrief").addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("#briefContent").innerText);
    showToast("Meeting brief copied ✓");
  });
  $("#showEvidence").addEventListener("click", openEvidence);
  $("#closeEvidence").addEventListener("click", () => $("#evidenceDialog").close());
  $("#emailFutureLink")?.addEventListener("click", openShareFuture);
  $("#twinEmptyInvite")?.addEventListener("click", openShareFuture);
  $("#closeShareFuture")?.addEventListener("click", () => $("#shareFutureDialog").close());
  $("#copyFutureLink")?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("#shareFutureLink").textContent);
    showToast("Playable link copied ✓");
  });
  $("#previewFutureLink")?.addEventListener("click", () => window.open($("#shareFutureLink").textContent, "_blank", "noopener"));
  $("#sendFutureEmail")?.addEventListener("click", openFutureEmail);
  $("#adhocSample")?.addEventListener("click", () => {
    $("#adhocInput").value = JSON.stringify(WEDDING_ADHOC_SAMPLE, null, 2);
  });
  $("#runAdhoc")?.addEventListener("click", runAdhocFromUi);
  $("#runCompare")?.addEventListener("click", runCompareFromUi);
  $("#demoReset")?.addEventListener("click", () => {
    resetDemoState().catch((error) => showToast(error.message));
  });
  $("#viewAllCustomers")?.addEventListener("click", () => setView("customers"));
  $("#backToToday")?.addEventListener("click", () => setView("today"));
  $("#homeOpenTwin")?.addEventListener("click", () => openClient(state.homePreviewId || state.scenarioId));
  $("#brandHome")?.addEventListener("click", (e) => {
    e.preventDefault();
    setView("today");
  });
  $("#customerSearch")?.addEventListener("input", (e) => {
    state.bookQuery = e.target.value.trim().toLowerCase();
    renderCustomerBook();
  });
  $("#customerFilters")?.querySelectorAll(".book-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.bookFilter = btn.dataset.filter;
      $("#customerFilters").querySelectorAll(".book-filter").forEach((b) => b.classList.toggle("active", b === btn));
      renderCustomerBook();
    });
  });
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (btn.dataset.view === state.view) return;
      setView(btn.dataset.view);
    });
  });
  window.addEventListener("popstate", (e) => {
    const view = e.state?.view || viewFromLocation() || "today";
    setView(view, { history: "none" });
  });
  $("#futureBranch")?.querySelectorAll(".branch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.futureBranch = btn.dataset.branch;
      $("#futureBranch").querySelectorAll(".branch-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderFutureThread();
    });
  });
  $("#intentForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = String($("#intentInput")?.value || "").trim();
    if (!text) return;
    submitLifeIntent(text)
      .then(() => {
        if ($("#intentInput")) $("#intentInput").value = "";
        return askFutureYou(text);
      })
      .catch((error) => showToast(error.message));
  });
  $("#intentSamples")?.querySelectorAll("[data-intent]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = String(btn.dataset.intent || "").trim();
      if (!text) return;
      if ($("#intentInput")) $("#intentInput").value = text;
      submitLifeIntent(text)
        .then(() => askFutureYou(text))
        .catch((error) => showToast(error.message));
    });
  });
  $("#adhocFile")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $("#adhocInput").value = String(reader.result || "");
      runAdhocFromUi().catch((error) => showToast(error.message));
    };
    reader.readAsText(file);
    e.target.value = "";
  });
  $("#futureForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#futureInput");
    const q = String(input?.value || "").trim();
    if (!q) return;
    if (input) input.value = "";
    const go = looksLikeIntent(q) ? submitLifeIntent(q).then(() => askFutureYou(q)) : askFutureYou(q);
    Promise.resolve(go).catch((error) => showToast(error.message));
  });
  $("#openAvatarStudio")?.addEventListener("click", () => { renderAvatarStudio(); $("#avatarStudio").showModal(); });
  $("#closeAvatarStudio")?.addEventListener("click", () => $("#avatarStudio").close());
  $("#avatarColours")?.querySelectorAll("[data-colour]").forEach((button) => button.addEventListener("click", () => { state.avatarProfile.colour = button.dataset.colour; renderAvatarStudio(); applyAvatarProfile(); }));
  $("#experienceTabs")?.querySelectorAll("[data-experience]").forEach((button) => button.addEventListener("click", () => setFutureExperience(button.dataset.experience)));
  $("#shareGoalPlan")?.addEventListener("click", () => {
    shareGoalPlan().catch((error) => showToast(error.message));
  });
  $("#suggestLevers")?.addEventListener("click", () => {
    suggestLeversFromUi().catch((error) => showToast(error.message));
  });
  $("#funMode")?.addEventListener("change", () => {
    document.body.classList.toggle("fun-mode", $("#funMode").checked);
    if (!$("#funMode").checked) setFutureExperience("goal");
  });
  $("#goalCustomer")?.addEventListener("change", () => {
    state.goalTouched = false;
    state.goalCustomerId = $("#goalCustomer").value;
    state.futureMessages = [];
    state.game = null;
    if ($("#leverSuggestions")) $("#leverSuggestions").innerHTML = "";
    renderFutureThread();
    refreshGoalPlan();
    if ($("#gameExperience")?.classList.contains("active")) renderPlayFuture();
    if ($("#canvasExperience")?.classList.contains("active")) renderFutureCanvas();
  });
  $("#goalForm")?.addEventListener("submit", (e) => e.preventDefault());
  $("#goalForm")?.addEventListener("input", () => {
    state.goalTouched = true;
    scheduleGoalPlan();
  });
  $("#eventFilters")?.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { state.futureCanvas.filter = button.dataset.category; $("#eventFilters").querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === button)); renderEventPalette(); }));
  $("#clearCanvas")?.addEventListener("click", () => { state.futureCanvas.events = []; renderFutureCanvas(); showToast("Future canvas cleared"); });
  $("#connectionList")?.querySelectorAll("[data-provider]").forEach((button) => button.addEventListener("click", () => { const provider = button.dataset.provider; state.futureCanvas.connections = state.futureCanvas.connections.includes(provider) ? state.futureCanvas.connections.filter((x) => x !== provider) : [...state.futureCanvas.connections, provider]; renderConnections(); renderCanvasWorld(); showToast(`${provider} ${state.futureCanvas.connections.includes(provider) ? "connected with consent" : "disconnected"}`); }));
  bindSidebarToggle();
}

function futureInviteUrl() {
  const url = new URL(window.location.href);
  url.pathname = pathForView("future");
  url.search = "";
  url.hash = "";
  url.searchParams.set("future", "client");
  url.searchParams.set("scenario", activeTwinId());
  url.searchParams.set("invite", `demo-${activeTwinId()}`);
  return url.toString();
}

function openShareFuture() {
  const d = customerDetails[activeTwinId()] || customerDetails[state.scenarioId];
  const firstName = d?.fullName?.split(" ")[0] || "there";
  $("#shareInitials").textContent = d?.initials || "FY";
  $("#shareClientName").textContent = d?.fullName || "Customer";
  $("#shareClientEmail").value = `${String(d?.fullName || "customer").toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@example.com`;
  $("#shareFutureLink").textContent = futureInviteUrl();
  $("#shareEmailMessage").value = `Hi ${firstName},\n\nI’d like to invite you to try Future You, a private interactive experience that lets you explore different financial choices and see how they could shape the next 12 months.\n\nIt is illustrative, not financial advice, and you can decide whether to share your results with me.\n\nRegards,\nJamie`;
  $("#shareFutureDialog").showModal();
}

function openFutureEmail() {
  const email = $("#shareClientEmail").value.trim();
  if (!email || !$("#shareClientEmail").checkValidity()) {
    $("#shareClientEmail").reportValidity();
    return;
  }
  const subject = "Your private Future You experience";
  const body = `${$("#shareEmailMessage").value.trim()}\n\nPlay Future You:\n${futureInviteUrl()}`;
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $("#shareFutureDialog").close();
  showToast("Email prepared · invitation logged ✓");
}

function openCustomerBook() {
  state.bookQuery = "";
  state.bookFilter = "all";
  const search = $("#customerSearch");
  if (search) search.value = "";
  $("#customerFilters")?.querySelectorAll(".book-filter").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === "all");
  });
  renderCustomerBook();
  search?.focus();
}

function filteredCustomerBook() {
  const q = state.bookQuery;
  const filter = state.bookFilter;
  return state.customerBook.filter((c) => {
    const matchesFilter =
      filter === "all" ||
      c.status.key === filter ||
      c.segment === filter;
    if (!matchesFilter) return false;
    if (!q) return true;
    const hay = `${c.fullName} ${c.occupation} ${c.segment} ${c.status.label} ${c.eventLabel || ""} ${c.phone || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderCustomerBook() {
  const list = filteredCustomerBook();
  const lifeEvents = state.customerBook.filter((c) => c.status.key === "life-event").length;
  const reviewDue = state.customerBook.filter((c) => c.status.key === "review").length;
  $("#customerBookMeta").innerHTML = `<span><strong>${PORTFOLIO_SIZE}</strong> active relationships</span><span><strong>${lifeEvents}</strong> life events</span><span><strong>${reviewDue}</strong> review due</span><span>Showing <strong>${list.length}</strong></span>`;

  if (!list.length) {
    $("#customerBook").innerHTML = `<p class="book-empty">No customers match this search.</p>`;
    return;
  }

  $("#customerBook").innerHTML = list
    .map((c) => {
      const interactive = Boolean(c.scenarioId);
      const aum = money.format(c.aum);
      const contact =
        c.lastContactDays === 0 ? "Today" : c.lastContactDays === 1 ? "1 day ago" : `${c.lastContactDays} days ago`;
      const digits = phoneDigits(c.phone);
      const reach = digits
        ? `<span class="book-reach"><a class="book-reach-btn call" href="${telHref(c.phone)}" title="Call ${escapeHtml(c.fullName)}" aria-label="Call ${escapeHtml(c.fullName)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg></a><a class="book-reach-btn whatsapp" href="${whatsappHref(c.phone)}" target="_blank" rel="noopener noreferrer" title="WhatsApp ${escapeHtml(c.fullName)}" aria-label="WhatsApp ${escapeHtml(c.fullName)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/><path d="M12.04 2C6.5 2 2.01 6.48 2.01 12c0 1.77.46 3.45 1.28 4.92L2 22l5.25-1.38A9.96 9.96 0 0012.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2zm0 18.15c-1.59 0-3.08-.43-4.36-1.18l-.31-.19-3.11.82.83-3.04-.2-.32A8.12 8.12 0 013.9 12c0-4.48 3.65-8.12 8.14-8.12 4.48 0 8.12 3.64 8.12 8.12 0 4.49-3.64 8.15-8.12 8.15z"/></svg></a></span>`
        : `<span class="book-reach"></span>`;
      return `<div class="book-row ${interactive ? "interactive" : ""} ${c.scenarioId === state.scenarioId ? "current" : ""}" data-id="${c.id}" data-scenario="${c.scenarioId || ""}" ${interactive ? 'role="button" tabindex="0"' : 'title="No open life-event workspace for this client yet"'}>
        <span class="book-avatar">${escapeHtml(c.initials)}</span>
        <span class="book-main"><strong>${escapeHtml(c.fullName)}</strong><small>${c.age} · ${escapeHtml(c.occupation)}${c.phone ? ` · ${escapeHtml(c.phone)}` : ""}</small></span>
        <span class="book-seg">${escapeHtml(c.segment)}</span>
        <span class="book-aum">${aum}</span>
        <span class="book-status status-${c.status.key}">${escapeHtml(c.eventLabel || c.status.label)}</span>
        <span class="book-contact">${contact}</span>
        ${reach}
        ${interactive ? '<span class="book-open">Open →</span>' : '<span class="book-open muted">No workspace</span>'}
      </div>`;
    })
    .join("");

  $("#customerBook").querySelectorAll(".book-row").forEach((row) => {
    const open = async () => {
      const scenarioId = row.dataset.scenario;
      if (!scenarioId) {
        showToast("Client is in your book · no life-event workspace yet");
        return;
      }
      await openClient(scenarioId);
      showToast(`Opened ${customerDetails[scenarioId].fullName}'s twin`);
    };
    row.addEventListener("click", (e) => {
      if (e.target.closest(".book-reach-btn")) return;
      open();
    });
    row.addEventListener("keydown", (e) => {
      if (e.target.closest(".book-reach-btn")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function bindSidebarToggle() {
  const sidebar = $("#sidebar");
  const controls = $("#sidebarControls");
  const collapse = $("#sidebarCollapse");
  const expand = $("#sidebarExpand");
  if (!sidebar || !controls || !collapse || !expand) return;

  const setMode = (mode) => {
    document.body.dataset.sidebar = mode;
    sidebar.dataset.mode = mode;
    controls.dataset.mode = mode;
    collapse.setAttribute("aria-label", mode === "fat" ? "Show thin navigation" : "Hide navigation");
    expand.setAttribute("aria-label", mode === "hidden" ? "Show navigation" : "Expand navigation");
  };

  collapse.addEventListener("click", () => {
    const mode = document.body.dataset.sidebar || "thin";
    setMode(mode === "fat" ? "thin" : "hidden");
  });
  expand.addEventListener("click", () => {
    const mode = document.body.dataset.sidebar || "thin";
    setMode(mode === "hidden" ? "thin" : "fat");
  });

  setMode("thin");
}

function openBrief() {
  const d = customerDetails[state.scenarioId];
  const s = state.scenario;
  const ai = state.intelligence.ai;
  const chosen = [...state.selected].map((i) => d.products[i]).filter(Boolean);
  const sim = state.sim;
  const twinBlock = sim
    ? `<section><p class="eyebrow">DIGITAL TWIN OUTLOOK</p><div class="brief-twin"><div><span>12-month uplift</span><strong>${money.format(sim.delta)}</strong></div><div><span>Lowest balance</span><strong>${money.format(sim.low)}</strong><small>${sim.lowDelta === 0 ? "Same as current" : `↑ ${money.format(sim.lowDelta)} vs current`}</small></div><div><span>Risk window</span><strong>${escapeHtml(sim.riskLabel)}</strong><small>${sim.riskAvoided ? "Overdraft avoided with selected solutions" : "Modeled from observed cashflow"}</small></div><div><span>Wellbeing</span><strong>${sim.baseHealth ?? d.health}${sim.projectedHealth && sim.projectedHealth !== (sim.baseHealth ?? d.health) ? ` → ${sim.projectedHealth}` : ""}</strong></div></div></section>`
    : "";

  const contactBlock = d.phone
    ? `<section><p class="eyebrow">REACH CUSTOMER</p><div class="brief-contact"><a class="contact-btn call" href="${telHref(d.phone)}">Call ${escapeHtml(d.phone)}</a><a class="contact-btn whatsapp" href="${whatsappHref(d.phone)}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></section>`
    : "";

  $("#briefContent").innerHTML = `<div class="brief-client"><div class="profile-avatar">${d.initials}</div><div><strong>${d.fullName}</strong><span>${s.event.label} · ${Math.round(state.intelligence.event.confidence * 100)}% confidence</span>${d.phone ? `<span class="brief-phone">${escapeHtml(d.phone)}</span>` : ""}</div></div><section><p class="eyebrow">AI SUMMARY</p><p>${escapeHtml(ai.executiveSummary)}</p></section><section><p class="eyebrow">OPEN WITH</p><p>“${escapeHtml(ai.conversationOpener)}”</p></section>${twinBlock}${contactBlock}<section><p class="eyebrow">EXPLORE</p><ul>${ai.discoveryQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul></section><section><p class="eyebrow">RELEVANT SOLUTIONS</p>${chosen.length ? chosen.map((p, i) => `<div class="brief-product"><b>${i + 1}</b><span><strong>${p.name}</strong><small>${p.impact} · ${p.fit}% fit</small></span></div>`).join("") : "<p>Select at least one solution to include.</p>"}</section><div class="compliance-note">Generated via ${state.intelligence.source}. Keep the conversation needs-led. Confirm circumstances and suitability before presenting any product.</div>`;
  $("#briefDialog").showModal();
}

function openEvidence() {
  const i = state.intelligence;
  const p = i.persona || {};
  const f = i.features || {};
  const evidence = i.event?.evidence || [];
  const txs = i.transactions || [];
  const products = i.products || [];
  const hypo = i.event?.llmHypotheses || [];
  const dropped = i.event?.llmDropped || [];
  const hypoBlock =
    hypo.length || dropped.length
      ? `<section><p class="eyebrow">LLM HYPOTHESIS (LLM_DETECT)</p>${hypo.map((h) => `<p><b>Kept ${escapeHtml(h.type)}</b> — local scorer already supports it. ${escapeHtml(h.why || "")}</p>`).join("")}${dropped.map((h) => `<p><b>Dropped ${escapeHtml(h.type || "")}</b> — ${escapeHtml(h.reason || "not supported by local scorer")}</p>`).join("")}<p class="alternative">LLM never sets confidence. Merchant hints are not applied to the ledger.</p></section>`
      : "";
  $("#evidenceContent").innerHTML = `<div class="pipeline"><span>TRANSACTIONS</span><b>→</b><span>DERIVED FEATURES</span><b>→</b><span>EVENT MODEL</span><b>→</b><span>SUITABILITY</span></div><section><p class="eyebrow">CUSTOMER PERSONA · BANK RECORD</p><div class="persona-facts"><div><span>Employer</span><b>${escapeHtml(p.employer || "—")}</b></div><div><span>Risk profile</span><b>${escapeHtml(p.riskProfile || "—")}</b></div><div><span>Dependants</span><b>${p.dependants ?? "—"}</b></div><div><span>Products held</span><b>${escapeHtml((p.productsHeld || []).join(", ") || "—")}</b></div></div></section><section><p class="eyebrow">MODEL EVIDENCE</p>${evidence
        .map((e) => {
          const pct = e.scoreWeight != null ? Math.max(0, Math.min(100, Math.round(e.scoreWeight * 100))) : null;
          return `<div class="evidence-row"><span><b>${escapeHtml(e.label)}</b><small>${e.source.replaceAll("_", " ")}${pct != null ? ` · +${pct} pts toward confidence` : ""}${e.id ? ` · ${e.id}` : ""}${(e.txnIds || []).length ? ` · tx ${e.txnIds.join(", ")}` : ""}</small>${pct != null ? `<div class="weight-track"><i style="width:${pct}%"></i></div>` : ""}</span><strong>${escapeHtml(e.value)}</strong><em>${Math.round(e.confidence * 100)}%</em></div>`;
        })
        .join("")}<p class="alternative"><b>Score:</b> ${evidence.map((e) => e.scoreWeight || 0).reduce((n, w) => n + w, 0).toFixed(2)} raw → ${Math.round(i.event.confidence * 100)}% displayed. <b>Alternative considered:</b> ${escapeHtml(i.event.alternativeHypothesis || "")}${i.citations?.length ? ` <b>Citations:</b> ${i.citations.join(", ")}` : ""}</p></section>${hypoBlock}<section><p class="eyebrow">SOURCE TRANSACTIONS · ${f.transactionCount || txs.length} RECORDS / ${f.transactionWindowDays || 0} DAYS${f.accountCount ? ` / ${f.accountCount} ACCOUNTS` : ""}</p><div class="transaction-table">${txs.map((t) => `<div><span>${t.date || t.postDate}</span><b>${escapeHtml(t.merchantRaw || t.description)}</b><small>${t.category}${t.channel ? ` · ${t.channel}` : ""}</small><strong class="${t.amount >= 0 ? "credit" : ""}">${t.amount >= 0 ? "+" : ""}${money.format(t.amount)}</strong></div>`).join("")}</div></section><section><p class="eyebrow">SUITABILITY CHECKS</p>${products.map((prod) => `<div class="suitability-row"><b>${escapeHtml(prod.name)}</b><span>${(prod.guardrails || []).map((g) => `${g.passed ? "✓" : "×"} ${g.name}`).join(" · ")}</span><strong>${prod.fit}% fit</strong></div>`).join("") || "<p>No eligible products for this ledger.</p>"}</section><div class="compliance-note">AI source: ${i.source}${i.model ? ` (${i.model})` : ""}. Event confidence is derived from weighted, independent evidence. Product eligibility is rules-based; AI only explains eligible results.</div>`;
  $("#evidenceDialog").showModal();
}

function showToast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2400);
}

async function fetchJson(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function escapeHtml(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
