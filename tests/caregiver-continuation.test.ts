import { beforeEach, expect, it } from "vitest";
import { useStore } from "../src/store";
import { useMemory, safetyReady, sampleEntries } from "../src/memory/store";
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  useMemory.setState({
    entries: sampleEntries,
    stage: "invite",
    session: null,
    history: [],
    growth: [],
  });
});
it("separates incident resolution from pending device review and permits local memories", () => {
  const s = useStore.getState();
  s.event("REMOVE");
  s.event("DISCONNECT");
  s.simulateScenario("gps");
  s.event("SOS");
  s.resetEmergency();
  const incident = useStore.getState().incident!;
  expect(s.resolveIncident(incident.id, incident.revision, false)).toBe(false);
  expect(s.resolveIncident(incident.id, incident.revision, true)).toBe(true);
  const resolved = useStore.getState();
  expect(resolved.connected).toBe(false);
  expect(resolved.worn).toBe(false);
  expect(resolved.signals.gpsConfidence).toBe(0.35);
  expect(resolved.incident?.deviceReviewPending).toBe(true);
  expect(safetyReady()).toBe(true);
  expect(useMemory.getState().start("faces")).toBe(true);
  s.move();
  expect(useStore.getState().position).toBe(0);
  s.event("GUIDE");
  expect(useStore.getState().mode).toBe("CHECK_IN");
  expect(safetyReady()).toBe(false);
});
it("a new SOS or new device warning revokes reviewed local continuation", () => {
  const s = useStore.getState();
  s.event("DISCONNECT");
  s.event("SOS");
  s.resetEmergency();
  let incident = useStore.getState().incident!;
  s.resolveIncident(incident.id, incident.revision, true);
  expect(safetyReady()).toBe(true);
  s.event("SOS");
  expect(safetyReady()).toBe(false);
  expect(s.resolveIncident(incident.id, incident.revision, true)).toBe(false);
  s.resetEmergency();
  incident = useStore.getState().incident!;
  s.resolveIncident(incident.id, incident.revision, true);
  expect(safetyReady()).toBe(true);
  s.simulateScenario("inactivity");
  expect(safetyReady()).toBe(false);
});
