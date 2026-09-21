/** Deterministic Priority Banking book — ~150 relationships is typical for an SC Priority RM. */
const FIRST = [
  "Wei Ming", "Siti", "Raj", "Mei Ling", "Arun", "Hui Wen", "Marcus", "Nadia",
  "Kenji", "Farah", "Lucas", "Aisha", "Benjamin", "Priya", "Ethan", "Sofia",
  "Jonah", "Lina", "Adrian", "Yasmin", "Cheng", "Hannah", "Omar", "Jia Hui",
  "Ryan", "Ananya", "Zachary", "Nurul", "Kai", "Isabelle", "Dev", "Grace",
  "Samuel", "Mei Xin", "Victor", "Leila", "Nicholas", "Rina", "Aaron", "Tanya",
];
const LAST = [
  "Tan", "Lim", "Wong", "Ng", "Lee", "Ong", "Chua", "Goh", "Koh", "Teo",
  "Rahman", "Singh", "Patel", "Chen", "Liu", "Fernandez", "Cruz", "Ali",
  "Ibrahim", "Chong", "Yeo", "Sim", "Ho", "Lau", "Dass", "Pereira",
];
const OCCUPATIONS = [
  "Software Engineer", "Finance Manager", "Marketing Lead", "Consultant",
  "Physician", "Architect", "Teacher", "Accountant", "UX Designer",
  "Sales Director", "Data Analyst", "HR Business Partner", "Pharmacist",
  "Civil Engineer", "Operations Manager",
];
const SEGMENTS = ["Priority", "Priority", "Priority", "Premium", "Premium", "Private"];
const STATUSES = [
  { key: "stable", label: "Stable" },
  { key: "stable", label: "Stable" },
  { key: "stable", label: "Stable" },
  { key: "review", label: "Review due" },
  { key: "new", label: "New relationship" },
];

const LIFE_EVENT_CUSTOMERS = [
  {
    id: "new-parent",
    scenarioId: "new-parent",
    initials: "AM",
    fullName: "Amira Malik",
    age: 34,
    occupation: "Product Director",
    segment: "Priority",
    aum: 186400,
    lastContactDays: 12,
    phone: "+65 9123 8841",
    status: { key: "life-event", label: "Life event" },
    eventLabel: "New baby and daycare",
    notes: "",
  },
  {
    id: "job-loss",
    scenarioId: "job-loss",
    initials: "DT",
    fullName: "Daniel Tan",
    age: 42,
    occupation: "Operations Lead",
    segment: "Priority",
    aum: 312800,
    lastContactDays: 5,
    phone: "+65 9782 3306",
    status: { key: "life-event", label: "Life event" },
    eventLabel: "Income transition",
    notes: "",
  },
  {
    id: "wedding",
    scenarioId: "wedding",
    initials: "PS",
    fullName: "Priya Shah",
    age: 31,
    occupation: "Legal Counsel",
    segment: "Priority",
    aum: 228600,
    lastContactDays: 8,
    phone: "+65 9014 5572",
    status: { key: "life-event", label: "Life event" },
    eventLabel: "Getting married",
    notes: "",
  },
  {
    id: "h-hp-01",
    scenarioId: "h-hp-01",
    initials: "WL",
    fullName: "Wei Lin Chen",
    age: 38,
    occupation: "Engineer, Greenfield Engr",
    segment: "Priority",
    aum: 164200,
    lastContactDays: 3,
    phone: "+65 8123 4011",
    status: { key: "life-event", label: "Life event" },
    eventLabel: "Home purchase / renovation",
    notes: "",
  },
];

function hash(n) {
  let x = (n + 1) * 2654435761;
  x ^= x >>> 16;
  return Math.abs(x);
}

function initialsFrom(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function phoneFromHash(h) {
  const local = String(80000000 + (h % 19999999)).padStart(8, "0");
  return `+65 ${local.slice(0, 4)} ${local.slice(4)}`;
}

function buildFillerCustomers(count) {
  const used = new Set(LIFE_EVENT_CUSTOMERS.map((c) => c.fullName));
  const list = [];
  let i = 0;
  while (list.length < count) {
    const h = hash(i);
    const first = FIRST[h % FIRST.length];
    const last = LAST[(h >> 5) % LAST.length];
    const fullName = `${first} ${last}`;
    i += 1;
    if (used.has(fullName)) continue;
    used.add(fullName);
    const aum = 45000 + (h % 680) * 1000;
    const status = STATUSES[h % STATUSES.length];
    list.push({
      id: `c-${list.length + 1}`,
      scenarioId: null,
      initials: initialsFrom(fullName),
      fullName,
      age: 28 + (h % 32),
      occupation: OCCUPATIONS[h % OCCUPATIONS.length],
      segment: SEGMENTS[h % SEGMENTS.length],
      aum,
      lastContactDays: 3 + (h % 55),
      phone: phoneFromHash(h),
      status,
      eventLabel: null,
      notes: "",
    });
  }
  return list;
}

export const PORTFOLIO_SIZE = 148;

export function getCustomerBook() {
  const fillers = buildFillerCustomers(PORTFOLIO_SIZE - LIFE_EVENT_CUSTOMERS.length);
  return [...LIFE_EVENT_CUSTOMERS, ...fillers].sort((a, b) => {
    const rank = { "life-event": 0, review: 1, new: 2, stable: 3 };
    const ra = rank[a.status.key] ?? 9;
    const rb = rank[b.status.key] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.fullName.localeCompare(b.fullName);
  });
}
