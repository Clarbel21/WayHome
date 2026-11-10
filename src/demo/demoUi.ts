import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DemoStory = "walk" | "checkin" | "family" | "explore";
export type DemoDevice = "watch" | "caregiver";
// Presentation only. Incidents, observations and decisions remain in existing stores.
export const useDemoUi = create<{
  story: DemoStory;
  device: DemoDevice;
  chooseStory: (story: DemoStory) => void;
  chooseDevice: (device: DemoDevice) => void;
}>()(
  persist(
    (set) => ({
      story: "walk",
      device: "watch",
      chooseStory: (story) => set({ story }),
      chooseDevice: (device) => set({ device }),
    }),
    {
      name: "wayhome-demo-ui-v1",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

// An action may suggest a handoff, but never switches the selected device itself.
export const useDemoHandoff = create<{
  suggested: DemoDevice | null;
  suggest: (device: DemoDevice) => void;
}>((set) => ({ suggested: null, suggest: (suggested) => set({ suggested }) }));
export function requestDemoDevice(device: DemoDevice) {
  useDemoHandoff.getState().suggest(device);
}
