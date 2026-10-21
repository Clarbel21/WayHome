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

describe("emergency priority and personalization", () => {
  it("logs SOS immediately from every S0–S5 state and keeps S5 latched", () => {
    const modes = [
      "NORMAL",
      "CHECK_IN",
      "GUIDED_RETURN",
      "REORIENTATION",
      "CAREGIVER_HANDOVER",
      "EMERGENCY_SIMULATED",
    ] as const;
    for (const mode of modes) {
      useStore.setState({ mode });
      useStore.getState().event("SOS");
      expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
      expect(useStore.getState().alerts[0].emergency?.kind).toBe("sos");
    }
    const s = useStore.getState();
    const lastCheck = s.lastCheck;
    for (const event of [
      "CHECK",
      "LOST",
      "GUIDE",
      "OKAY",
      "HELP",
      "REMOVE",
      "DISCONNECT",
      "WALK",
    ] as const) {
      s.event(event);
      expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    }
    expect(useStore.getState().lastCheck).toBe(lastCheck);
  });
  it("snapshots police events, acknowledges separately, and resets without deleting history", () => {
    const s = useStore.getState();
    s.settingsUpdate({ wearer: "Alex Chen", caregiver: "Jamie Chen" });
    useStore.setState({ position: 2 });
    s.event("POLICE", "Presenter requests assistance");
    const alert = useStore.getState().alerts[0];
    expect(alert.emergency).toMatchObject({
      wearer: "Alex Chen",
      reason: "Presenter requests assistance",
      kind: "police",
      safetyStatus: "Simulated SOS",
    });
    expect(alert.emergency?.location).toContain("1.3034, 103.8202");
    expect(alert.emergency?.time).toBeGreaterThan(0);
    s.settingsUpdate({ wearer: "Updated profile" });
    s.read(alert.id);
    expect(
      useStore.getState().alerts[0].emergency?.acknowledgedAt,
    ).toBeUndefined();
    s.acknowledgeEmergency(alert.id);
    expect(useStore.getState().alerts[0].emergency?.acknowledgedBy).toBe(
      "Jamie Chen",
    );
    expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    s.resetEmergency();
    expect(useStore.getState().mode).toBe("NORMAL");
    expect(
      useStore.getState().alerts.find((a) => a.id === alert.id)?.emergency
        ?.wearer,
    ).toBe("Alex Chen");
    s.move();
    expect(useStore.getState().position).toBe(3);
  });
  it("does not move while offline, removed, in S5, or without approved guidance", () => {
    const s = useStore.getState();
    s.event("DISCONNECT");
    s.move();
    expect(useStore.getState().position).toBe(0);
    s.event("WALK");
    s.event("REMOVE");
    s.move();
    expect(useStore.getState().position).toBe(0);
    s.reset();
    s.event("SOS");
    s.nextLandmark();
    s.move();
    expect(useStore.getState().position).toBe(0);
    s.reset();
    useStore.setState({ landmarks: [] });
    s.event("GUIDE");
    s.nextLandmark();
    expect(useStore.getState().mode).toBe("GUIDED_RETURN");
    expect(useStore.getState().position).toBe(0);
  });
  it("validates Unicode names and preserves legacy settings", () => {
    const s = useStore.getState();
    for (const name of [
      "Buddy",
      "Milo",
      "Xiao Bao",
      "Grandpa's Friend",
      "小宝 🌱",
    ]) {
      expect(s.saveCompanionName(name)).toBe(true);
      expect(useStore.getState().settings.companionName).toBe(name);
    }
    expect(s.saveCompanionName("   ")).toBe(false);
    expect(s.saveCompanionName("a".repeat(25))).toBe(false);
    expect(s.saveCompanionName("Buddy\nName")).toBe(false);
    expect(s.saveCompanionName("  Buddy  ")).toBe(true);
    expect(useStore.getState().settings.companionName).toBe("Buddy");
    const merge = useStore.persist.getOptions().merge!;
    const restored = merge(
      { settings: { wearer: "Legacy Alex", voice: true }, mode: "CHECK_IN" },
      useStore.getInitialState(),
    );
    expect(restored.settings.companionName).toBe("Sprout");
    expect(restored.settings.wearer).toBe("Legacy Alex");
    expect(restored.settings.voice).toBe(true);
    expect(restored.mode).toBe("CHECK_IN");
  });
});
