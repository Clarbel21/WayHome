import type { useStore } from "../store";
import { navigable } from "../store";
import { evaluateSignals } from "../services/safety";

type Snapshot = ReturnType<typeof useStore.getState>;
export function selectCaregiverPriority(
  s: Snapshot,
  zone?: { active: boolean; level: number },
) {
  const emergency = s.alerts.find(
    (a) => a.emergency && !a.emergency.resolvedAt,
  );
  const findings = evaluateSignals(s.signals);
  const concerns =
    findings.length +
    Number(!s.connected) +
    Number(s.wearStatus !== "likely_worn");
  const common = {
    concerns,
    emergency,
    landmark: s.landmarks.filter(navigable)[s.guideIndex],
  };
  if (
    s.mode === "EMERGENCY_SIMULATED" ||
    (s.incident && s.incident.stage !== "resolved")
  )
    return {
      ...common,
      kind: emergency?.emergency?.acknowledgedAt ? "sos-review" : "sos-new",
      tone: "urgent",
    } as const;
  if (s.familyRequest?.status === "waiting")
    return { ...common, kind: "family-new", tone: "attention" } as const;
  if (s.familyRequest?.status === "acknowledged")
    return { ...common, kind: "family-reply", tone: "attention" } as const;
  if (
    s.mode === "CAREGIVER_HANDOVER" &&
    s.familyRequest?.status === "responded"
  )
    return { ...common, kind: "family-done", tone: "calm" } as const;
  if (s.mode === "CHECK_IN" && s.checkIn?.stage === "question")
    return { ...common, kind: "checkin", tone: "calm" } as const;
  if (zone?.active && s.mode !== "GUIDED_RETURN")
    return {
      ...common,
      kind: "zone",
      tone: zone.level >= 3 ? "urgent" : "attention",
    } as const;
  if (s.mode === "GUIDED_RETURN" && !common.landmark)
    return { ...common, kind: "review", tone: "attention" } as const;
  if (s.mode === "GUIDED_RETURN")
    return { ...common, kind: "guidance", tone: "guidance" } as const;
  if (concerns || s.mode !== "NORMAL")
    return { ...common, kind: "review", tone: "attention" } as const;
  return { ...common, kind: "clear", tone: "calm" } as const;
}
