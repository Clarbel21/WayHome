import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useStore } from "../store";
export type ActivityKind = "faces" | "places" | "music" | "routine" | "garden";
export const activityNames: Record<ActivityKind, string> = {
  faces: "Familiar Faces",
  places: "My Happy Places",
  music: "Music Memories",
  routine: "Everyday Moments",
  garden: "Memory Garden",
};
export const kinds = Object.keys(activityNames) as ActivityKind[];
export interface MemoryEntry {
  id: string;
  kind: Exclude<ActivityKind, "garden">;
  title: string;
  relationship: string;
  description: string;
  artist: string;
  steps: string[];
  approved: boolean;
  sample: boolean;
  image?: string;
  imageId?: string;
  audioId?: string;
}
export interface Engagement {
  id: string;
  time: number;
  kind: ActivityKind;
  entryId?: string;
  action: "selected" | "completed" | "skipped" | "exited" | "paused";
  detail?: string;
}
export interface Session {
  id: string;
  kind: ActivityKind;
  entryId?: string;
  revealed: boolean;
  order: number[];
  completed: boolean;
  paused: boolean;
  response?: string;
}
export interface Preferences {
  preferred: ActivityKind[];
  duration: "short" | "unhurried";
  reminders: "off" | "daily" | "weekly";
  music: string;
  sound: boolean;
}
export const sampleEntries: MemoryEntry[] = [
  {
    id: "sample-mei",
    kind: "faces",
    title: "Mei",
    relationship: "daughter",
    description: "You enjoyed visiting the park together.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-family.svg",
  },
  {
    id: "sample-park",
    kind: "places",
    title: "The neighborhood park",
    relationship: "",
    description:
      "A gentle place for an afternoon stroll and a chat under the trees.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/garden.svg",
  },
  {
    id: "sample-song",
    kind: "music",
    title: "A song from a happy afternoon",
    relationship: "",
    description:
      "Think of a tune you enjoy. You can hum it together if you like.",
    artist: "Sample suggestion — no recording",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-walk",
    kind: "routine",
    title: "Let’s get ready for a morning walk.",
    relationship: "",
    description:
      "Every routine is personal. Choose an order that feels familiar.",
    artist: "",
    steps: ["Put on shoes", "Take your keys", "Go for a walk"],
    approved: true,
    sample: true,
  },
];
// Added in v2: more realistic, fictional samples. Appended after the originals so
// first visits are unchanged; migrated in for people with saved libraries.
export const sampleEntriesV2: MemoryEntry[] = [
  {
    id: "sample-daniel",
    kind: "faces",
    title: "Daniel",
    relationship: "grandson",
    description:
      "He visits on Sundays after football and always asks for your fried rice.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-grandson.svg",
  },
  {
    id: "sample-mrs-tan",
    kind: "faces",
    title: "Mrs Tan",
    relationship: "neighbour",
    description:
      "Your neighbour from two doors down. You often share kuih and talk about her orchids.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-neighbour.svg",
  },
  {
    id: "sample-market",
    kind: "places",
    title: "The Saturday morning market",
    relationship: "",
    description:
      "You liked picking the ripest mangoes here and chatting with the fruit seller.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/market.svg",
  },
  {
    id: "sample-kopi",
    kind: "places",
    title: "The kopi shop on the corner",
    relationship: "",
    description:
      "Where you meet old friends for teh tarik and toast after a morning walk.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/kopi.svg",
  },
  {
    id: "sample-wedding-song",
    kind: "music",
    title: "The song from your wedding day",
    relationship: "",
    description:
      "Think of the song you first danced to. Would you like to hum a little of it?",
    artist: "Sample suggestion — no recording",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-tea",
    kind: "routine",
    title: "Let’s make a cup of tea.",
    relationship: "",
    description: "There's no wrong order. Choose the steps the way you like.",
    artist: "",
    steps: [
      "Fill the kettle",
      "Put a tea bag in your cup",
      "Pour the water and add milk",
    ],
    approved: true,
    sample: true,
  },
];
// Added in v3: a fuller circle of familiar faces and real, well-known songs from the
// wearer's era. Songs list title and artist only (no lyrics or audio are bundled);
// caregivers can attach their own authorized recording.
export const sampleEntriesV3: MemoryEntry[] = [
  {
    id: "sample-jamie",
    kind: "faces",
    title: "Jamie",
    relationship: "son",
    description:
      "Jamie is your son and looks after you every day. He phones every evening at seven and you enjoy breakfast together on Saturdays.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-jamie.svg",
  },
  {
    id: "sample-morgan",
    kind: "faces",
    title: "Morgan",
    relationship: "nephew",
    description:
      "Morgan is your sister's son. He fixes things around the house and drives you to the market when Jamie is busy.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-morgan.svg",
  },
  {
    id: "sample-lily",
    kind: "faces",
    title: "Lily",
    relationship: "granddaughter",
    description:
      "Lily is Daniel's little sister. She loves drawing flowers for you and always asks to hear stories about when you were young.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-lily.svg",
  },
  {
    id: "sample-sarah",
    kind: "faces",
    title: "Sarah",
    relationship: "daughter-in-law",
    description:
      "Sarah is married to Jamie. She makes your favourite chicken soup and brings it over every Wednesday.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-sarah.svg",
  },
  {
    id: "sample-ahseng",
    kind: "faces",
    title: "Ah Seng",
    relationship: "younger brother",
    description:
      "Ah Seng is your younger brother. You grew up in the same kampung and still laugh about climbing the rambutan tree.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-ahseng.svg",
  },
  {
    id: "sample-siti",
    kind: "faces",
    title: "Auntie Siti",
    relationship: "neighbour",
    description:
      "Auntie Siti lives across the road. She waves from her garden every morning and brings kuih at Hari Raya.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-siti.svg",
  },
  {
    id: "sample-lim",
    kind: "faces",
    title: "Uncle Lim",
    relationship: "friend from the kopi shop",
    description:
      "Uncle Lim runs the kopi shop on the corner. He remembers that you like your kopi-o with less sugar.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-lim.svg",
  },
  {
    id: "sample-kumar",
    kind: "faces",
    title: "Dr Kumar",
    relationship: "family doctor",
    description:
      "Dr Kumar has been your family doctor for many years. He always asks about your morning walks.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-kumar.svg",
  },
  {
    id: "sample-priya",
    kind: "faces",
    title: "Priya",
    relationship: "community nurse",
    description:
      "Priya visits on Tuesdays to check in on you. She enjoys hearing about your garden.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-priya.svg",
  },
  {
    id: "sample-wong",
    kind: "faces",
    title: "Mr Wong",
    relationship: "old friend from work",
    description:
      "Mr Wong worked with you for twenty years. You still meet him for dim sum on the first Sunday of the month.",
    artist: "",
    steps: [],
    approved: true,
    sample: true,
    image: "/images/memory-wong.svg",
  },
  {
    id: "sample-song-moon",
    kind: "music",
    title: "The Moon Represents My Heart (月亮代表我的心)",
    relationship: "",
    description:
      "A gentle love song many families sing together. Did you ever hear it on the radio in the evening?",
    artist: "Teresa Teng · 1977",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-tianmimi",
    kind: "music",
    title: "Tian Mi Mi (甜蜜蜜)",
    relationship: "",
    description:
      "A sweet, cheerful song from the late seventies. Would you like to hum along with your caregiver?",
    artist: "Teresa Teng · 1979",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-getaran",
    kind: "music",
    title: "Getaran Jiwa",
    relationship: "",
    description:
      "A much-loved Malay classic from the golden age of film. Do you remember watching P. Ramlee's movies?",
    artist: "P. Ramlee · 1960s",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-bulan",
    kind: "music",
    title: "Engkau Laksana Bulan",
    relationship: "",
    description:
      "A soft, romantic melody. Who would you have sung this song with?",
    artist: "P. Ramlee · 1960s",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-bengawan",
    kind: "music",
    title: "Bengawan Solo",
    relationship: "",
    description:
      "A song about the Solo River in Java, sung across the region for generations. Does it remind you of anyone?",
    artist: "Gesang · 1940s",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-rasasayang",
    kind: "music",
    title: "Rasa Sayang",
    relationship: "",
    description:
      "A cheerful folk song often sung at gatherings and on school trips. Would you like to clap along?",
    artist: "Traditional folk song",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-burung",
    kind: "music",
    title: "Burung Kakak Tua",
    relationship: "",
    description:
      "A playful song about a cockatoo that children love. Did you sing it with your grandchildren?",
    artist: "Traditional folk song",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-cant-help",
    kind: "music",
    title: "Can't Help Falling in Love",
    relationship: "",
    description:
      "A slow dance favourite. Was there a special dance you remember?",
    artist: "Elvis Presley · 1961",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-wonderful",
    kind: "music",
    title: "What a Wonderful World",
    relationship: "",
    description:
      "A warm, hopeful song. What makes your world feel wonderful today?",
    artist: "Louis Armstrong · 1967",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-moonriver",
    kind: "music",
    title: "Moon River",
    relationship: "",
    description:
      "A dreamy tune from the film Breakfast at Tiffany's. Did you enjoy going to the cinema?",
    artist: "Audrey Hepburn · 1961",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-quesera",
    kind: "music",
    title: "Que Sera, Sera",
    relationship: "",
    description:
      "A light-hearted song about not worrying over what's to come. Did someone sing this to you?",
    artist: "Doris Day · 1956",
    steps: [],
    approved: true,
    sample: true,
  },
  {
    id: "sample-song-unchained",
    kind: "music",
    title: "Unchained Melody",
    relationship: "",
    description:
      "A tender song that many couples danced to. Does it bring back a memory?",
    artist: "The Righteous Brothers · 1965",
    steps: [],
    approved: true,
    sample: true,
  },
];
export function safetyReady() {
  const s = useStore.getState();
  if (s.incident && s.incident.stage !== "resolved") return false;
  const reviewed =
    s.mode === "CHECK_IN" &&
    s.incident?.stage === "resolved" &&
    s.reviewedIncident?.id === s.incident.id &&
    s.reviewedIncident?.revision === s.incident.revision;
  return (
    !!reviewed ||
    (s.mode === "NORMAL" &&
      s.connected &&
      s.wearStatus === "likely_worn" &&
      s.signals.gpsConfidence >= 0.6)
  );
}
interface MemoryState {
  entries: MemoryEntry[];
  preferences: Preferences;
  stage: "invite" | "home" | "activity";
  session: Session | null;
  growth: ("flower" | "leaf" | "butterfly" | "tree")[];
  history: Engagement[];
  saveEntry: (entry: MemoryEntry) => void;
  deleteEntry: (id: string) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  begin: () => void;
  start: (kind: ActivityKind, id?: string) => boolean;
  respond: (detail: string) => void;
  selectStep: (index: number) => void;
  undoStep: () => void;
  complete: (plant?: "flower" | "leaf" | "butterfly" | "tree") => void;
  skip: () => void;
  exit: () => void;
  home: () => void;
  pause: () => void;
  resume: () => void;
  invite: () => void;
}
const log = (
  session: Session,
  action: Engagement["action"],
  detail?: string,
): Engagement => ({
  id: crypto.randomUUID(),
  time: Date.now(),
  kind: session.kind,
  entryId: session.entryId,
  action,
  detail,
});
export const useMemory = create<MemoryState>()(
  persist(
    (set, get) => ({
      entries: [...sampleEntries, ...sampleEntriesV2, ...sampleEntriesV3],
      preferences: {
        preferred: [...kinds],
        duration: "unhurried",
        reminders: "off",
        music: "",
        sound: false,
      },
      stage: "invite",
      session: null,
      growth: [],
      history: [],
      saveEntry: (entry) => {
        set((s) => ({
          entries: s.entries.some((e) => e.id === entry.id)
            ? s.entries.map((e) => (e.id === entry.id ? entry : e))
            : [...s.entries, entry],
        }));
        if (get().session?.entryId === entry.id && !entry.approved)
          get().pause();
      },
      deleteEntry: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
        if (get().session?.entryId === id) get().pause();
      },
      setPreferences: (patch) =>
        set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      begin: () => set((s) => ({ stage: s.session ? "activity" : "home" })),
      start: (kind, id) => {
        if (!safetyReady()) return false;
        const s = get();
        // The early placeholder samples go last, so real people and songs
        // (caregiver-added or the realistic samples) come up first.
        const generic = new Set(
          [...sampleEntries, ...sampleEntriesV2].map((e) => e.id),
        );
        const choices = s.entries
          .filter((e) => e.kind === kind && e.approved && (!id || e.id === id))
          .sort(
            (a, b) => Number(generic.has(a.id)) - Number(generic.has(b.id)),
          );
        const entry =
          kind === "garden"
            ? undefined
            : choices[
                id
                  ? 0
                  : s.history.filter(
                      (h) => h.kind === kind && h.action === "selected",
                    ).length % choices.length
              ];
        if (kind !== "garden" && !entry) return false;
        const session: Session = {
          id: crypto.randomUUID(),
          kind,
          entryId: entry?.id,
          revealed: false,
          order: [],
          completed: false,
          paused: false,
        };
        set({
          session,
          stage: "activity",
          history: [log(session, "selected"), ...s.history].slice(0, 300),
        });
        return true;
      },
      respond: (detail) => {
        const s = get();
        if (
          !s.session ||
          s.session.completed ||
          s.session.paused ||
          !safetyReady() ||
          !eligible(s)
        )
          return;
        set({ session: { ...s.session, revealed: true, response: detail } });
        if (s.session.kind !== "routine" && s.session.kind !== "garden")
          get().complete();
      },
      selectStep: (index) =>
        set((s) => {
          const entry = s.entries.find(
            (e) => e.id === s.session?.entryId && e.approved,
          );
          if (
            !s.session ||
            s.session.kind !== "routine" ||
            s.session.paused ||
            s.session.completed ||
            !safetyReady() ||
            !entry ||
            index < 0 ||
            index >= entry.steps.length ||
            s.session.order.includes(index)
          )
            return {};
          return {
            session: { ...s.session, order: [...s.session.order, index] },
          };
        }),
      undoStep: () =>
        set((s) =>
          s.session &&
          s.session.kind === "routine" &&
          !s.session.paused &&
          !s.session.completed &&
          safetyReady() &&
          eligible(s)
            ? { session: { ...s.session, order: s.session.order.slice(0, -1) } }
            : {},
        ),
      complete: (plant = "flower") =>
        set((s) => {
          if (
            !s.session ||
            s.session.completed ||
            s.session.paused ||
            !safetyReady() ||
            !eligible(s)
          )
            return {};
          const entry = s.entries.find((e) => e.id === s.session?.entryId);
          if (
            s.session.kind === "routine" &&
            s.session.order.length !== entry?.steps.length
          )
            return {};
          return {
            session: { ...s.session, completed: true, revealed: true },
            growth: [...s.growth, plant],
            history: [
              log(s.session, "completed", s.session.response),
              ...s.history,
            ].slice(0, 300),
          };
        }),
      skip: () =>
        set((s) => ({
          stage: "home",
          session: null,
          history:
            s.session && !s.session.completed
              ? [log(s.session, "skipped"), ...s.history].slice(0, 300)
              : s.history,
        })),
      exit: () =>
        set((s) => ({
          stage: "invite",
          session: s.session ? { ...s.session, paused: true } : null,
          history: s.session
            ? [log(s.session, "exited"), ...s.history].slice(0, 300)
            : s.history,
        })),
      home: () => set({ stage: "home", session: null }),
      pause: () =>
        set((s) =>
          s.session && !s.session.paused
            ? {
                session: { ...s.session, paused: true },
                history: [
                  log(s.session, "paused", "Safety or presenter pause"),
                  ...s.history,
                ].slice(0, 300),
              }
            : {},
        ),
      resume: () => {
        if (safetyReady())
          set((s) => ({
            session: s.session ? { ...s.session, paused: false } : null,
            stage: s.session ? "activity" : "home",
          }));
      },
      invite: () => set({ stage: "invite", session: null }),
    }),
    {
      name: "wayhome-memory-v1",
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as MemoryState;
        if (Array.isArray(state?.entries)) {
          const add = [
            ...(version < 2 ? sampleEntriesV2 : []),
            ...(version < 3 ? sampleEntriesV3 : []),
          ];
          const have = new Set(state.entries.map((e) => e.id));
          state.entries = [
            ...state.entries,
            ...add.filter((e) => !have.has(e.id)),
          ];
        }
        return state;
      },
    },
  ),
);
function eligible(s: MemoryState) {
  return (
    s.session?.kind === "garden" ||
    s.entries.some((e) => e.id === s.session?.entryId && e.approved)
  );
}
// Games observe safety; they never change the safety machine or clear an emergency.
useStore.subscribe(() => {
  if (!safetyReady()) useMemory.getState().pause();
});
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === "wayhome-memory-v1") void useMemory.persist.rehydrate();
  });
