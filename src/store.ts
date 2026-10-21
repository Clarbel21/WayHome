import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  | "SOS"
  | "REMOVE"
  | "DISCONNECT";
export interface Landmark {
  id: string;
  name: string;
  instruction: string;
  photo: string;
  approved: boolean;
}
export interface Alert {
  id: string;
  title: string;
  time: number;
  read: boolean;
  urgent: boolean;
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
  NORMAL: "Safe",
  CHECK_IN: "Check-in Needed",
  GUIDED_RETURN: "Guidance Active",
  REORIENTATION: "Check-in Needed",
  CAREGIVER_HANDOVER: "Caregiver Assistance Requested",
  EMERGENCY_SIMULATED: "Simulated SOS",
};
export const messages: Record<Mode, string> = {
  NORMAL: "Hi! I'm Sprout. I'm here with you.",
  CHECK_IN: "Are you feeling okay?",
  GUIDED_RETURN: "Let's find our way together.",
  REORIENTATION: "It's okay. I'm here with you.",
  CAREGIVER_HANDOVER: "Let's contact someone you trust.",
  EMERGENCY_SIMULATED: "Help request sent — simulation",
};
export function transition(current: Mode, event: Event): Mode {
  const targets: Record<Event, Mode> = {
    WALK: "NORMAL",
    CHECK: "CHECK_IN",
    LOST: "REORIENTATION",
    GUIDE: "GUIDED_RETURN",
    OKAY: "NORMAL",
    HELP: "CAREGIVER_HANDOVER",
    SOS: "EMERGENCY_SIMULATED",
    REMOVE: "CAREGIVER_HANDOVER",
    DISCONNECT: current === "NORMAL" ? "CHECK_IN" : current,
  };
  return targets[event];
}
interface Settings {
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
  worn: boolean;
  battery: number;
  position: number;
  guideIndex: number;
  lastCheck: number;
  alerts: Alert[];
  landmarks: Landmark[];
  settings: Settings;
  event: (event: Event) => void;
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
  REMOVE: "Wearable removed · assistance requested",
  DISCONNECT: "Device disconnected",
};
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...defaults(),
      landmarks: initialLandmarks,
      settings: {
        wearer: "Alex Chen",
        caregiver: "Jamie Chen",
        emergency: "Morgan Chen",
        voice: false,
        notifications: true,
        largeText: false,
        reducedMotion: false,
      },
      event: (event) =>
        set((s) => ({
          mode: transition(s.mode, event),
          ...(event === "WALK"
            ? { connected: true, worn: true, position: 0, guideIndex: 0 }
            : {}),
          ...(event === "LOST" ? { position: 2 } : {}),
          ...(event === "GUIDE" ? { guideIndex: 0 } : {}),
          ...(event === "OKAY" ? { lastCheck: Date.now() } : {}),
          ...(event === "REMOVE" ? { worn: false } : {}),
          ...(event === "DISCONNECT" ? { connected: false } : {}),
          alerts: [
            {
              id: crypto.randomUUID(),
              title: titles[event],
              time: Date.now(),
              read: false,
              urgent: ["SOS", "REMOVE", "DISCONNECT", "HELP"].includes(event),
            },
            ...s.alerts,
          ].slice(0, 100),
        })),
      move: () =>
        set((s) => ({
          position: Math.min(6, s.position + 1),
          battery: Math.max(0, s.battery - 1),
        })),
      nextLandmark: () => {
        const s = get();
        const approved = s.landmarks.filter((l) => l.approved);
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
      reset: () => set(defaults()),
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
    { name: "wayhome-v1", version: 1 },
  ),
);
// Persisted updates also keep separate Companion and Caregiver browser tabs in sync.
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === "wayhome-v1") void useStore.persist.rehydrate();
  });
