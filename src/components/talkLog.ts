import { create } from "zustand";

// Talk lane: a short text log of the wearer's conversations with Momo,
// shown on the caregiver phone (Updates → Talk log). Text only — no audio
// is recorded or stored anywhere. Last 10 lines, newest last.
export interface TalkLogLine {
  at: number;
  you: string;
  momo: string;
  /** Lines the caregiver should notice: take me home, call …, where am I, help. */
  matters: boolean;
}

const MATTERS = /(take me home|go home|pulang|\bcall\b|where|help)/i;

export const useTalkLog = create<{
  lines: TalkLogLine[];
  addLine: (you: string, momo: string) => void;
  clear: () => void;
}>()((set) => ({
  lines: [],
  addLine: (you, momo) =>
    set((s) => ({
      lines: [
        ...s.lines,
        { at: Date.now(), you, momo, matters: MATTERS.test(you) },
      ].slice(-10),
    })),
  clear: () => set({ lines: [] }),
}));
