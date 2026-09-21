import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { customerProfiles } from "./customer_profiles.js";
import { getIdentity } from "./identity.js";
import { HOLDINGS } from "./policyHoldings.js";
import { PRODUCT_CATALOG } from "./productCatalog.js";
import { scenarios } from "./scenarios.js";
import { allCreditProfiles } from "./creditProfile.js";
import { getHoldoutSet } from "./holdout.js";
import { getCustomerBook, PORTFOLIO_SIZE } from "./customerBook.js";
import { experienceCatalog } from "./experienceCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "fixtures");

function write(name, value) {
  fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

fs.mkdirSync(outDir, { recursive: true });

const holdout = getHoldoutSet();
const heroIds = Object.keys(customerProfiles);
const identities = {};
for (const id of heroIds) identities[id] = getIdentity(id);
for (const row of holdout) identities[row.id] = getIdentity(row.id);

const ledgers = {};
for (const id of heroIds) {
  ledgers[id] = {
    id,
    split: "hero",
    transactions: customerProfiles[id].transactions,
  };
}
for (const row of holdout) {
  ledgers[row.id] = {
    id: row.id,
    split: "holdout",
    groundTruth: row.groundTruth,
    employer: row.employer,
    transactionCount: row.transactionCount,
    accounts: row.accounts,
    transactions: row.transactions,
  };
}

const profiles = {};
for (const [id, profile] of Object.entries(customerProfiles)) {
  profiles[id] = {
    id,
    persona: profile.persona,
    baseline: profile.baseline,
    candidates: profile.candidates,
  };
}

write("products.json", PRODUCT_CATALOG);
write("scenarios.json", scenarios);
write("identities.json", identities);
write("holdings.json", HOLDINGS);
write("credit-profiles.json", allCreditProfiles());
write("customer-book.json", { portfolioSize: PORTFOLIO_SIZE, customers: getCustomerBook() });
write("customer-profiles.json", profiles);
write("ledgers.json", ledgers);
write("experience.json", experienceCatalog);
write("holdout-summary.json", {
  size: holdout.length,
  ids: holdout.map((row) => row.id),
  byType: holdout.reduce((acc, row) => {
    const type = row.groundTruth.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}),
});

console.log(`Wrote fixtures to ${outDir}`);
