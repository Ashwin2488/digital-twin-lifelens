import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../../data/fixtures");

const FALLBACK_AVATAR = { coins: 120, owned: [], equipped: [], colour: "sky" };
const PATCHABLE_CUSTOMER = new Set(["status", "lastContactDays", "notes"]);

function readJson(name) {
  const file = path.join(fixturesDir, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing fixture ${name}. Run \`npm run seed\`.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let seed = null;
let overlay = null;

function clone(value) {
  return structuredClone(value);
}

export function loadStore() {
  const book = readJson("customer-book.json");
  seed = {
    products: readJson("products.json"),
    scenarios: readJson("scenarios.json"),
    identities: readJson("identities.json"),
    holdings: readJson("holdings.json"),
    creditProfiles: readJson("credit-profiles.json"),
    customerBook: book.customers,
    portfolioSize: book.portfolioSize,
    profiles: readJson("customer-profiles.json"),
    ledgers: readJson("ledgers.json"),
    holdoutSummary: readJson("holdout-summary.json"),
    experience: readJson("experience.json"),
  };
  resetOverlay();
  return seed;
}

export function resetOverlay() {
  overlay = {
    customers: new Map(),
    avatar: clone(seed?.experience?.avatar?.start || FALLBACK_AVATAR),
  };
}

export function ensureLoaded() {
  if (!seed) loadStore();
  return seed;
}

export function getPortfolioSize() {
  return ensureLoaded().portfolioSize;
}

export function listCustomerRecords() {
  const { customerBook } = ensureLoaded();
  return customerBook.map((row) => {
    const patch = overlay.customers.get(row.id);
    return patch ? { ...row, ...patch, status: patch.status || row.status } : { ...row };
  });
}

export function getCustomerRecord(id) {
  return listCustomerRecords().find((row) => row.id === id) || null;
}

export function patchCustomerRecord(id, body = {}) {
  const current = getCustomerRecord(id);
  if (!current) return null;
  const next = { ...overlay.customers.get(id) };
  if (body.status) {
    if (typeof body.status === "string") {
      next.status = { key: body.status, label: body.status };
    } else if (body.status.key) {
      next.status = { key: body.status.key, label: body.status.label || body.status.key };
    }
  }
  if (body.lastContactDays != null) next.lastContactDays = Number(body.lastContactDays);
  if (body.notes != null) next.notes = String(body.notes);
  overlay.customers.set(id, next);
  return getCustomerRecord(id);
}

export function getIdentityRecord(id) {
  return ensureLoaded().identities[id] || null;
}

export function getHoldingsRecord(id) {
  return ensureLoaded().holdings[id] || [];
}

export function getCreditRecord(id) {
  return ensureLoaded().creditProfiles.find((row) => row.customerId === id) || null;
}

export function getLedgerRecord(id) {
  return ensureLoaded().ledgers[id] || null;
}

export function getProfileRecord(id) {
  return ensureLoaded().profiles[id] || null;
}

export function listScenarios() {
  return ensureLoaded().scenarios;
}

export function getScenarioRecord(id) {
  return listScenarios().find((row) => row.id === id) || null;
}

export function listProducts() {
  return ensureLoaded().products;
}

export function getHoldoutSummaryRecord() {
  return ensureLoaded().holdoutSummary;
}

export function getExperienceCatalog() {
  return clone(ensureLoaded().experience);
}

export function getAvatar() {
  ensureLoaded();
  return clone(overlay.avatar);
}

export function patchAvatar(body = {}) {
  ensureLoaded();
  overlay.avatar = {
    ...overlay.avatar,
    ...(body.coins != null ? { coins: Number(body.coins) } : {}),
    ...(Array.isArray(body.owned) ? { owned: body.owned } : {}),
    ...(Array.isArray(body.equipped) ? { equipped: body.equipped } : {}),
    ...(body.colour ? { colour: String(body.colour) } : {}),
  };
  return getAvatar();
}

export function resetDemoStore() {
  resetOverlay();
  return { avatar: getAvatar() };
}

export { PATCHABLE_CUSTOMER, FALLBACK_AVATAR as DEFAULT_AVATAR };
