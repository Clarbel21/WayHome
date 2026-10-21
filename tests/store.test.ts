import { beforeEach, describe, expect, it } from "vitest";
import { transition, useStore, initialLandmarks } from "../src/store";
beforeEach(() => {
  useStore.getState().reset();
  useStore.setState({ landmarks: initialLandmarks });
});
describe("deterministic wearable simulation", () => {
  it("moves through the full support journey", () => {
    const s = useStore.getState();
    s.event("WALK");
    expect(useStore.getState().mode).toBe("NORMAL");
    s.event("CHECK");
    expect(useStore.getState().mode).toBe("CHECK_IN");
    s.event("LOST");
    expect(useStore.getState().position).toBe(2);
    expect(useStore.getState().mode).toBe("REORIENTATION");
    s.event("GUIDE");
    expect(useStore.getState().mode).toBe("GUIDED_RETURN");
    s.event("HELP");
    expect(useStore.getState().mode).toBe("CAREGIVER_HANDOVER");
    s.event("SOS");
    expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    expect(useStore.getState().alerts[0].urgent).toBe(true);
  });
  it("records disconnects without silently clearing a simulated SOS", () => {
    expect(transition("EMERGENCY_SIMULATED", "DISCONNECT")).toBe(
      "EMERGENCY_SIMULATED",
    );
    const s = useStore.getState();
    s.event("DISCONNECT");
    expect(useStore.getState().connected).toBe(false);
    s.event("REMOVE");
    expect(useStore.getState().worn).toBe(false);
    expect(useStore.getState().alerts).toHaveLength(2);
  });
  it("only advances through approved landmarks and confirms home", () => {
    const s = useStore.getState();
    s.saveLandmark({ ...initialLandmarks[0], approved: false });
    s.event("GUIDE");
    s.nextLandmark();
    expect(useStore.getState().guideIndex).toBe(1);
    s.nextLandmark();
    s.nextLandmark();
    expect(useStore.getState().mode).toBe("NORMAL");
    expect(useStore.getState().position).toBe(6);
  });
  it("supports landmark CRUD, alert reads, and preserves profile on reset", () => {
    const s = useStore.getState();
    s.settingsUpdate({ wearer: "Taylor" });
    s.saveLandmark({
      id: "new",
      name: "Cafe",
      photo: "/images/bakery.svg",
      instruction: "Walk to the door.",
      approved: true,
    });
    expect(useStore.getState().landmarks).toHaveLength(5);
    s.deleteLandmark("new");
    expect(useStore.getState().landmarks).toHaveLength(4);
    s.event("CHECK");
    s.read();
    expect(useStore.getState().alerts.every((a) => a.read)).toBe(true);
    s.reset();
    expect(useStore.getState().alerts).toHaveLength(0);
    expect(useStore.getState().settings.wearer).toBe("Taylor");
  });
});
