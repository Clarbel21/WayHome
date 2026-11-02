import { create } from "zustand";

export type CaregiverPopup = {
  id: string;
  title: string;
  detail: string;
  time: number;
  urgent: boolean;
};

type CaregiverPopupState = {
  popups: CaregiverPopup[];
  notify: (title: string, detail: string, urgent?: boolean) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const KEY = "wayhome-caregiver-popup-v1";

function addPopup(popup: CaregiverPopup) {
  useCaregiverPopups.setState((state) => ({
    popups: [
      popup,
      ...state.popups.filter((item) => item.id !== popup.id),
    ].slice(0, 3),
  }));
}

export const useCaregiverPopups = create<CaregiverPopupState>((set) => ({
  popups: [],
  notify: (title, detail, urgent = false) => {
    const popup: CaregiverPopup = {
      id: crypto.randomUUID(),
      title,
      detail,
      time: Date.now(),
      urgent,
    };
    addPopup(popup);
    try {
      localStorage.setItem(KEY, JSON.stringify(popup));
    } catch {
      /* Same-document notification still works if storage is unavailable. */
    }
  },
  dismiss: (id) =>
    set((state) => ({
      popups: state.popups.filter((popup) => popup.id !== id),
    })),
  clear: () => set({ popups: [] }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY || !event.newValue) return;
    try {
      const popup = JSON.parse(event.newValue) as CaregiverPopup;
      if (Date.now() - popup.time < 15000) addPopup(popup);
    } catch {
      /* Ignore malformed cross-tab messages. */
    }
  });
}
