import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../src/store";
import {
  clearSignals,
  evaluateSignals,
  inferWear,
  wearPreset,
  unknownInputs,
  verificationBlockers,
  type Attachment,
} from "../src/services/safety";
import { sampleEntries, useMemory } from "../src/memory/store";
import { suggestActivity } from "../src/memory/suggestions";
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  useMemory.setState({
    entries: sampleEntries,
    session: null,
    history: [],
    growth: [],
    preferences: useMemory.getInitialState().preferences,
  });
});
describe("incident resolution requires verification, not acknowledgment", () => {
  it("preserves removed/disconnected evidence across acknowledgment and resolution requests", () => {
    const s = useStore.getState();
    s.event("REMOVE");
    s.event("DISCONNECT");
    s.event("SOS");
    s.acknowledgeEmergency(useStore.getState().alerts[0].id);
    expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    s.resetEmergency("Caregiver reviewing the incident");
    let current = useStore.getState();
    expect(current.connected).toBe(false);
    expect(current.worn).toBe(false);
    expect(current.wearStatus).toBe("unknown");
    expect(current.incident?.stage).toBe("awaiting_verification");
    expect(
      s.verifyIncident(current.incident!.id, current.incident!.revision, true),
    ).toBe(false);
    s.setConnection(true);
    expect(useStore.getState().wearStatus).toBe("unknown");
    s.observeWear(wearPreset("wristwatch", "possibly_removed"));
    expect(verificationBlockers(useStore.getState()).length).toBeGreaterThan(0);
    s.observeWear(wearPreset("wristwatch", "likely_worn"));
    current = useStore.getState();
    expect(
      s.verifyIncident(current.incident!.id, current.incident!.revision, false),
    ).toBe(false);
    const check = current.lastCheck;
    expect(
      s.verifyIncident(current.incident!.id, current.incident!.revision, true),
    ).toBe(true);
    expect(useStore.getState().lastCheck).toBe(check);
    expect(useStore.getState().wearInputs).toEqual(current.wearInputs);
    expect(useStore.getState().incident?.stage).toBe("resolved");
  });
  it("gives a new SOS precedence over pending verification and all scenario/input updates", () => {
    const s = useStore.getState();
    s.event("SOS");
    s.resetEmergency();
    const pending = useStore.getState().incident!;
    s.event("SOS");
    expect(useStore.getState().incident?.stage).toBe("active");
    expect(s.verifyIncident(pending.id, pending.revision, true)).toBe(false);
    for (const scenario of [
      "deviation",
      "inactivity",
      "missed",
      "gps",
    ] as const) {
      s.simulateScenario(scenario);
      expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    }
    s.observeWear(wearPreset("wristwatch", "likely_worn"));
    s.setSignals(clearSignals);
    s.event("OKAY");
    expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    expect(
      useStore.getState().alerts.filter((a) => a.emergency?.kind === "sos"),
    ).toHaveLength(2);
  });
  it("does not allow full demo reset to bypass an unresolved SOS", () => {
    const s = useStore.getState();
    s.event("REMOVE");
    s.event("DISCONNECT");
    s.event("SOS");
    s.reset();
    expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    expect(useStore.getState().connected).toBe(false);
    expect(useStore.getState().worn).toBe(false);
  });
  it("migrates legacy binary wear conservatively and keeps a legacy S5 active", () => {
    const restored = useStore.persist.getOptions().merge!(
      { mode: "EMERGENCY_SIMULATED", worn: true, connected: false },
      useStore.getInitialState(),
    );
    expect(restored.incident?.stage).toBe("active");
    expect(restored.mode).toBe("EMERGENCY_SIMULATED");
    expect(restored.wearStatus).toBe("unknown");
    expect(restored.worn).toBe(false);
  });
});
describe("deterministic scenarios and uncertainty", () => {
  it("tests thresholds and suppresses deviation claims under low GPS confidence", () => {
    expect(
      evaluateSignals({
        ...clearSignals,
        deviationMeters: 99,
        inactiveMinutes: 14,
        missedCheckIns: 1,
      }),
    ).toEqual([]);
    expect(
      evaluateSignals({
        ...clearSignals,
        deviationMeters: 100,
        inactiveMinutes: 15,
        missedCheckIns: 2,
      }).map((r) => r.key),
    ).toEqual(["missed", "deviation", "inactivity"]);
    expect(
      evaluateSignals({
        ...clearSignals,
        deviationMeters: 500,
        gpsConfidence: 0.59,
      }).map((r) => r.key),
    ).toEqual(["gps"]);
    expect(evaluateSignals({ ...clearSignals, gpsConfidence: 0.6 })).toEqual(
      [],
    );
  });
  it.each([
    ["deviation", "REORIENTATION"],
    ["inactivity", "CHECK_IN"],
    ["missed", "CAREGIVER_HANDOVER"],
    ["gps", "CHECK_IN"],
  ] as const)(
    "%s produces the expected state and understandable reason",
    (scenario, mode) => {
      useStore.getState().simulateScenario(scenario);
      expect(useStore.getState().mode).toBe(mode);
      expect(useStore.getState().alerts[0].title).toMatch(/threshold|60%/);
      expect(useStore.getState().incident).toBeNull();
    },
  );
  it.each(["wristwatch", "pendant", "clip"] as Attachment[])(
    "%s distinguishes every uncertainty status and clears observations on attachment change",
    (attachment) => {
      const s = useStore.getState();
      s.setAttachment(attachment);
      expect(useStore.getState().wearStatus).toBe("unknown");
      for (const status of [
        "likely_worn",
        "possibly_removed",
        "not_worn",
        "unknown",
      ] as const) {
        expect(inferWear(attachment, wearPreset(attachment, status))).toBe(
          status,
        );
      }
      expect(inferWear(attachment, unknownInputs)).toBe("unknown");
      expect(
        inferWear(attachment, wearPreset(attachment, "likely_worn"), false),
      ).toBe("unknown");
      s.observeWear(wearPreset(attachment, "likely_worn"));
      s.event("OKAY");
      expect(useStore.getState().mode).toBe("NORMAL");
      s.event("DISCONNECT");
      s.event("WALK");
      expect(useStore.getState().connected).toBe(false);
      expect(useStore.getState().worn).toBe(false);
    },
  );
  it("keeps missed-check-in review active through routine check-in events", () => {
    const s = useStore.getState();
    s.simulateScenario("missed");
    s.event("CHECK");
    expect(useStore.getState().mode).toBe("CAREGIVER_HANDOVER");
    s.event("OKAY");
    expect(useStore.getState().mode).toBe("CAREGIVER_HANDOVER");
  });
  it("blocks guidance and incident resolution with low GPS confidence until observations are cleared", () => {
    const s = useStore.getState();
    s.simulateScenario("gps");
    s.event("GUIDE");
    expect(useStore.getState().mode).toBe("CHECK_IN");
    s.event("SOS");
    s.resetEmergency();
    const incident = useStore.getState().incident!;
    expect(s.verifyIncident(incident.id, incident.revision, true)).toBe(false);
    s.setSignals({ ...clearSignals });
    expect(s.verifyIncident(incident.id, incident.revision, true)).toBe(true);
  });
});
describe("optional reminiscence suggestions", () => {
  it("uses explicit music preference and approved content, without modifying state or starting an activity", () => {
    const preferences = {
      ...useMemory.getState().preferences,
      music: "Piano",
      preferred: ["music"] as const,
    };
    const entries = [
      ...sampleEntries,
      {
        ...sampleEntries[2],
        id: "piano",
        title: "Quiet Piano",
        approved: true,
      },
    ];
    const before = useMemory.getState();
    const result = suggestActivity(
      entries,
      { ...preferences, preferred: ["music"] },
      [],
    );
    expect(result?.entryId).toBe("piano");
    expect(useMemory.getState()).toBe(before);
    expect(
      suggestActivity(
        entries.map((e) => ({ ...e, approved: false })),
        { ...preferences, preferred: ["music"] },
        [],
      ),
    ).toBeNull();
  });
  it("offers variety after a skip while keeping the skipped activity available", () => {
    const m = useMemory.getState();
    m.start("faces");
    m.skip();
    const current = useMemory.getState();
    const suggestion = suggestActivity(
      current.entries,
      current.preferences,
      current.history,
    );
    expect(suggestion?.kind).not.toBe("faces");
    expect(current.preferences.preferred).toContain("faces");
    expect(current.growth).toEqual([]);
    expect(current.session).toBeNull();
  });
});
