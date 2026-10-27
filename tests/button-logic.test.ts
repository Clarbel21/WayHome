import { beforeEach, expect, test } from "vitest";
import { initialLandmarks, useStore } from "../src/store";
import { useMemory } from "../src/memory/store";
import { clearSignals, wearPreset } from "../src/services/safety";
const state = () => useStore.getState();
const memory = () => useMemory.getState();
beforeEach(() => {
  useStore.setState({
    ...useStore.getInitialState(),
    landmarks: initialLandmarks,
  });
  useMemory.setState(useMemory.getInitialState());
});
test("help can return to the question and recover with an okay response", () => {
  state().event("CHECK");
  state().answerCheckIn("help");
  state().returnToCheckIn();
  expect(state().checkIn).toMatchObject({
    stage: "question",
    deadline: expect.any(Number),
  });
  expect(state().checkIn?.response).toBeUndefined();
  state().answerCheckIn("okay");
  expect(state().mode).toBe("NORMAL");
});
test("duplicate answers and acknowledgment do not duplicate history or notifications", () => {
  state().event("CHECK");
  state().answerCheckIn("okay");
  state().answerCheckIn("okay");
  expect(state().checkInHistory).toHaveLength(1);
  state().chooseAssistance("family");
  const request = state().familyRequest!;
  state().chooseAssistance("family");
  expect(state().familyRequest?.id).toBe(request.id);
  state().respondFamily(request.id, "acknowledge");
  const count = state().alerts.length;
  state().respondFamily(request.id, "acknowledge");
  expect(state().alerts).toHaveLength(count);
});
test("caregiver review clears a log-only unanswered check-in and records the source", () => {
  state().settingsUpdate({ checkInNotify: false });
  state().event("CHECK");
  let c = state().checkIn!;
  state().checkInTimeout(c.id, c.deadline!);
  c = state().checkIn!;
  state().checkInTimeout(c.id, c.deadline!);
  expect(state().checkIn?.stage).toBe("unresolved");
  state().answerCheckIn("okay", "caregiver");
  expect(state().mode).toBe("NORMAL");
  expect(state().checkInHistory[0].source).toBe("caregiver");
  expect(state().alerts[0].title).toContain("Caregiver reviewed");
});
test("wear and scenario updates cannot hide a pending family handover", () => {
  state().chooseAssistance("family");
  const id = state().familyRequest!.id;
  state().setAttachment("pendant");
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  state().observeWear(wearPreset("pendant", "likely_worn"));
  state().setSignals({ inactiveMinutes: 20 });
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  state().setSignals(clearSignals);
  state().event("GUIDE");
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  expect(state().familyRequest?.id).toBe(id);
  state().respondFamily(id, "acknowledge");
  state().respondFamily(id, "respond");
  state().answerCheckIn("okay");
  expect(state().mode).toBe("NORMAL");
});
test("caregiver review can be retried after fixing physical conditions without duplicating the response", () => {
  state().event("DISCONNECT");
  state().answerCheckIn("okay", "caregiver");
  expect(state().mode).toBe("CHECK_IN");
  state().setConnection(true);
  state().observeWear(wearPreset("wristwatch", "likely_worn"));
  state().answerCheckIn("okay", "caregiver");
  expect(state().mode).toBe("NORMAL");
  expect(state().checkInHistory).toHaveLength(1);
});
test("SOS blocks route reset and ignores stale non-emergency actions", () => {
  state().move();
  state().event("SOS");
  const before = state();
  state().resetRoute();
  state().event("WALK");
  state().event("HELP");
  state().returnToCheckIn();
  expect(state().position).toBe(before.position);
  expect(state().mode).toBe("EMERGENCY_SIMULATED");
  expect(state().alerts).toHaveLength(before.alerts.length);
  expect(state().familyRequest).toBeNull();
});
test("unrelated landmark changes preserve the current recognition target; stale recognition is ignored", () => {
  state().event("GUIDE");
  const first = state().landmarks[0].id;
  state().nextLandmark(first);
  const target = state().landmarks.filter((l) => l.approved)[state().guideIndex]
    .id;
  state().nextLandmark(first);
  expect(state().guideIndex).toBe(1);
  state().deleteLandmark(first);
  expect(
    state().landmarks.filter((l) => l.approved)[state().guideIndex].id,
  ).toBe(target);
  state().saveLandmark({ ...initialLandmarks[3], name: "Updated home" });
  expect(
    state().landmarks.filter((l) => l.approved)[state().guideIndex].id,
  ).toBe(target);
});
test.each(["delete", "withdraw"])(
  "%s of current landmark stops guidance",
  (action) => {
    state().event("GUIDE");
    const target = state().landmarks[0];
    if (action === "delete") state().deleteLandmark(target.id);
    else state().saveLandmark({ ...target, approved: false });
    expect(state().mode).toBe("REORIENTATION");
    state().nextLandmark(target.id);
    expect(state().guideIndex).toBe(0);
  },
);
test("paused routine rejects undo; completion rejects repeat responses", () => {
  memory().start("routine");
  memory().selectStep(0);
  memory().pause();
  memory().undoStep();
  expect(memory().session?.order).toEqual([0]);
  memory().resume();
  memory().undoStep();
  expect(memory().session?.order).toEqual([]);
  memory().start("faces");
  memory().respond("Tell me more");
  const before = memory();
  memory().respond("Not sure");
  expect(memory().session?.response).toBe("Tell me more");
  expect(memory().growth).toEqual(before.growth);
});
test.each(["delete", "withdraw"])(
  "%s of an active memory pauses and blocks stale callbacks",
  (action) => {
    memory().start("routine");
    memory().selectStep(0);
    const entry = memory().entries.find(
      (e) => e.id === memory().session?.entryId,
    )!;
    if (action === "delete") memory().deleteEntry(entry.id);
    else memory().saveEntry({ ...entry, approved: false });
    expect(memory().session?.paused).toBe(true);
    memory().undoStep();
    memory().respond("Yes");
    memory().complete();
    expect(memory().session?.order).toEqual([0]);
    expect(memory().growth).toHaveLength(0);
  },
);
test("SOS resolution keeps an outstanding family request separate from normal monitoring", () => {
  state().chooseAssistance("family");
  const request = state().familyRequest!;
  state().event("SOS");
  const incident = state().incident!;
  state().resetEmergency();
  expect(state().verifyIncident(incident.id, incident.revision, true)).toBe(
    true,
  );
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  expect(state().familyRequest?.status).toBe("waiting");
  state().respondFamily(request.id, "acknowledge");
  state().respondFamily(request.id, "respond");
  state().answerCheckIn("okay");
  expect(state().mode).toBe("NORMAL");
});
test("approving the first landmark while the guidance list is empty remains usable", () => {
  useStore.setState({ landmarks: [] });
  state().event("GUIDE");
  state().saveLandmark({ ...initialLandmarks[0], approved: true });
  expect(state().mode).toBe("GUIDED_RETURN");
  state().nextLandmark(initialLandmarks[0].id);
  expect(state().mode).toBe("NORMAL");
});
test("stale HELP cannot hide an active incident even when a mode snapshot is inconsistent", () => {
  state().chooseAssistance("family");
  state().event("SOS");
  useStore.setState({ mode: "CHECK_IN" });
  state().event("HELP");
  expect(state().incident?.stage).toBe("active");
  expect(state().mode).not.toBe("CAREGIVER_HANDOVER");
});

test("a later okay response receives a fresh timestamp instead of being suppressed forever", () => {
  state().answerCheckIn("okay");
  useStore.setState((s) => ({
    checkIn: { ...s.checkIn!, respondedAt: Date.now() - 1000 },
  }));
  state().answerCheckIn("okay");
  expect(state().checkInHistory).toHaveLength(2);
  expect(state().checkIn?.respondedAt).toBeGreaterThan(Date.now() - 500);
});
