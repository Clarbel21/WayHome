import { useEffect } from "react";

// Call lane C2. While the ringing screen is shown, play a soft phone ring
// (two short tones, then a pause) and buzz phones that support vibration.
// Web Audio only starts after a tap, which is how the wearer gets here.
export function RingTone() {
  useEffect(() => {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    let ctx: AudioContext | null = null;
    try {
      ctx = Ctx ? new Ctx() : null;
    } catch {
      ctx = null;
    }
    const ring = () => {
      try {
        navigator.vibrate?.([400, 200, 400]);
      } catch {
        /* vibration is optional */
      }
      if (!ctx) return;
      const t0 = ctx.currentTime;
      for (const start of [0, 0.6]) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t0 + start);
        gain.gain.linearRampToValueAtTime(0.12, t0 + start + 0.03);
        gain.gain.setValueAtTime(0.12, t0 + start + 0.37);
        gain.gain.linearRampToValueAtTime(0, t0 + start + 0.4);
        gain.connect(ctx.destination);
        for (const f of [400, 450]) {
          const osc = ctx.createOscillator();
          osc.frequency.value = f;
          osc.connect(gain);
          osc.start(t0 + start);
          osc.stop(t0 + start + 0.4);
        }
      }
    };
    ring();
    const timer = window.setInterval(ring, 3000);
    return () => {
      window.clearInterval(timer);
      try {
        navigator.vibrate?.(0);
      } catch {
        /* ignore */
      }
      void ctx?.close().catch(() => undefined);
    };
  }, []);
  return null;
}

// When the call is answered, play that person's recorded message if the
// team has added one: public/audio/call-<contact id>.mp3 (e.g. call-jamie.mp3).
// Missing file = silence; nothing breaks.
export function CallRecording({ contactId }: { contactId?: string }) {
  useEffect(() => {
    if (!contactId || typeof Audio === "undefined") return;
    const audio = new Audio(
      `${import.meta.env.BASE_URL}audio/call-${contactId}.mp3`,
    );
    void audio.play().catch(() => undefined);
    return () => audio.pause();
  }, [contactId]);
  return null;
}
