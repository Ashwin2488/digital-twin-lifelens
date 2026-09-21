import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

let server;
let base;

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

async function json(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json();
  return { response, body };
}

describe("API envelope", () => {
  it("wraps health in data", async () => {
    const { response, body } = await json("/api/health");
    expect(response.status).toBe(200);
    expect(body.data.ok).toBe(true);
    expect(body.error).toBeUndefined();
  });

  it("lists customers with query filters and meta", async () => {
    const { body } = await json("/api/customers?status=life-event&limit=10");
    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.data.customers.every((row) => row.status.key === "life-event")).toBe(true);
  });

  it("returns structured 404s", async () => {
    const { response, body } = await json("/api/customers/not-a-customer");
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("patches overlay fields without rewriting fixtures", async () => {
    const { body } = await json("/api/customers/new-parent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Call after daycare hours", lastContactDays: 1 }),
    });
    expect(body.data.notes).toBe("Call after daycare hours");
    expect(body.data.lastContactDays).toBe(1);
  });

  it("serves experience catalogs from fixtures", async () => {
    const { body } = await json("/api/demo/experience");
    expect(body.data.game.rounds.length).toBeGreaterThan(3);
    expect(body.data.avatar.shop.length).toBeGreaterThan(2);
    expect(body.data.canvas.events.length).toBeGreaterThan(2);
    expect(body.data.chrome.intentChips.length).toBeGreaterThan(0);
  });

  it("serves products from fixtures", async () => {
    const { body } = await json("/api/products");
    expect(body.data.scraped).toBe(false);
    expect(body.data.products.length).toBeGreaterThan(3);
  });
});
