import { expect, test } from "vitest";
import { nearestDemoPoliceStation } from "../src/zone/demoPolice";

test("the nearest fictional station changes along the simulated route", () => {
  expect(nearestDemoPoliceStation(0).name).toBe("Garden District Police Station");
  expect(nearestDemoPoliceStation(3)).toEqual({
    name: "Library District Police Station",
    distance: 110,
  });
  expect(nearestDemoPoliceStation(6).name).toBe("Riverside Police Station");
});
