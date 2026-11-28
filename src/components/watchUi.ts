import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Which activity owns the watch screen. G2/G3 reuse the same game shell. */
export type WatchGameDeck = "landmarks" | "faces" | "places";

/**
 * Which app the watch screen is showing. The Memory Garden and the Game lane
 * run on the watch itself, so this is per-tab (sessionStorage) and survives a
 * reload. Opening one always closes the other.
 */
export const useWatchUi = create<{
  memories: boolean;
  game: WatchGameDeck | null;
  openMemories: () => void;
  closeMemories: () => void;
  openGame: (deck: WatchGameDeck) => void;
  closeGame: () => void;
}>()(
  persist(
    (set) => ({
      memories: false,
      game: null,
      openMemories: () => set({ memories: true, game: null }),
      closeMemories: () => set({ memories: false }),
      openGame: (deck) => set({ game: deck, memories: false }),
      closeGame: () => set({ game: null }),
    }),
    {
      name: "wayhome-watch-ui-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ memories: s.memories, game: s.game }),
    },
  ),
);
