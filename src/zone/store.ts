// Safe-zone (geofence) simulation, modelled on the saltymiaaaa/wayhome prototype:
// leave the radius → the watch buzzes and offers to guide the wearer home → an
// escalation ladder runs in simulated minutes (paused while guiding) → landmark-by-
// landmark guided return → "arrived home safely".
// Everything is simulated. There is no real GPS, call, SMS or emergency dispatch.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ZonePhase = "walking" | "look";

export interface ZoneSettings {
  radiusM: number;
  // Simulated minutes outside the zone before each ladder step.
  notifyPrimaryMin: number;
  callSecondaryMin: number;
  emergencyMin: number;
}

export const DEFAULT_ZONE: ZoneSettings = {
  radiusM: 300,
  notifyPrimaryMin: 5,
  callSecondaryMin: 10,
  emergencyMin: 20,
};

export const RADIUS_MIN = 100;
export const RADIUS_MAX = 1500;
// Presenter speed: one real second = this many simulated minutes outside the zone.
export const SIM_MIN_PER_SECOND = 0.5;
export const PROMPT_SECONDS = 16;
export const REASK_AFTER_DECLINE_S = 15;
export const REASK_AFTER_SILENCE_S = 6;

/** Ladder level for a number of simulated minutes outside (1 = check-in only). */
export function ladderLevel(vmin: number, s: ZoneSettings) {
  if (vmin >= s.emergencyMin) return 4;
  if (vmin >= s.callSecondaryMin) return 3;
  if (vmin >= s.notifyPrimaryMin) return 2;
  return 1;
}

/** Distance from home the wearer should reach at the end of guided leg `index`. */
export function legTarget(startM: number, index: number, legs: number) {
  if (legs <= 0) return 0;
  const done = Math.min(legs, Math.max(0, index + 1));
  return Math.round(startM * (1 - done / legs));
}

export function clampRadius(value: number) {
  return Math.min(
    RADIUS_MAX,
    Math.max(RADIUS_MIN, Math.round(value / 10) * 10),
  );
}

interface ZoneState extends ZoneSettings {
  distanceM: number;
  bearingDeg: number;
  active: boolean;
  vmin: number;
  level: number;
  prompt: boolean;
  promptAt: number;
  reaskAt: number | null;
  noAnswer: number;
  wanderTo: number | null;
  guideStartM: number | null;
  phase: ZonePhase;
  buzzAt: number;
  lastEvent: string;
  setRadius: (m: number) => void;
  setSettings: (patch: Partial<ZoneSettings>) => void;
  wanderOut: () => void;
  lostFar: () => void;
  fastForward: (minutes: number) => void;
  acceptGuide: () => void;
  decline: () => void;
  buzz: () => void;
  reset: () => void;
}

const transient = () => ({
  distanceM: 0,
  bearingDeg: 38,
  active: false,
  vmin: 0,
  level: 0,
  prompt: false,
  promptAt: 0,
  reaskAt: null as number | null,
  noAnswer: 0,
  wanderTo: null as number | null,
  guideStartM: null as number | null,
  phase: "look" as ZonePhase,
  buzzAt: 0,
  lastEvent: "",
});

export const useZone = create<ZoneState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_ZONE,
      ...transient(),
      setRadius: (m) => set({ radiusM: clampRadius(m) }),
      setSettings: (patch) => {
        const next = { ...get(), ...patch };
        // Keep the ladder ordered: notify < call < emergency.
        const notify = Math.max(1, Math.round(next.notifyPrimaryMin));
        const call = Math.max(notify + 1, Math.round(next.callSecondaryMin));
        const emergency = Math.max(call + 1, Math.round(next.emergencyMin));
        set({
          radiusM: clampRadius(next.radiusM),
          notifyPrimaryMin: notify,
          callSecondaryMin: call,
          emergencyMin: emergency,
        });
      },
      wanderOut: () => {
        const s = get();
        if (s.guideStartM !== null) return;
        set({
          wanderTo: Math.round(Math.max(s.radiusM * 1.4, s.radiusM + 60)),
          distanceM: Math.max(s.distanceM, Math.round(s.radiusM * 0.75)),
          bearingDeg: 38,
          lastEvent: "wander",
        });
      },
      lostFar: () => {
        const s = get();
        if (s.guideStartM !== null) return;
        set({
          wanderTo: null,
          distanceM: Math.round(Math.max(s.radiusM * 2.2, s.radiusM + 400)),
          bearingDeg: 122,
          lastEvent: "lost",
        });
      },
      fastForward: (minutes) => {
        if (get().active) set({ vmin: get().vmin + minutes });
      },
      acceptGuide: () =>
        set((s) => ({
          prompt: false,
          reaskAt: null,
          guideStartM: s.distanceM,
          wanderTo: null,
          phase: s.distanceM > 0 ? "walking" : "look",
        })),
      decline: () =>
        set({
          prompt: false,
          reaskAt: Date.now() + REASK_AFTER_DECLINE_S * 1000,
        }),
      buzz: () => set({ buzzAt: Date.now() }),
      reset: () => set(transient()),
    }),
    {
      name: "wayhome-zone-v1",
      partialize: (s) => ({
        radiusM: s.radiusM,
        notifyPrimaryMin: s.notifyPrimaryMin,
        callSecondaryMin: s.callSecondaryMin,
        emergencyMin: s.emergencyMin,
      }),
    },
  ),
);
