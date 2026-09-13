import { ACCOUNTS } from "./sgBankingConventions.js";
import { statementLine } from "./transactionSchema.js";
import { buildLedger } from "./ledger.js";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthsBetween(start, count) {
  const [y0, m0] = start.split("-").map(Number);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(y0, m0 - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function iso(month, day) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function money(rng, min, max) {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

/**
 * Unseen customers: baseline SG cashflow + event overlay + statement noise.
 * Event merchants are intentionally different from the 3 hero ledgers.
 */
export function generateCustomerLedger({
  seed,
  eventType = "none",
  onsetMonth = "2026-03",
  employer = "PACIFIC VENTURES PTE LTD",
  payroll = 5800,
  housing = 2100,
  months = monthsBetween("2026-01", 6),
} = {}) {
  const rng = mulberry32(seed);
  const raw = [];
  const checking = ACCOUNTS.checking.id;
  const savings = ACCOUNTS.savings.id;
  const joint = ACCOUNTS.joint.id;

  for (const month of months) {
    const payday = 24 + Math.floor(rng() * 3);
    const skipPayroll = eventType === "job-loss" && month >= onsetMonth;
    const skipHousingMonth = eventType === "relocation" && month >= onsetMonth && rng() > 0.4;

    if (!skipPayroll) {
      raw.push(statementLine(iso(month, payday), `${employer} GIRO SALARY`, payroll, { channel: "giro" }));
    } else if (month === onsetMonth) {
      raw.push(statementLine(iso(month, 8), `${employer} HR PAYOUT BATCH`, Math.round(payroll * 0.7), { channel: "giro" }));
    }

    if (!skipHousingMonth && housing) {
      raw.push(statementLine(iso(month, 1), "SC MORTGAGEONE GIRO", -housing, { channel: "giro" }));
    }

    raw.push(statementLine(iso(month, 1), "SP SERVICES", -money(rng, 70, 160), { channel: "giro" }));
    raw.push(statementLine(iso(month, 28), "SINGTEL GIRO", -money(rng, 48, 90), { channel: "giro" }));
    raw.push(statementLine(iso(month, 27), "NETFLIX.COM", -17.98));

    const groceryHome = eventType === "none" || rng() > 0.35 ? checking : joint;
    raw.push(statementLine(iso(month, 6 + Math.floor(rng() * 6)), pick(rng, ["NTUC FAIRPRICE JURONG", "SHENG SIONG BEDOK", "COLD STORAGE TIONG BAHRU"]), -money(rng, 70, 210), {
      accountId: groceryHome,
      accountName: groceryHome === joint ? ACCOUNTS.joint.name : ACCOUNTS.checking.name,
    }));
    raw.push(statementLine(iso(month, 18 + Math.floor(rng() * 8)), "NTUC FAIRPRICE JURONG", -money(rng, 55, 140)));

    if (month.slice(5) !== "04") {
      raw.push(statementLine(iso(month, 12 + Math.floor(rng() * 10)), "GRAB *RIDE " + month.replace("-", ""), -money(rng, 9, 24)));
    }
    raw.push(statementLine(iso(month, 9 + Math.floor(rng() * 12)), pick(rng, ["TOAST BOX", "GRAB *FOOD", "DELIVEROO"]), -money(rng, 12, 38)));
  }

  overlayEvent(raw, { eventType, onsetMonth, rng, payroll });

  const grab = raw.find((t) => /GRAB/.test(t.merchantRaw) && t.direction === "debit");
  if (grab) {
    raw.push(statementLine(grab.postDate, grab.merchantRaw, grab.amount, { channel: "card", accountId: grab.accountId }));
    const [y, m, d] = grab.postDate.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    raw.push(statementLine(next, grab.merchantRaw, grab.amount, { channel: "card", direction: "credit" }));
  }

  if (rng() > 0.4) {
    raw.push(statementLine(iso(months[2], 20), "SC ATM WITHDRAWAL", -200, { channel: "atm" }));
  }
  if (rng() > 0.5) {
    raw.push(statementLine(iso(months[1], 26), "TRANSFER TO SAVINGS", -500, { channel: "internal", accountId: checking }));
    raw.push(statementLine(iso(months[1], 26), "TRANSFER FROM EVERYDAY", 500, { channel: "internal", accountId: savings, accountName: ACCOUNTS.savings.name }));
  }

  const lastMonth = months[months.length - 1];
  const trimmed = raw.filter((t) => {
    if (!t.postDate.startsWith(lastMonth)) return true;
    const day = Number(t.postDate.slice(8));
    if (day > 12 && !/SALARY|PAYROLL|MORTGAGE|SP SERVICES/.test(t.merchantRaw)) return false;
    return true;
  });

  return buildLedger(trimmed, {
    [checking]: 6000 + Math.floor(rng() * 8000),
    [savings]: 2000 + Math.floor(rng() * 4000),
    [joint]: eventType === "wedding" || eventType === "home-purchase" ? 1500 : 0,
  });
}

function overlayEvent(raw, { eventType, onsetMonth, rng, payroll }) {
  const d = (day, merchant, amount, extras) =>
    raw.push(statementLine(iso(onsetMonth, day), merchant, amount, extras));

  if (eventType === "new-parent") {
    d(4, "MY FIRST SKOOL", -1100, { channel: "giro" });
    d(12, "PUPSIK BABY", -188);
    const next = nextMonth(onsetMonth);
    raw.push(statementLine(iso(next, 4), "MY FIRST SKOOL", -980, { channel: "giro" }));
    raw.push(statementLine(iso(next, 15), "MAMAWAY", -76));
    raw.push(statementLine(iso(onsetMonth, 20), "KK WOMEN'S HOSPITAL", -410));
  }
  if (eventType === "job-loss") {
    raw.push(statementLine(iso(nextMonth(onsetMonth), 16), "K. LIM CONSULTING GIRO CREDIT", Math.round(payroll * 0.35), { channel: "giro" }));
  }
  if (eventType === "wedding") {
    d(6, "THE ST. REGIS WEDDING", -3800);
    d(11, "GIOIELLI BRIDAL", -1420);
    d(18, "THE WEDDING NICHE", -640);
    d(15, "FAST TFR FROM R. ONG", 700, { channel: "fast" });
    raw.push(statementLine(iso(nextMonth(onsetMonth), 15), "PAYNOW TFR FROM R. ONG", 700, { channel: "paynow" }));
  }
  if (eventType === "home-purchase") {
    d(3, "PROP NEX PTE LTD", -3200);
    d(8, "HDB MORTGAGE GIRO", -2800, { channel: "giro" });
    d(21, "LIAN SENG RENOVATION", -6500, { channel: "fast" });
    raw.push(statementLine(iso(nextMonth(onsetMonth), 9), "IKEA ALEXANDRA", -890));
  }
  if (eventType === "retirement") {
    d(7, "RAFFLES MEDICAL", -220);
    d(22, "GUARDIAN PHARMACY", -64);
  }
  if (eventType === "business-owner") {
    d(5, "NETS SETTLEMENT", 4200, { channel: "giro" });
    d(19, "GRABPAY MERCHANT PAYOUT", 1860, { channel: "giro" });
    d(28, "IRAS GST", -940, { channel: "giro" });
  }
  if (eventType === "medical") {
    d(2, "MOUNT ELIZABETH NOVENA", -8400);
    d(9, "PARKWAY LABORATORY", -380);
    d(16, "GUARDIAN PHARMACY", -128);
    raw.push(statementLine(iso(nextMonth(onsetMonth), 16), "GUARDIAN PHARMACY", -96));
  }
  if (eventType === "relocation") {
    d(5, "SINGAPORE AIRLINES", -1260);
    d(10, "ALLIED PICKFORDS", -2400);
    d(18, "ASIA MOVING", -890);
  }
}

function nextMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
