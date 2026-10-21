import type { Mode } from "../store";
export type Attachment = "wristwatch" | "pendant" | "clip";
export type WearStatus =
  "likely_worn" | "possibly_removed" | "not_worn" | "unknown";
export type Observation = "yes" | "no" | "unknown";
export interface WearInputs {
  fastener: Observation;
  contact: Observation;
  proximity: Observation;
  motion: Observation;
}
export const unknownInputs: WearInputs = {
  fastener: "unknown",
  contact: "unknown",
  proximity: "unknown",
  motion: "unknown",
};
export const attachmentNames: Record<Attachment, string> = {
  wristwatch: "Wristwatch",
  pendant: "Pendant",
  clip: "Clothing clip",
};
export const wearLabels: Record<WearStatus, string> = {
  likely_worn: "Likely worn",
  possibly_removed: "Possibly removed",
  not_worn: "Not worn",
  unknown: "Unknown",
};
export const inputLabels: Record<
  Attachment,
  Partial<Record<keyof WearInputs, string>>
> = {
  wristwatch: { fastener: "Strap closed", contact: "Skin contact" },
  pendant: { fastener: "Lanyard fastened", proximity: "Near-body proximity" },
  clip: { fastener: "Clip attached", motion: "Garment movement" },
};
export function inferWear(
  attachment: Attachment,
  inputs: WearInputs,
  connected = true,
): WearStatus {
  if (!connected) return "unknown";
  const second =
    attachment === "wristwatch"
      ? inputs.contact
      : attachment === "pendant"
        ? inputs.proximity
        : inputs.motion;
  if (inputs.fastener === "unknown" || second === "unknown") return "unknown";
  if (inputs.fastener === "yes" && second === "yes") return "likely_worn";
  if (inputs.fastener === "no" && second === "no") return "not_worn";
  return "possibly_removed";
}
export function wearPreset(
  attachment: Attachment,
  status: WearStatus,
): WearInputs {
  const key =
    attachment === "wristwatch"
      ? "contact"
      : attachment === "pendant"
        ? "proximity"
        : "motion";
  return {
    ...unknownInputs,
    fastener:
      status === "unknown" ? "unknown" : status === "not_worn" ? "no" : "yes",
    [key]:
      status === "unknown"
        ? "unknown"
        : status === "likely_worn"
          ? "yes"
          : "no",
  };
}
export interface SafetySignals {
  deviationMeters: number;
  inactiveMinutes: number;
  missedCheckIns: number;
  gpsConfidence: number;
}
export const clearSignals: SafetySignals = {
  deviationMeters: 0,
  inactiveMinutes: 0,
  missedCheckIns: 0,
  gpsConfidence: 1,
};
export type Scenario = "deviation" | "inactivity" | "missed" | "gps";
export const scenarioPresets: Record<Scenario, Partial<SafetySignals>> = {
  deviation: { deviationMeters: 140 },
  inactivity: { inactiveMinutes: 20 },
  missed: { missedCheckIns: 2 },
  gps: { gpsConfidence: 0.35 },
};
export function evaluateSignals(s: SafetySignals) {
  const findings: {
    key: Scenario;
    mode: "CHECK_IN" | "REORIENTATION" | "CAREGIVER_HANDOVER";
    reason: string;
  }[] = [];
  if (s.gpsConfidence < 0.6)
    findings.push({
      key: "gps",
      mode: "CHECK_IN",
      reason: `Low GPS confidence: ${Math.round(s.gpsConfidence * 100)}% is below 60%. Last sample location may be inaccurate; route deviation is not inferred and guidance is paused.`,
    });
  if (s.missedCheckIns >= 2)
    findings.push({
      key: "missed",
      mode: "CAREGIVER_HANDOVER",
      reason: `Missed check-ins: ${s.missedCheckIns} unanswered simulated check-ins (threshold 2). Caregiver review requested; this does not establish an emergency.`,
    });
  if (s.deviationMeters >= 100 && s.gpsConfidence >= 0.6)
    findings.push({
      key: "deviation",
      mode: "REORIENTATION",
      reason: `Route deviation: ${s.deviationMeters} m from the sample corridor (threshold 100 m), with sufficient simulated GPS confidence. Offer reassurance and caregiver review.`,
    });
  if (s.inactiveMinutes >= 15)
    findings.push({
      key: "inactivity",
      mode: "CHECK_IN",
      reason: `Prolonged inactivity: ${s.inactiveMinutes} simulated minutes without movement (threshold 15). Rest is possible; a gentle check-in is requested.`,
    });
  return findings;
}
export function scenarioMode(s: SafetySignals) {
  const results = evaluateSignals(s);
  return results.some((r) => r.mode === "CAREGIVER_HANDOVER")
    ? "CAREGIVER_HANDOVER"
    : results.some((r) => r.mode === "REORIENTATION")
      ? "REORIENTATION"
      : results.length
        ? "CHECK_IN"
        : null;
}
export interface Incident {
  deviceReviewPending?: boolean;
  id: string;
  revision: number;
  stage: "active" | "awaiting_verification" | "resolved";
  note?: string;
  requestedAt?: number;
  verifiedAt?: number;
  verifiedBy?: string;
}
export function verificationBlockers(s: {
  connected: boolean;
  wearStatus: WearStatus;
  signals: SafetySignals;
}) {
  return [
    ...(!s.connected ? ["Device is disconnected"] : []),
    ...(s.wearStatus !== "likely_worn"
      ? ["Wear observations are uncertain or indicate removal"]
      : []),
    ...evaluateSignals(s.signals).map((f) => f.reason),
  ];
}

export function withScenarioPriority(
  requested: Mode,
  signals: SafetySignals,
): Mode {
  const risk = scenarioMode(signals);
  const rank: Record<Mode, number> = {
    NORMAL: 0,
    CHECK_IN: 1,
    GUIDED_RETURN: 2,
    REORIENTATION: 3,
    CAREGIVER_HANDOVER: 4,
    EMERGENCY_SIMULATED: 5,
  };
  return risk && rank[risk] > rank[requested] ? risk : requested;
}
