import { beforeEach, expect, test } from "vitest";
import { useStore } from "../src/store";
const state = () => useStore.getState();
beforeEach(() => useStore.setState(useStore.getInitialState()));
test("okay records a timestamp and returns to normal only without blockers", () => {
  state().event("CHECK");
  state().answerCheckIn("okay");
  expect(state().mode).toBe("NORMAL");
  expect(state().checkInHistory[0]).toMatchObject({
    response: "okay",
    respondedAt: expect.any(Number),
  });
  state().event("DISCONNECT");
  state().answerCheckIn("okay");
  expect(state().mode).not.toBe("NORMAL");
  expect(state().connected).toBe(false);
});
test("help offers choices and recognition is the only way to advance guidance", () => {
  state().event("CHECK");
  state().answerCheckIn("help");
  expect(state().checkIn?.stage).toBe("help_options");
  state().chooseAssistance("home");
  expect(state().mode).toBe("GUIDED_RETURN");
  expect(state().guideIndex).toBe(0);
  state().nextLandmark();
  expect(state().guideIndex).toBe(1);
  state().chooseAssistance("unrecognized");
  expect(state().mode).toBe("REORIENTATION");
  state().nextLandmark();
  expect(state().guideIndex).toBe(1);
  expect(state().interactionNote).toContain("stop these directions");
});
test("low confidence stops guidance, confusion offers calm support", () => {
  state().setSignals({ gpsConfidence: 0.2 });
  state().chooseAssistance("home");
  expect(state().mode).not.toBe("GUIDED_RETURN");
  expect(state().interactionNote).toContain("can't confirm");
  state().chooseAssistance("confused");
  expect(state().interactionNote).toContain("Take your time");
});
test("family acknowledgment and response are separate and do not resolve safety", () => {
  state().chooseAssistance("family");
  const id = state().familyRequest!.id;
  state().respondFamily(id, "respond");
  expect(state().familyRequest?.status).toBe("waiting");
  state().answerCheckIn("okay");
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  state().respondFamily(id, "acknowledge");
  state().respondFamily(id, "respond");
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  state().answerCheckIn("okay");
  expect(state().mode).toBe("NORMAL");
});
test.each([true, false])(
  "timeout repeats once then logs unresolved, notify policy %s",
  (notify) => {
    state().settingsUpdate({
      checkInNotify: notify,
      checkInTimeoutSeconds: 15,
    });
    state().event("CHECK");
    let c = state().checkIn!;
    state().checkInTimeout(c.id, c.deadline! - 1);
    expect(state().checkIn?.repeats).toBe(0);
    state().checkInTimeout(c.id, c.deadline!);
    c = state().checkIn!;
    expect(c.repeats).toBe(1);
    state().checkInTimeout(c.id, c.deadline!);
    expect(state().checkIn?.stage).toBe("unresolved");
    expect(
      state().alerts.some((a) => a.title.includes("Unresolved check-in")),
    ).toBe(true);
    expect(!!state().familyRequest).toBe(notify);
    state().event("WALK");
    expect(state().mode).not.toBe("NORMAL");
    expect(state().incident).toBeNull();
  },
);
test("SOS interrupts every branch and stale timers or assistance cannot bypass it", () => {
  for (const branch of ["home", "family", "confused"] as const) {
    useStore.setState(useStore.getInitialState());
    state().event("CHECK");
    const c = state().checkIn!;
    state().answerCheckIn("help");
    state().chooseAssistance(branch);
    state().event("SOS");
    state().answerCheckIn("okay");
    state().chooseAssistance("home");
    state().checkInTimeout(c.id, Date.now() + 999999);
    state().nextLandmark();
    expect(state().mode).toBe("EMERGENCY_SIMULATED");
    expect(state().incident?.stage).toBe("active");
  }
});
test("family response during SOS cannot acknowledge or resolve the emergency", () => {
  state().chooseAssistance("family");
  const id = state().familyRequest!.id;
  state().event("SOS");
  state().respondFamily(id, "acknowledge");
  state().respondFamily(id, "respond");
  expect(state().mode).toBe("EMERGENCY_SIMULATED");
  expect(state().incident?.stage).toBe("active");
  expect(
    state().alerts.find((a) => a.emergency)?.emergency?.acknowledgedAt,
  ).toBeUndefined();
});
