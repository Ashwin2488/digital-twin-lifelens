import { describe, expect, it } from "vitest";
import { applyListQuery } from "./query.js";

const rows = [
  { id: "a", fullName: "Amira Malik", segment: "Priority", status: { key: "life-event" }, eventLabel: "New baby", aum: 10 },
  { id: "b", fullName: "Daniel Tan", segment: "Premium", status: { key: "review" }, eventLabel: null, aum: 30 },
  { id: "c", fullName: "Priya Shah", segment: "Priority", status: { key: "stable" }, eventLabel: "Wedding", aum: 20 },
];

describe("applyListQuery", () => {
  it("filters by search, status, and segment", () => {
    const { rows: found, meta } = applyListQuery(rows, { q: "amira", status: "life-event", segment: "Priority" }, {
      searchFields: ["fullName", "eventLabel"],
    });
    expect(found.map((r) => r.id)).toEqual(["a"]);
    expect(meta.total).toBe(1);
  });

  it("paginates and sorts", () => {
    const { rows: found, meta } = applyListQuery(rows, { sort: "-aum", page: 1, limit: 2 });
    expect(found.map((r) => r.id)).toEqual(["b", "c"]);
    expect(meta).toEqual({ total: 3, page: 1, limit: 2 });
  });
});
