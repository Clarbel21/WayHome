import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ZONE,
  clampRadius,
  ladderLevel,
  legTarget,
  useZone,
} from "../src/zone/store";

beforeEach(() => {
  useZone.setState({ ...DEFAULT_ZONE });
  useZone.getState().reset();
});

describe("safe-zone simulation", () => {
  it("climbs the escalation ladder at the configured simulated minutes", () => {
    expect(ladderLevel(0, DEFAULT_ZONE)).toBe(1);
    expect(ladderLevel(4.9, DEFAULT_ZONE)).toBe(1);
    expect(ladderLevel(5, DEFAULT_ZONE)).toBe(2);
    expect(ladderLevel(10, DEFAULT_ZONE)).toBe(3);
    expect(ladderLevel(20, DEFAULT_ZONE)).toBe(4);
  });
  it("splits the walk home evenly across landmarks and ends at home", () => {
    expect(legTarget(600, 0, 4)).toBe(450);
    expect(legTarget(600, 1, 4)).toBe(300);
    expect(legTarget(600, 3, 4)).toBe(0);
    expect(legTarget(600, 0, 0)).toBe(0);
  });
  it("keeps the radius in range and the ladder ordered", () => {
    expect(clampRadius(20)).toBe(100);
    expect(clampRadius(9999)).toBe(1500);
    useZone.getState().setSettings({
      notifyPrimaryMin: 8,
      callSecondaryMin: 4,
      emergencyMin: 2,
    });
    const z = useZone.getState();
    expect(z.notifyPrimaryMin).toBeLessThan(z.callSecondaryMin);
    expect(z.callSecondaryMin).toBeLessThan(z.emergencyMin);
  });
  it("wandering heads past the radius; lost jumps far; accepting freezes the start", () => {
    useZone.getState().setRadius(400);
    useZone.getState().wanderOut();
    expect(useZone.getState().wanderTo).toBeGreaterThan(400);
    useZone.getState().reset();
    useZone.getState().lostFar();
    expect(useZone.getState().distanceM).toBeGreaterThan(800);
    useZone.getState().acceptGuide();
    expect(useZone.getState().guideStartM).toBe(useZone.getState().distanceM);
    expect(useZone.getState().phase).toBe("walking");
  });
  it("declining hides the prompt and schedules a gentle re-ask", () => {
    useZone.setState({ prompt: true, active: true });
    useZone.getState().decline();
    expect(useZone.getState().prompt).toBe(false);
    expect(useZone.getState().reaskAt).toBeGreaterThan(Date.now());
  });
});
