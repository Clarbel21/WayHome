import { beforeEach, describe, expect, it } from "vitest";
import { initialLandmarks } from "../src/store";
import {
  buildSession,
  familiarityLevel,
  isCorrect,
  neighbourhood,
  requeue,
  usePractice,
} from "../src/memory/practice";
import { planRoute } from "../src/zone/route";

beforeEach(() => usePractice.getState().clear());

describe("way-home practice", () => {
  const route = initialLandmarks;
  it("spots every place in walk order first, then turns, then what comes next", () => {
    const q = buildSession(route, 10, 42);
    expect(q.slice(0, 4).map((x) => [x.kind, x.landmarkId])).toEqual([
      ["spot", "garden"],
      ["spot", "bakery"],
      ["spot", "library"],
      ["spot", "home"],
    ]);
    expect(q[4]).toMatchObject({ kind: "turn", landmarkId: "garden" });
    expect(q[7]).toMatchObject({
      kind: "next",
      landmarkId: "bakery",
      afterId: "garden",
    });
    for (const item of q)
      expect(route.map((l) => l.id)).toContain(item.landmarkId);
  });
  it("turn answers match the live guidance route", () => {
    const turns = planRoute(route.length).turns;
    const q = buildSession(route, 10, 1).filter((x) => x.kind === "turn");
    q.forEach((item) => {
      const i = route.findIndex((l) => l.id === item.landmarkId);
      expect(item.kind === "turn" && item.answer).toBe(turns[i + 1]);
    });
  });
  it("photo questions offer the answer plus two different look-alikes", () => {
    const pool = new Set([
      ...route.map((l) => l.id),
      ...neighbourhood.map((p) => p.id),
    ]);
    for (const item of buildSession(route, 10, 7))
      if (item.kind !== "turn") {
        expect(item.options).toHaveLength(3);
        expect(new Set(item.options).size).toBe(3);
        expect(item.options).toContain(item.landmarkId);
        item.options.forEach((o) => expect(pool.has(o)).toBe(true));
      }
  });
  it("brings a hinted question back a little later (spaced retrieval)", () => {
    const q = buildSession(route, 6, 3);
    const again = requeue(q, 1);
    expect(again).toHaveLength(7);
    expect(again[4]).toBe(q[1]);
  });
  it("checks answers and tracks landmark familiarity without scoring the person", () => {
    const [first] = buildSession(route, 1, 5);
    expect(isCorrect(first, first.landmarkId)).toBe(true);
    const p = usePractice.getState();
    expect(familiarityLevel(p.familiarity.garden)).toBe("new");
    p.record("garden", false);
    expect(familiarityLevel(usePractice.getState().familiarity.garden)).toBe(
      "learning",
    );
    p.record("garden", true);
    expect(familiarityLevel(usePractice.getState().familiarity.garden)).toBe(
      "getting",
    );
    p.record("garden", true);
    expect(familiarityLevel(usePractice.getState().familiarity.garden)).toBe(
      "well",
    );
  });
  it("handles an empty route", () => {
    expect(buildSession([], 5)).toEqual([]);
  });
});
