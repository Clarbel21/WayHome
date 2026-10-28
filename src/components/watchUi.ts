import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Which app the watch screen is showing. The Memory Garden runs on the watch
 * itself, so this is per-tab (sessionStorage) and survives a reload.
 */
export const useWatchUi = create<{
  memories: boolean;
  openMemories: () => void;
  closeMemories: () => void;
}>()(
  persist(
    (set) => ({
      memories: false,
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
