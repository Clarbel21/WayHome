import { beforeEach, expect, test } from "vitest";
import { useStore } from "../src/store";
import { selectCaregiverPriority } from "../src/caregiver/priority";
import { demoInstruction } from "../src/demo/story";
const state = () => useStore.getState();
beforeEach(() => useStore.setState(useStore.getInitialState()));
test("SOS owns the priority even when a family request and device faults coexist", () => {
  state().chooseAssistance("family");
  state().event("DISCONNECT");
  state().event("SOS");
  expect(selectCaregiverPriority(state()).kind).toBe("sos-new");
  const alert = state().alerts.find((a) => a.emergency)!;
  state().acknowledgeEmergency(alert.id);
  expect(selectCaregiverPriority(state()).kind).toBe("sos-review");
  expect(state().incident?.stage).not.toBe("resolved");
  expect(state().connected).toBe(false);
  expect(state().familyRequest?.status).toBe("waiting");
  expect(demoInstruction(state(), "walk", "idle").device).toBe("caregiver");
});
test("family priority follows acknowledgment and response without implying wearer continuation", () => {
  state().chooseAssistance("family");
  expect(selectCaregiverPriority(state()).kind).toBe("family-new");
  state().respondFamily(state().familyRequest!.id, "acknowledge");
  expect(selectCaregiverPriority(state()).kind).toBe("family-reply");
  state().respondFamily(state().familyRequest!.id, "respond");
  expect(selectCaregiverPriority(state()).kind).toBe("family-done");
  expect(demoInstruction(state(), "family", "idle")).toMatchObject({
    device: "watch",
    complete: false,
  });
  state().answerCheckIn("okay");
  expect(demoInstruction(state(), "family", "idle").complete).toBe(true);
});
test("demo completion requires actual recognition or an actual check-in answer", () => {
  expect(demoInstruction(state(), "walk", "idle").complete).toBe(false);
  state().chooseAssistance("home");
  expect(selectCaregiverPriority(state()).kind).toBe("guidance");
  for (let i = 0; i < state().landmarks.length; i++) state().nextLandmark();
  expect(demoInstruction(state(), "walk", "idle").complete).toBe(true);
  state().event("CHECK");
  expect(demoInstruction(state(), "checkin", "idle").complete).toBe(false);
  state().answerCheckIn("okay");
  expect(demoInstruction(state(), "checkin", "idle").complete).toBe(true);
});
