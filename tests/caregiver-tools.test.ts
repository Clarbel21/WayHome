import { beforeEach, expect, test } from "vitest";
import { useStore, initialLandmarks } from "../src/store";
import {
  normalizePhone,
  useCare,
  quietNow,
  defaultPolicy,
  type Contact,
} from "../src/care/store";
const care = () => useCare.getState(),
  s = () => useStore.getState();
beforeEach(() => {
  useStore.setState({
    ...useStore.getInitialState(),
    landmarks: initialLandmarks,
  });
  useCare.setState(useCare.getInitialState());
});
test.each([
  ["+1", "(202) 555-0112", "+12025550112"],
  ["+44", "020 7946 0000", "+442079460000"],
  ["+1", "+1 202 555 0113", "+12025550113"],
])("normalizes %s %s", (code, phone, normalized) =>
  expect(normalizePhone(code, phone)).toBe(normalized),
);
test.each([
  ["1", "2025550112"],
  ["+1", "abc"],
  ["+1", "12"],
  ["+44", "+12025550113"],
  ["+1", "2025550112?token=foo"],
])("rejects invalid contact number %s %s", (code, phone) =>
  expect(() => normalizePhone(code, phone)).toThrow(),
);
test("contact CRUD, permissions, persistence and final caregiver guard", () => {
  const c: Contact = {
    ...care().contacts[1],
    id: "new",
    name: "Fictional cousin",
    phone: "202 555 0114",
    primary: true,
  };
  expect(care().saveContact(c)).toBeNull();
  expect(care().contacts[2].phone).toBe("+12025550114");
  expect(care().saveContact({ ...c, preferred: "sms", sms: false })).toContain(
    "permission",
  );
  care().reorderContact("new", -1);
  expect(care().contacts[1].id).toBe("new");
  expect(care().deleteContact("sample-primary")).toBeNull();
  expect(care().deleteContact("new")).toContain("final required");
  expect(
    care().saveContact({ ...care().contacts[0], enabled: false }),
  ).toContain("at least one");
  const saved = JSON.parse(localStorage.getItem("wayhome-care-v1")!);
  expect(saved.state.contacts.some((x: Contact) => x.id === "new")).toBe(true);
});
test("first and repeated check-in delays share the existing state machine", () => {
  care().updatePolicy({
    firstSeconds: 5,
    repeatSeconds: 11,
    nonurgentSeconds: 17,
  });
  s().event("CHECK");
  const c = s().checkIn!;
  expect(c.deadline! - Date.now()).toBeLessThanOrEqual(5000);
  s().checkInTimeout(c.id, c.deadline!);
  expect(s().checkIn!.deadline! - c.deadline!).toBe(11000);
  expect(s().settings.nonurgentCheckInSeconds).toBe(17);
  expect(care().policy.firstSeconds).toBe(5);
});
test("notification receipts honor contact permissions, order, quiet hours and explicit emergency approval", () => {
  care().updatePolicy({
    primary: true,
    secondary: false,
    push: false,
    sms: false,
    call: false,
  });
  s().event("HELP");
  expect(care().receipts[0].recipients).toEqual([]);
  care().updatePolicy({ push: true });
  s().event("SOS");
  expect(care().receipts[0].recipients.map((c) => c.id)).toEqual([
    "sample-primary",
    "sample-secondary",
  ]);
  expect(care().receipts[0].recipients.every((c) => c.method === "push")).toBe(
    true,
  );
  care().updatePolicy({ emergencySOS: false });
  s().event("SOS");
  expect(care().receipts[0].recipients).toEqual([]);
  expect(s().mode).toBe("EMERGENCY_SIMULATED");
  const p = { ...defaultPolicy, quiet: true };
  const d = new Date();
  d.setHours(23, 0, 0);
  expect(quietNow(p, d.getTime())).toBe(true);
  d.setHours(12);
  expect(quietNow(p, d.getTime())).toBe(false);
});
test("fall simulation cannot enter emergency without separate approval", () => {
  care().simulateFall();
  expect(s().mode).toBe("CHECK_IN");
  care().updatePolicy({ emergencyFall: true });
  care().simulateFall();
  expect(s().mode).toBe("EMERGENCY_SIMULATED");
});
test("guidance cancellation works with low confidence and cannot clear SOS", () => {
  s().event("GUIDE");
  s().setSignals({ gpsConfidence: 0.2 });
  expect(s().guidanceActive).toBe(true);
  s().cancelGuidance();
  expect(s().guidanceActive).toBe(false);
  expect(s().mode).toBe("CHECK_IN");
  s().event("SOS");
  s().cancelGuidance();
  expect(s().mode).toBe("EMERGENCY_SIMULATED");
});
test("disabled navigation landmarks are never advanced, even with memory approval", () => {
  s().saveLandmark({
    ...initialLandmarks[0],
    enabled: false,
    memoryApproved: true,
  });
  s().event("GUIDE");
  s().nextLandmark(initialLandmarks[0].id);
  expect(s().guideIndex).toBe(0);
});
test("exiting a walkthrough cancels timers and guidance without changing device readings or incident", () => {
  s().event("CHECK");
  s().closeDemo();
  expect(s().checkIn?.deadline).toBeNull();
  s().event("GUIDE");
  s().closeDemo();
  expect(s().guidanceActive).toBe(false);
  s().event("DISCONNECT");
  s().event("SOS");
  const incident = s().incident;
  s().closeDemo();
  expect(s().incident).toEqual(incident);
  expect(s().connected).toBe(false);
});
test("journey contents persist independently of memory navigation approval", () => {
  care().saveJourney({
    id: "j",
    title: "An optional afternoon",
    entries: ["sample-mei", "sample-park"],
  });
  expect(
    JSON.parse(localStorage.getItem("wayhome-care-v1")!).state.journeys[0].id,
  ).toBe("j");
  care().deleteJourney("j");
  expect(care().journeys).toHaveLength(0);
});
test("grace-period notifications are cancelled if the route concern clears", () => {
  care().updatePolicy({ graceSeconds: 40 });
  s().setSignals({ deviationMeters: 140 });
  const pending = care().receipts.find((r) =>
    r.reason.includes("Route deviation"),
  )!;
  expect(pending.delivered).toBe(false);
  s().setSignals({ deviationMeters: 0 });
  care().tick(pending.dueAt + 1);
  const updated = care().receipts.find((r) => r.id === pending.id)!;
  expect(updated.recipients).toHaveLength(0);
  expect(updated.outcome).toContain("cancelled");
});
test("queued notification rechecks permissions at delivery", () => {
  care().updatePolicy({ nonurgentSeconds: 60 });
  s().event("HELP");
  const pending = care().receipts[0];
  expect(pending.recipients).toHaveLength(1);
  care().updatePolicy({ push: false });
  care().tick(pending.dueAt + 1);
  expect(
    care().receipts.find((r) => r.id === pending.id)!.recipients,
  ).toHaveLength(0);
});
test("quiet hours are rechecked before a queued notification is delivered", () => {
  care().updatePolicy({ nonurgentSeconds: 60, quiet: false });
  s().event("HELP");
  const r = care().receipts[0];
  care().updatePolicy({ quiet: true, quietStart: "00:00", quietEnd: "00:00" });
  care().tick(r.dueAt + 1);
  expect(care().receipts.find((x) => x.id === r.id)!.recipients).toHaveLength(
    0,
  );
  expect(care().receipts.find((x) => x.id === r.id)!.outcome).toContain(
    "Quiet hours",
  );
});
