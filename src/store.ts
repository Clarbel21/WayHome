import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  withScenarioPriority,
  clearSignals,
  unknownInputs,
  inferWear,
  wearPreset,
  evaluateSignals,
  scenarioMode,
  scenarioPresets,
  verificationBlockers,
  type Attachment,
  type WearStatus,
  type WearInputs,
  type SafetySignals,
  type Scenario,
  type Incident,
} from "./services/safety";
export type Mode =
  | "NORMAL"
  | "CHECK_IN"
  | "GUIDED_RETURN"
  | "REORIENTATION"
  | "CAREGIVER_HANDOVER"
  | "EMERGENCY_SIMULATED";
export type Event =
  | "WALK"
  | "CHECK"
  | "LOST"
  | "GUIDE"
  | "OKAY"
  | "HELP"
  | "POLICE"
  | "SOS"
  | "REMOVE"
  | "DISCONNECT";
export interface Landmark {
  id: string;
  name: string;
  instruction: string;
  photo: string;
  photoId?: string;
  sourceMemoryId?: string;
  approved: boolean;
}
export const DEFAULT_COMPANION_NAME = "Sprout";
export function validCompanionName(value: string): string | null {
  const name = value.trim();
  return name && Array.from(name).length <= 24 && !/\p{Cc}/u.test(name)
    ? name
    : null;
}
export interface EmergencySnapshot {
  wearer: string;
  location: string;
  time: number;
  safetyStatus: string;
  reason: string;
  kind: "sos" | "police";
  incidentId?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}
export function simulatedLocation(position: number) {
  const locations = [
    [1.3015, 103.819],
    [1.3024, 103.8198],
    [1.3034, 103.8202],
    [1.304, 103.8213],
    [1.3035, 103.8225],
    [1.3025, 103.8231],
    [1.3018, 103.8236],
  ];
  const [lat, lng] = locations[Math.max(0, Math.min(6, Math.round(position)))];
  return `Fictional route point ${Math.round(position) + 1}/7 · ${lat.toFixed(4)}, ${lng.toFixed(4)} (simulated)`;
}
export interface Alert {
  id: string;
  title: string;
  time: number;
  read: boolean;
  urgent: boolean;
  emergency?: EmergencySnapshot;
}
export const samples = [
  "/images/home.svg",
  "/images/bakery.svg",
  "/images/garden.svg",
  "/images/library.svg",
];
export const initialLandmarks: Landmark[] = [
  {
    id: "garden",
    name: "Community garden",
    instruction: "Walk toward the green garden gate.",
    photo: samples[2],
    approved: true,
  },
  {
    id: "bakery",
    name: "Neighborhood bakery",
    instruction: "Continue to the bakery with the peach door.",
    photo: samples[1],
    approved: true,
  },
  {
    id: "library",
    name: "Local library",
    instruction: "Turn toward the library entrance.",
    photo: samples[3],
    approved: true,
  },
  {
    id: "home",
    name: "Home",
    instruction: "Your front door is just ahead. Welcome home.",
    photo: samples[0],
    approved: true,
  },
];
export const status: Record<Mode, string> = {
  NORMAL: "No active alerts",
  CHECK_IN: "Check-in Needed",
  GUIDED_RETURN: "Guidance Active",
  REORIENTATION: "Check-in Needed",
  CAREGIVER_HANDOVER: "Caregiver Assistance Requested",
  EMERGENCY_SIMULATED: "Simulated SOS",
};
export const messages = (name: string): Record<Mode, string> => ({
  NORMAL: `Hi! I'm ${name}. I'm here with you.`,
  CHECK_IN: "Are you feeling okay?",
  GUIDED_RETURN: "Let's find our way together.",
  REORIENTATION: "It's okay. I'm here with you.",
  CAREGIVER_HANDOVER: "Let's contact someone you trust.",
  EMERGENCY_SIMULATED: "Help request sent — simulation",
});
export function transition(current: Mode, event: Event): Mode {
  if (current === "EMERGENCY_SIMULATED") return current;
  const targets: Record<Event, Mode> = {
    WALK: "NORMAL",
    CHECK: "CHECK_IN",
    LOST: "REORIENTATION",
    GUIDE: "GUIDED_RETURN",
    OKAY: "NORMAL",
    HELP: "CAREGIVER_HANDOVER",
    SOS: "EMERGENCY_SIMULATED",
    POLICE: "EMERGENCY_SIMULATED",
    REMOVE: "CAREGIVER_HANDOVER",
    DISCONNECT: current === "NORMAL" ? "CHECK_IN" : current,
  };
  return targets[event];
}
interface Settings {
  companionName: string;
  wearer: string;
  caregiver: string;
  emergency: string;
  voice: boolean;
  notifications: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}
interface State {
  mode: Mode;
  connected: boolean;
  worn: boolean; // Derived compatibility gate; never a guaranteed wear claim.
  attachment: Attachment;
  wearStatus: WearStatus;
  wearInputs: WearInputs;
  wearObservedAt: number | null;
  signals: SafetySignals;
  incident: Incident | null;
  reviewedIncident: { id: string; revision: number } | null;
  resolveIncident: (
    id: string,
    revision: number,
    personConfirmed: boolean,
  ) => boolean;
  setAttachment: (attachment: Attachment) => void;
  observeWear: (inputs: WearInputs) => void;
  setConnection: (connected: boolean) => void;
  setSignals: (patch: Partial<SafetySignals>) => void;
  simulateScenario: (scenario: Scenario) => void;
  verifyIncident: (
    id: string,
    revision: number,
    personConfirmed: boolean,
  ) => boolean;
  battery: number;
  position: number;
  guideIndex: number;
  lastCheck: number;
  alerts: Alert[];
  landmarks: Landmark[];
  settings: Settings;
  event: (event: Event, reason?: string) => void;
  acknowledgeEmergency: (id: string) => void;
  resetEmergency: (note?: string) => void;
  saveCompanionName: (name: string) => boolean;
  move: () => void;
  nextLandmark: () => void;
  resetRoute: () => void;
  reset: () => void;
  read: (id?: string) => void;
  saveLandmark: (landmark: Landmark) => void;
  deleteLandmark: (id: string) => void;
  settingsUpdate: (patch: Partial<Settings>) => void;
}
const defaults = () => ({
  mode: "NORMAL" as Mode,
  connected: true,
  worn: true,
  attachment: "wristwatch" as Attachment,
  wearStatus: "likely_worn" as WearStatus,
  wearInputs: wearPreset("wristwatch", "likely_worn"),
  wearObservedAt: Date.now(),
  signals: { ...clearSignals },
  incident: null as Incident | null,
  reviewedIncident: null as { id: string; revision: number } | null,
  battery: 86,
  position: 0,
  guideIndex: 0,
  lastCheck: Date.now(),
  alerts: [] as Alert[],
});
const titles: Record<Event, string> = {
  WALK: "Normal walk started",
  CHECK: "Gentle check-in requested",
  LOST: "Unusual route event · reorientation started",
  GUIDE: "Guided return started",
  OKAY: "Wearer confirmed they are okay",
  HELP: "Wearer requested caregiver assistance",
  SOS: "Simulated SOS · help request received",
  POLICE: "Simulated police notification · no police were contacted",
  REMOVE:
    "Wearable removal indicated · simulated inference, caregiver review requested",
  DISCONNECT: "Device disconnected",
};
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...defaults(),
      landmarks: initialLandmarks,
      settings: {
        companionName: DEFAULT_COMPANION_NAME,
        wearer: "Alex Chen",
        caregiver: "Jamie Chen",
        emergency: "Morgan Chen",
        voice: false,
        notifications: true,
        largeText: false,
        reducedMotion: false,
      },
      event: (event, reason) => {
        const current = get();
        const incidentId =
          current.incident && current.incident.stage !== "resolved"
            ? current.incident.id
            : crypto.randomUUID();
        set((s) => ({
          ...(!["OKAY", "WALK"].includes(event)
            ? { reviewedIncident: null }
            : {}),
          ...(event === "OKAY" &&
          !verificationBlockers(s).length &&
          s.incident?.stage === "resolved"
            ? {
                incident: { ...s.incident, deviceReviewPending: false },
                reviewedIncident: null,
              }
            : {}),
          mode: withScenarioPriority(
            s.incident && s.incident.stage !== "resolved"
              ? "EMERGENCY_SIMULATED"
              : transition(s.mode, event) === "NORMAL"
                ? verificationBlockers(s).length
                  ? scenarioMode(s.signals) || "CHECK_IN"
                  : "NORMAL"
                : event === "GUIDE" &&
                    (s.signals.gpsConfidence < 0.6 ||
                      !s.connected ||
                      s.wearStatus !== "likely_worn")
                  ? "CHECK_IN"
                  : transition(s.mode, event),
            s.signals,
          ),
          ...(["SOS", "POLICE"].includes(event)
            ? {
                incident: {
                  id: incidentId,
                  revision: (s.incident?.revision || 0) + 1,
                  stage: "active" as const,
                },
              }
            : {}),
          ...(event === "WALK" && s.mode !== "EMERGENCY_SIMULATED"
            ? { position: 0, guideIndex: 0 }
            : {}),
          ...(event === "LOST" && s.mode !== "EMERGENCY_SIMULATED"
            ? { position: 2 }
            : {}),
          ...(event === "GUIDE" && s.mode !== "EMERGENCY_SIMULATED"
            ? { guideIndex: 0 }
            : {}),
          ...(event === "OKAY" && s.mode !== "EMERGENCY_SIMULATED"
            ? { lastCheck: Date.now() }
            : {}),
          ...(event === "REMOVE"
            ? {
                wearInputs: wearPreset(s.attachment, "not_worn"),
                wearStatus: (s.connected
                  ? "not_worn"
                  : "unknown") as WearStatus,
                worn: false,
                wearObservedAt: Date.now(),
              }
            : {}),
          ...(event === "DISCONNECT"
            ? {
                connected: false,
                wearStatus: "unknown" as WearStatus,
                worn: false,
              }
            : {}),
          alerts: [
            {
              id: crypto.randomUUID(),
              title:
                titles[event] +
                (s.mode === "EMERGENCY_SIMULATED" &&
                !["SOS", "POLICE", "REMOVE", "DISCONNECT"].includes(event)
                  ? " · S5 remains active"
                  : ""),
              time: Date.now(),
              read: false,
              urgent: [
                "SOS",
                "POLICE",
                "REMOVE",
                "DISCONNECT",
                "HELP",
              ].includes(event),
              ...(["SOS", "POLICE"].includes(event)
                ? {
                    emergency: {
                      incidentId,
                      wearer: s.settings.wearer,
                      location: simulatedLocation(s.position),
                      time: Date.now(),
                      safetyStatus: status.EMERGENCY_SIMULATED,
                      reason:
                        reason?.trim().slice(0, 240) ||
                        (event === "SOS"
                          ? "Wearer activated simulated SOS"
                          : "Caregiver requested simulated police notification"),
                      kind:
                        event === "SOS"
                          ? ("sos" as const)
                          : ("police" as const),
                    },
                  }
                : {}),
            },
            ...s.alerts,
          ].slice(0, 100),
        }));
      },
      acknowledgeEmergency: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id && a.emergency && !a.emergency.acknowledgedAt
              ? {
                  ...a,
                  read: true,
                  emergency: {
                    ...a.emergency,
                    acknowledgedAt: Date.now(),
                    acknowledgedBy: s.settings.caregiver,
                  },
                }
              : a,
          ),
        })),
      resetEmergency: (note = "Caregiver requests incident resolution") =>
        set((s) => {
          if (!s.incident || s.incident.stage === "resolved" || !note.trim())
            return {};
          return {
            mode: "EMERGENCY_SIMULATED",
            incident: {
              ...s.incident,
              stage: "awaiting_verification",
              note: note.trim().slice(0, 240),
              requestedAt: Date.now(),
            },
            alerts: [
              {
                id: crypto.randomUUID(),
                title:
                  "Incident resolution requested — verification required; safety not confirmed",
                time: Date.now(),
                read: false,
                urgent: true,
              },
              ...s.alerts,
            ].slice(0, 100),
          };
        }),
      resolveIncident: (id, revision, personConfirmed) => {
        const s = get();
        if (
          !personConfirmed ||
          !s.incident ||
          s.incident.id !== id ||
          s.incident.revision !== revision ||
          s.incident.stage !== "awaiting_verification"
        )
          return false;
        if (!verificationBlockers(s).length)
          return s.verifyIncident(id, revision, true);
        const time = Date.now();
        set({
          mode: "CHECK_IN",
          reviewedIncident: { id, revision },
          incident: {
            ...s.incident,
            stage: "resolved",
            verifiedAt: time,
            verifiedBy: s.settings.caregiver,
            deviceReviewPending: true,
          },
          alerts: [
            {
              id: crypto.randomUUID(),
              title:
                "Incident resolved after caregiver confirmation — device review remains pending",
              time,
              read: false,
              urgent: false,
            },
            ...s.alerts.map((a) =>
              a.emergency?.incidentId === id
                ? {
                    ...a,
                    emergency: {
                      ...a.emergency,
                      resolvedAt: time,
                      resolvedBy: s.settings.caregiver,
                    },
                  }
                : a,
            ),
          ].slice(0, 100),
        });
        return true;
      },
      verifyIncident: (id, revision, personConfirmed) => {
        const s = get();
        if (
          !personConfirmed ||
          !s.incident ||
          s.incident.id !== id ||
          s.incident.revision !== revision ||
          s.incident.stage !== "awaiting_verification" ||
          verificationBlockers(s).length
        )
          return false;
        const time = Date.now();
        set({
          mode: "NORMAL",
          reviewedIncident: null,
          incident: {
            ...s.incident,
            stage: "resolved",
            verifiedAt: time,
            verifiedBy: s.settings.caregiver,
          },
          alerts: [
            {
              id: crypto.randomUUID(),
              title:
                "Incident resolved after explicit caregiver verification — no guarantee of safety",
              time,
              read: false,
              urgent: false,
            },
            ...s.alerts.map((a) =>
              a.emergency?.incidentId === id
                ? {
                    ...a,
                    emergency: {
                      ...a.emergency,
                      resolvedAt: time,
                      resolvedBy: s.settings.caregiver,
                    },
                  }
                : a,
            ),
          ].slice(0, 100),
        });
        return true;
      },
      setAttachment: (attachment) =>
        set((s) => ({
          attachment,
          reviewedIncident: null,
          wearInputs: { ...unknownInputs },
          wearStatus: "unknown",
          worn: false,
          wearObservedAt: null,
          mode:
            s.mode === "EMERGENCY_SIMULATED"
              ? "EMERGENCY_SIMULATED"
              : "CHECK_IN",
          alerts: [
            {
              id: crypto.randomUUID(),
              title:
                "Attachment changed — wear status unknown until new simulated observations",
              time: Date.now(),
              read: false,
              urgent: false,
            },
            ...s.alerts,
          ].slice(0, 100),
        })),
      observeWear: (inputs) =>
        set((s) => {
          const wearStatus = inferWear(s.attachment, inputs, s.connected);
          return {
            reviewedIncident: null,
            wearInputs: { ...inputs },
            wearStatus,
            worn: wearStatus === "likely_worn",
            wearObservedAt: Date.now(),
            mode:
              s.mode === "EMERGENCY_SIMULATED"
                ? s.mode
                : wearStatus !== "likely_worn"
                  ? "CHECK_IN"
                  : s.mode,
            alerts: [
              {
                id: crypto.randomUUID(),
                title: `Simulated attachment observations: ${wearStatus.replaceAll("_", " ")} — inference, not confirmation`,
                time: Date.now(),
                read: false,
                urgent: wearStatus === "not_worn",
              },
              ...s.alerts,
            ].slice(0, 100),
          };
        }),
      setConnection: (connected) => {
        if (!connected) {
          get().event("DISCONNECT");
          return;
        }
        if (get().connected) return;
        set((s) => ({
          connected: true,
          reviewedIncident: null,
          wearInputs: { ...unknownInputs },
          wearStatus: "unknown",
          worn: false,
          wearObservedAt: null,
          alerts: [
            {
              id: crypto.randomUUID(),
              title:
                "Simulated connection restored — fresh wear observations still required",
              time: Date.now(),
              read: false,
              urgent: false,
            },
            ...s.alerts,
          ].slice(0, 100),
        }));
      },
      setSignals: (patch) =>
        set((s) => {
          const signals = { ...s.signals, ...patch };
          signals.gpsConfidence = Math.max(
            0,
            Math.min(
              1,
              Number.isFinite(signals.gpsConfidence)
                ? signals.gpsConfidence
                : 0,
            ),
          );
          for (const key of [
            "deviationMeters",
            "inactiveMinutes",
            "missedCheckIns",
          ] as const)
            signals[key] = Math.max(
              0,
              Number.isFinite(signals[key]) ? signals[key] : 0,
            );
          const findings = evaluateSignals(signals);
          return {
            signals,
            reviewedIncident: null,
            mode:
              s.mode === "EMERGENCY_SIMULATED"
                ? s.mode
                : scenarioMode(signals) || s.mode,
            alerts: [
              ...(findings.length
                ? findings.map((f) => ({
                    id: crypto.randomUUID(),
                    title: f.reason,
                    time: Date.now(),
                    read: false,
                    urgent: f.key === "missed",
                  }))
                : [
                    {
                      id: crypto.randomUUID(),
                      title:
                        "Scenario observations updated — caregiver review still required",
                      time: Date.now(),
                      read: false,
                      urgent: false,
                    },
                  ]),
              ...s.alerts,
            ].slice(0, 100),
          };
        }),
      simulateScenario: (scenario) =>
        get().setSignals(scenarioPresets[scenario]),
      saveCompanionName: (value) => {
        const name = validCompanionName(value);
        if (!name) return false;
        set((s) => ({ settings: { ...s.settings, companionName: name } }));
        return true;
      },
      move: () =>
        set((s) =>
          !s.connected ||
          s.wearStatus !== "likely_worn" ||
          s.signals.gpsConfidence < 0.6 ||
          s.mode === "EMERGENCY_SIMULATED"
            ? {}
            : {
                position: Math.min(6, s.position + 1),
                battery: Math.max(0, s.battery - 1),
              },
        ),
      nextLandmark: () => {
        const s = get();
        const approved = s.landmarks.filter((l) => l.approved);
        if (
          s.mode !== "GUIDED_RETURN" ||
          !s.connected ||
          s.wearStatus !== "likely_worn" ||
          s.signals.gpsConfidence < 0.6 ||
          !approved.length
        )
          return;
        if (s.guideIndex + 1 >= approved.length) {
          s.event("OKAY");
          set({ position: 6 });
        } else
          set({
            guideIndex: s.guideIndex + 1,
            position: Math.min(6, s.position + 1),
          });
      },
      resetRoute: () => set({ position: 0, guideIndex: 0 }),
      reset: () => {
        const s = get();
        if (
          s.mode === "EMERGENCY_SIMULATED" ||
          (s.incident && s.incident.stage !== "resolved")
        )
          return;
        set({
          ...defaults(),
          attachment: s.attachment,
          wearInputs: wearPreset(s.attachment, "likely_worn"),
        });
      },
      read: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            !id || a.id === id ? { ...a, read: true } : a,
          ),
        })),
      saveLandmark: (l) =>
        set((s) => ({
          landmarks: s.landmarks.some((x) => x.id === l.id)
            ? s.landmarks.map((x) => (x.id === l.id ? l : x))
            : [...s.landmarks, l],
          guideIndex: 0,
        })),
      deleteLandmark: (id) =>
        set((s) => ({
          landmarks: s.landmarks.filter((l) => l.id !== id),
          guideIndex: 0,
        })),
      settingsUpdate: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: "wayhome-v1",
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as Partial<State> | undefined;
        if (!saved) return current;
        const incident =
          saved.incident ??
          (saved.mode === "EMERGENCY_SIMULATED"
            ? { id: crypto.randomUUID(), revision: 1, stage: "active" as const }
            : null);
        return {
          ...current,
          ...saved,
          mode:
            saved?.incident && saved.incident.stage !== "resolved"
              ? "EMERGENCY_SIMULATED"
              : saved?.mode === "EMERGENCY_SIMULATED"
                ? "EMERGENCY_SIMULATED"
                : saved?.mode === "NORMAL" &&
                    (!saved.wearInputs ||
                      inferWear(
                        saved.attachment ?? "wristwatch",
                        saved.wearInputs,
                        saved.connected ?? true,
                      ) !== "likely_worn")
                  ? "CHECK_IN"
                  : (saved?.mode ?? current.mode),
          signals: { ...clearSignals, ...saved?.signals },
          incident,
          alerts: (saved.alerts ?? current.alerts).map((a) =>
            incident &&
            incident.stage !== "resolved" &&
            a.emergency &&
            !a.emergency.incidentId &&
            !a.emergency.resolvedAt
              ? { ...a, emergency: { ...a.emergency, incidentId: incident.id } }
              : a,
          ),
          wearInputs: saved?.wearInputs ?? { ...unknownInputs },
          wearStatus: saved?.wearInputs
            ? inferWear(
                saved.attachment ?? "wristwatch",
                saved.wearInputs,
                saved.connected ?? true,
              )
            : "unknown",
          worn: saved?.wearInputs
            ? inferWear(
                saved.attachment ?? "wristwatch",
                saved.wearInputs,
                saved.connected ?? true,
              ) === "likely_worn"
            : false,
          settings: {
            ...current.settings,
            ...saved?.settings,
            companionName:
              validCompanionName(saved?.settings?.companionName ?? "") ??
              DEFAULT_COMPANION_NAME,
          },
        };
      },
    },
  ),
);
// Persisted updates also keep separate Companion and Caregiver browser tabs in sync.
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === "wayhome-v1") void useStore.persist.rehydrate();
  });
