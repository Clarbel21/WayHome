import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
export function SOSButton() {
  const event = useStore((s) => s.event);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const hold = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      event("SOS");
      cancel();
    }, 2000);
  };
  return (
    <button
      className={`sos-hold ${holding ? "holding" : ""}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        hold();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          hold();
        }
      }}
      onKeyUp={cancel}
      onBlur={cancel}
    >
      SOS <span>{holding ? "Keep holding…" : "Hold for 2 seconds"}</span>
    </button>
  );
}
