import { create } from "zustand";

/* Find My-style band ringing. The caregiver phone requests it; every mounted
   wearable rings (shake + tone) until the wearer stops it or it times out.
   Same-origin tabs share the request through localStorage, like the main
   safety store's cross-tab synchronization. */

export type FindRing = { id: string; requestedAt: number; by: string };

type FindState = {
  ringing: FindRing | null;
  start: (by: string) => void;
  stop: () => void;
};

const KEY = "wayhome-find-v1";

export const useFind = create<FindState>((set) => ({
  ringing: null,
  start: (by) => {
    const ringing: FindRing = {
      id: crypto.randomUUID(),
      requestedAt: Date.now(),
      by,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(ringing));
    } catch {
      /* storage unavailable; same-document ringing still works */
    }
    set({ ringing });
  },
  stop: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ ringing: null });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    if (!e.newValue) {
      if (useFind.getState().ringing) useFind.setState({ ringing: null });
      return;
    }
    try {
      useFind.setState({ ringing: JSON.parse(e.newValue) as FindRing });
    } catch {
      /* ignore malformed writes */
    }
  });
}

/* A gentle repeating two-tone ring. Audio starts only from the caregiver's
   click gesture; in a separate wearable tab the browser may keep the context
   muted, so the shake and screen still carry the request there. */
let ctx: AudioContext | null = null;
let loop: number | null = null;

function chime(c: AudioContext) {
  const now = c.currentTime;
  (
    [
      [988, 0],
      [1319, 0.3],
    ] as const
  ).forEach(([frequency, at]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(0.12, now + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
    o.connect(g);
    g.connect(c.destination);
    o.start(now + at);
    o.stop(now + at + 0.55);
  });
}

export function startRingtone() {
  if (loop !== null) return;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return;
  ctx = ctx ?? new AC();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  chime(ctx);
  loop = window.setInterval(() => ctx && chime(ctx), 1100);
}

export function stopRingtone() {
  if (loop !== null) {
    window.clearInterval(loop);
    loop = null;
  }
}
