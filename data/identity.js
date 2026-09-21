/**
 * Synthetic identity. idMasked is never an NRIC-shaped string.
 */
const HEROES = {
  "new-parent": identity("new-parent", "Amira Malik", "1992-03-14", "SG-DEMO-AM34", "Singaporean", "+65 9123 8841", "amira.malik@example.com", "Priority", "2019-05-12"),
  "job-loss": identity("job-loss", "Daniel Tan", "1984-07-02", "SG-DEMO-DT42", "Singaporean", "+65 9782 3306", "daniel.tan@example.com", "Priority", "2016-08-01"),
  wedding: identity("wedding", "Priya Shah", "1995-11-21", "SG-DEMO-PS31", "Singaporean", "+65 9014 5572", "priya.shah@example.com", "Priority", "2021-01-18"),
};

const HOLDOUT_NAMES = {
  "h-np-01": "Mei Ling Ong",
  "h-np-02": "Arun Krishnan",
  "h-np-03": "Hui Wen Tan",
  "h-jl-01": "Marcus Goh",
  "h-jl-02": "Nadia Rahman",
  "h-jl-03": "Kenji Lim",
  "h-wd-01": "Farah Ibrahim",
  "h-wd-02": "Lucas Chen",
  "h-wd-03": "Aisha Wong",
  "h-hp-01": "Wei Lin Chen",
  "h-hp-02": "Benjamin Ho",
  "h-rt-01": "Ethan Teo",
  "h-rt-02": "Sofia Pereira",
  "h-bo-01": "Jonah Cruz",
  "h-bo-02": "Lina Dass",
  "h-md-01": "Adrian Koh",
  "h-md-02": "Yasmin Ali",
  "h-rl-01": "Cheng Liu",
  "h-rl-02": "Hannah Fernandez",
  "h-none-01": "Omar Sim",
  "h-none-02": "Jia Hui Lau",
  "h-none-03": "Ryan Patel",
  "h-none-04": "Ananya Singh",
  "h-none-05": "Zachary Yeo",
};

export function getIdentity(customerId) {
  if (HEROES[customerId]) return HEROES[customerId];
  if (!/^h-/.test(customerId)) return null;
  const fullName = HOLDOUT_NAMES[customerId] || customerId;
  const digits = Number(String(customerId).replace(/\D/g, "") || "1");
  const year = 1972 + (digits % 28);
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const local = String(80000000 + ((digits * 7919) % 19999999)).padStart(8, "0");
  return identity(
    customerId,
    fullName,
    `${year}-0${1 + (digits % 9)}-1${digits % 9}`,
    `SG-DEMO-${initials}${String(digits).slice(-2)}`,
    "Singaporean",
    `+65 ${local.slice(0, 4)} ${local.slice(4)}`,
    `${customerId}@example.com`,
    "Priority",
    "2020-06-01"
  );
}

export function listIdentities() {
  return [...Object.values(HEROES)];
}

export function ageFromDob(dob, asOfYear = 2026) {
  const year = Number(String(dob || "").slice(0, 4));
  return Number.isFinite(year) ? asOfYear - year : null;
}

function identity(id, fullName, dob, idMasked, nationality, phone, email, segment, onboardedDate) {
  return {
    id,
    fullName,
    dob,
    idMasked,
    nationality,
    contact: { phone, email, address: "Singapore", residencyStatus: "Citizen" },
    kyc: { onboardedDate, segment },
    consent: { marketing: false, dataSharing: true, biometric: false },
  };
}
