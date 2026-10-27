import { describe, expect, it } from "vitest";
import { planRoute, pointAt } from "../src/zone/route";

describe("shared route home", () => {
  it("puts one landmark at the end of each leg and turns at every corner", () => {
    const plan = planRoute(4);
    expect(plan.points).toHaveLength(5);
    expect(plan.turns).toEqual(["straight", "right", "left", "right"]);
  });
  it("walks from the start to home as progress goes 0 → 1", () => {
    const plan = planRoute(4);
    expect(pointAt(plan, 0)).toEqual(plan.points[0]);
    expect(pointAt(plan, 1)).toEqual(plan.points[4]);
    const mid = pointAt(plan, 0.5);
    expect(mid).toEqual(plan.points[2]);
  });
  it("stays inside the map for any number of landmarks", () => {
    for (let n = 1; n <= 8; n++)
      for (const p of planRoute(n).points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(300);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(190);
      }
  });
});
