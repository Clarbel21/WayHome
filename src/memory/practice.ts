// "Practice my way home" — landmark familiarity practice for the walk home.
//
// Uses the SAME approved landmarks and turns as live guidance (src/zone/route.ts),
// so what the wearer practises is exactly what the watch will show outside.
// Method: errorless learning (a wrong pick is never marked wrong — the right photo is
// shown with its clue and the wearer picks it), plus spaced retrieval (places that
// needed a hint come back a little later in the same session).
// No scores, timers or penalties. Familiarity is shown to caregivers per LANDMARK to
// help choose clearer photos — it is not a measure of the person.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Landmark } from "../store";
import { planRoute, type Turn } from "../zone/route";

export interface Place {
  id: string;
  name: string;
  photo: string;
  photoId?: string;
  cue: string;
}

/** Other places in the neighbourhood, used as gentle look-alike choices. */
export const neighbourhood: Place[] = [
  {
    id: "n-pharmacy",
    name: "Corner pharmacy",
    photo: "/images/pharmacy.svg",
    cue: "a green cross on a pole",
  },
  {
    id: "n-busstop",
    name: "Bus stop 21",
    photo: "/images/busstop.svg",
    cue: "a yellow round sign with 21",
  },
  {
    id: "n-market",
    name: "Morning market",
    photo: "/images/market.svg",
    cue: "three stalls with striped roofs",
  },
  {
    id: "n-kopi",
    name: "Kopi shop",
    photo: "/images/kopi.svg",
    cue: "a big coffee-cup sign on a pole",
  },
  {
    id: "n-playground",
    name: "Playground",
    photo: "/images/playground.svg",
    cue: "a red swing and a blue slide",
  },
  {
    id: "n-post",
    name: "Post office",
    photo: "/images/postoffice.svg",
    cue: "a red post box outside",
  },
  {
    id: "n-school",
    name: "Primary school",
    photo: "/images/school.svg",
    cue: "a clock above a blue roof",
  },
  {
    id: "n-fountain",
    name: "Park fountain",
    photo: "/images/fountain.svg",
    cue: "water arching over a round pool",
  },
];

/** Clues for the built-in route landmarks (caregivers can set their own). */
const defaultCues: Record<string, string> = {
  garden: "a green arch with flowers over the gate",
  bakery: "a red-and-white striped awning and a peach door",
  library: "white columns and wide stone steps",
  home: "a blue gate and a red roof",
};

export function cueFor(l: Landmark) {
  // Clues read naturally after "Look for …", so strip a leading "Look for" and a
  // trailing full stop from caregiver-written text.
  const raw = l.recognition?.trim() || defaultCues[l.id] || l.instruction;
  return raw.replace(/^look for\s+/i, "").replace(/[.\s]+$/, "");
}

export type Question =
  | { kind: "spot"; landmarkId: string; options: string[] }
  | {
      kind: "next";
      landmarkId: string;
      afterId: string | "start";
      options: string[];
    }
  | { kind: "turn"; landmarkId: string; answer: Turn; options: Turn[] };

export interface Familiarity {
  seen: number;
  firstTry: number;
  hinted: number;
  lastFirstTry: boolean;
  lastPractised: number;
}
export type FamiliarityLevel = "new" | "learning" | "getting" | "well";

export function familiarityLevel(f?: Familiarity): FamiliarityLevel {
  if (!f || f.seen === 0) return "new";
  if (f.firstTry >= 2 && f.lastFirstTry) return "well";
  if (f.firstTry >= 1) return "getting";
  return "learning";
}
export const familiarityLabel: Record<FamiliarityLevel, string> = {
  new: "Not practised yet",
  learning: "Still learning",
  getting: "Getting familiar",
  well: "Remembers well",
};

/** Deterministic shuffle so a question's options stay stable while it's on screen. */
function shuffle<T>(items: T[], seed: number) {
  const a = [...items];
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Choice ids for a photo question: the answer plus two look-alikes. */
function photoOptions(answerId: string, route: Landmark[], seed: number) {
  const pool = [
    ...route.filter((l) => l.id !== answerId).map((l) => l.id),
    ...neighbourhood.map((p) => p.id),
  ];
  const distractors = shuffle(pool, seed).slice(0, 2);
  return shuffle([answerId, ...distractors], seed + 7);
}

/**
 * Build a short practice trimmed to `length`: spot each place in walk order, then
 * which way to turn at each corner, then what comes next.
 */
export function buildSession(
  route: Landmark[],
  length: number,
  seed = Date.now(),
) {
  if (!route.length) return [] as Question[];
  const turns = planRoute(route.length).turns;
  const spot: Question[] = route.map((l, i) => ({
    kind: "spot",
    landmarkId: l.id,
    options: photoOptions(l.id, route, seed + i),
  }));
  const next: Question[] = route.map((l, i) => ({
    kind: "next",
    landmarkId: l.id,
    afterId: i === 0 ? "start" : route[i - 1].id,
    options: photoOptions(l.id, route, seed + 31 + i),
  }));
  // The turn made at landmark i is the turn at the start of leg i + 1.
  const turn: Question[] = route.slice(0, -1).map((l, i) => {
    const answer = turns[i + 1] ?? "straight";
    return {
      kind: "turn",
      landmarkId: l.id,
      answer,
      options: ["left", "straight", "right"] as Turn[],
    };
  });
  // Round 1: spot every place in walk order (so even a short walk covers all of
  // them). Round 2: the turns. Round 3: "what comes next", for longer sessions.
  const ordered: Question[] = [...spot, ...turn, ...next.slice(1)];
  return ordered.slice(0, Math.max(1, length));
}

/** Spaced retrieval: a question that needed a hint returns two questions later. */
export function requeue(queue: Question[], index: number) {
  const q = queue[index];
  const copy = [...queue];
  const at = Math.min(copy.length, index + 3);
  copy.splice(at, 0, q);
  return copy;
}

export function isCorrect(q: Question, choice: string) {
  return q.kind === "turn" ? choice === q.answer : choice === q.landmarkId;
}

interface PracticeState {
  familiarity: Record<string, Familiarity>;
  sessions: number;
  lastSession: number | null;
  record: (landmarkId: string, firstTry: boolean) => void;
  finishSession: () => void;
  clear: () => void;
}

export const usePractice = create<PracticeState>()(
  persist(
    (set) => ({
      familiarity: {},
      sessions: 0,
      lastSession: null,
      record: (id, firstTry) =>
        set((s) => {
          const f = s.familiarity[id] ?? {
            seen: 0,
            firstTry: 0,
            hinted: 0,
            lastFirstTry: false,
            lastPractised: 0,
          };
          return {
            familiarity: {
              ...s.familiarity,
              [id]: {
                seen: f.seen + 1,
                firstTry: f.firstTry + (firstTry ? 1 : 0),
                hinted: f.hinted + (firstTry ? 0 : 1),
                lastFirstTry: firstTry,
                lastPractised: Date.now(),
              },
            },
          };
        }),
      finishSession: () =>
        set((s) => ({ sessions: s.sessions + 1, lastSession: Date.now() })),
      clear: () => set({ familiarity: {}, sessions: 0, lastSession: null }),
    }),
    { name: "wayhome-practice-v1" },
  ),
);
