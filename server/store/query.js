function getPath(row, field) {
  return field.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), row);
}

export function applyListQuery(rows, query = {}, { searchFields = [] } = {}) {
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim();
  const segment = String(query.segment || "").trim();
  const event = String(query.event || query.eventLabel || "").trim().toLowerCase();
  const customerId = String(query.customerId || "").trim();

  let out = rows;
  if (q && searchFields.length) {
    out = out.filter((row) =>
      searchFields.some((field) => String(getPath(row, field) ?? "").toLowerCase().includes(q))
    );
  }
  if (status && status !== "all") {
    out = out.filter((row) => row.status?.key === status || row.status === status);
  }
  if (segment) {
    out = out.filter((row) => String(row.segment || "") === segment);
  }
  if (event) {
    out = out.filter((row) => String(row.eventLabel || "").toLowerCase().includes(event));
  }
  if (customerId) {
    out = out.filter((row) => row.customerId === customerId);
  }

  const sort = String(query.sort || "").trim();
  if (sort) {
    const desc = sort.startsWith("-");
    const key = desc ? sort.slice(1) : sort;
    out = [...out].sort((a, b) => {
      const av = getPath(a, key);
      const bv = getPath(b, key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return desc ? bv - av : av - bv;
      return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
  const total = out.length;
  const start = (page - 1) * limit;
  return {
    rows: out.slice(start, start + limit),
    meta: { total, page, limit },
  };
}
