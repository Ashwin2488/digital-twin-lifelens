import { describe, expect, it } from "vitest";
import { evaluateAchievements } from "./achievements.js";

describe("evaluateAchievements", () => {
  it("earns all four when the snapshot clears every threshold", () => {
    const rows = evaluateAchievements({ emergencyFundMonths: 6.5, minBalance: 500, onTrack: true, monthlyNet: 300 });
    expect(rows.map((r) => r.id)).toEqual(["emergency-6", "stayed-liquid", "goal-on-track", "pay-yourself"]);
    expect(rows.every((r) => r.earned)).toBe(true);
  });

  it("earns none when the snapshot misses every threshold", () => {
    const rows = evaluateAchievements({ emergencyFundMonths: 1, minBalance: -200, onTrack: false, monthlyNet: -50 });
    expect(rows.every((r) => !r.earned)).toBe(true);
  });

  it("treats a missing/non-finite minBalance as not liquid, not a crash", () => {
    const rows = evaluateAchievements({});
    const liquid = rows.find((r) => r.id === "stayed-liquid");
    expect(liquid.earned).toBe(false);
    expect(liquid.detail).toBe("No trajectory");
  });

  it("only reads the deterministic snapshot fields, never independent game state", () => {
    const rows = evaluateAchievements({
      emergencyFundMonths: 6,
      minBalance: 0,
      onTrack: true,
      monthlyNet: 1,
      // extraneous game-only fields must not influence achievements
      happiness: 999,
      stress: -999,
    });
    expect(rows.every((r) => r.earned)).toBe(true);
  });
});
