import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Which app the watch screen is showing. The Memory Garden runs on the watch
 * itself, so this is per-tab (sessionStorage) and survives a reload.
 */
export const useWatchUi = create<{
  homePage: "idle" | "welcome" | "help" | "talk";
  setHomePage: (page: "idle" | "welcome" | "help" | "talk") => void;
  memories: boolean;
  modeRequest: number;
  openMode: () => void;
  openMemories: () => void;
  closeMemories: () => void;
}>()(
  persist(
    (set) => ({
      homePage: "idle",
      setHomePage: (homePage) => set({ homePage }),
      memories: false,
      modeRequest: 0,
      openMode: () => set((s) => ({ modeRequest: s.modeRequest + 1 })),
      openMemories: () => set({ memories: true }),
      closeMemories: () => set({ memories: false }),
    }),
    {
      name: "wayhome-watch-ui-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ memories: s.memories }),
    },
  ),
);
