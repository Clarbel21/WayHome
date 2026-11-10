import type { useStore } from "../store";
import { navigable } from "../store";
import type { DemoStory, DemoDevice } from "./demoUi";

type Snapshot = ReturnType<typeof useStore.getState>;
export function demoInstruction(
  s: Snapshot,
  story: DemoStory,
  homePage: string,
  zone?: { prompt: boolean },
  memories = false,
) {
  const sos =
    s.mode === "EMERGENCY_SIMULATED" ||
    !!(s.incident && s.incident.stage !== "resolved");
  if (sos)
    return {
      key: "demoSosInstruction",
      device: "caregiver" as DemoDevice,
      complete: false,
    };
  if (s.familyRequest && s.mode === "CAREGIVER_HANDOVER")
    return {
      key:
        s.familyRequest.status === "waiting"
          ? "demoAckFamily"
          : s.familyRequest.status === "acknowledged"
            ? "demoReplyFamily"
            : "demoContinueFamily",
      device: (s.familyRequest.status === "responded"
        ? "watch"
        : "caregiver") as DemoDevice,
      complete: false,
    };
  if (zone?.prompt && (s.mode === "NORMAL" || s.mode === "CHECK_IN"))
    return {
      key: "demoZonePrompt",
      device: "watch" as DemoDevice,
      complete: false,
    };
  if (s.mode === "CHECK_IN")
    return {
      key:
        s.checkIn?.stage === "help_options"
          ? "demoHelpOptions"
          : "demoAnswerCheckin",
      device: "watch" as DemoDevice,
      complete: false,
    };
  if (s.mode === "GUIDED_RETURN")
    return {
      key: !s.landmarks.some(navigable)
        ? "demoNoLandmarks"
        : !s.connected ||
            s.wearStatus !== "likely_worn" ||
            s.signals.gpsConfidence < 0.6
          ? "demoGuidanceReview"
          : "demoRecognize",
      device: (s.landmarks.some(navigable)
        ? "watch"
        : "caregiver") as DemoDevice,
      complete: false,
    };
  if (s.mode !== "NORMAL")
    return {
      key: "demoSupport",
      device: "watch" as DemoDevice,
      complete: false,
    };
  if (memories)
    return {
      key: "demoMemoryInstruction",
      device: "watch" as DemoDevice,
      complete: false,
    };
  if (story === "walk" && s.position === 6)
    return {
      key: "demoWalkComplete",
      device: "watch" as DemoDevice,
      complete: true,
    };
  if (
    story === "checkin" &&
    s.checkIn?.stage === "answered" &&
    s.checkIn.source !== "caregiver" &&
    s.checkIn.response === "okay"
  )
    return {
      key: "demoCheckinComplete",
      device: "caregiver" as DemoDevice,
      complete: true,
    };
  if (story === "family" && s.familyRequest?.status === "responded")
    return {
      key: "demoFamilyComplete",
      device: "caregiver" as DemoDevice,
      complete: true,
    };
  if (story === "checkin")
    return {
      key: "demoSendCheckin",
      device: "caregiver" as DemoDevice,
      complete: false,
    };
  if (story === "family")
    return {
      key: homePage === "help" ? "demoContactFamily" : "demoOpenHelp",
      device: "watch" as DemoDevice,
      complete: false,
    };
  if (story === "explore")
    return {
      key: "demoExplore",
      device: "watch" as DemoDevice,
      complete: false,
    };
  return {
    key: s.landmarks.some(navigable) ? "demoStartWalk" : "demoNoLandmarks",
    device: (s.landmarks.some(navigable) ? "watch" : "caregiver") as DemoDevice,
    complete: false,
  };
}
export function hasUnfinishedDemo(s: Snapshot, memories = false) {
  return (
    memories ||
    s.mode !== "NORMAL" ||
    !!s.familyRequest ||
    !!s.checkIn ||
    s.position > 0 ||
    s.alerts.length > 0 ||
    !s.connected ||
    s.wearStatus !== "likely_worn"
  );
}
