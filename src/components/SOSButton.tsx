import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
export function SOSButton() {
  const event = useStore((s) => s.event);
  const [holding, setHolding] = useState(false);
  const started = useRef<number | null>(null);
  const sent = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    started.current = null;
    setHolding(false);
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  const hold = () => {
    if (timer.current) return;
    setHolding(true);
    started.current = performance.now();
    sent.current = false;
    timer.current = setTimeout(() => {
      if (!sent.current) {
        sent.current = true;
        event("SOS");
      }
      cancel();
    }, 2000);
  };
  const release = () => {
    if (
      started.current !== null &&
      !sent.current &&
      performance.now() - started.current >= 2000
    ) {
      sent.current = true;
      event("SOS");
    }
    cancel();
  };
  return (
    <button
      className={`sos-hold ${holding ? "holding" : ""}`}
      onPointerDown={(e) => {
        if (e.button !== 0 || !e.isPrimary) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        hold();
      }}
      onPointerUp={release}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          hold();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") release();
      }}
      onBlur={cancel}
    >
      SOS <span>{holding ? "Keep holding…" : "Hold for 2 seconds"}</span>
    </button>
  );
}
