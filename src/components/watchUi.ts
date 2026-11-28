import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Which activity owns the watch screen. G1–G3 reuse the same game shell. */
export type WatchGameDeck = "landmarks" | "faces" | "places";

/**
 * Which app the watch screen is showing. The Memory Garden and the Game lane
 * run on the watch itself, so this is per-tab (sessionStorage) and survives a
 * reload. Opening one always closes the other.
 */
export const useWatchUi = create<{
  memories: boolean;
  /** The Game tile first offers a deck choice (Places / Faces / Happy places). */
  gamePicker: boolean;
  game: WatchGameDeck | null;
  openMemories: () => void;
  closeMemories: () => void;
  openGamePicker: () => void;
  closeGamePicker: () => void;
  openGame: (deck: WatchGameDeck) => void;
  closeGame: () => void;
}>()(
  persist(
    (set) => ({
      memories: false,
      gamePicker: false,
      game: null,
      openMemories: () =>
        set({ memories: true, gamePicker: false, game: null }),
      closeMemories: () => set({ memories: false }),
      openGamePicker: () =>
        set({ gamePicker: true, game: null, memories: false }),
      closeGamePicker: () => set({ gamePicker: false }),
      openGame: (deck) =>
        set({ game: deck, gamePicker: false, memories: false }),
      closeGame: () => set({ game: null, gamePicker: false }),
    }),
    {
      name: "wayhome-watch-ui-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        memories: s.memories,
        gamePicker: s.gamePicker,
        game: s.game,
      }),
    },
  ),
);
