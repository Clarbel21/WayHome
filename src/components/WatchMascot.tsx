import { useState } from "react";
import { Sprout } from "./Sprout";
import { useStore } from "../store";
import { useLang } from "../i18n";

// Authored reassurance only; touching Sprout never answers a safety request.
export function useMascotInteraction(initialTouches = 0) {
  const [touches, setTouches] = useState(initialTouches);
  const id = useLang((l) => l.lang) === "id";
  const replies = id
    ? [
        "Senang melihatmu.",
        "Aku di sini bersamamu.",
        "Kita bisa pelan-pelan.",
        "Kamu disayangi.",
      ]
    : [
        "It’s lovely to see you.",
        "I’m here with you.",
        "We can take our time.",
        "You are cared for.",
      ];
  const reply = replies[Math.max(0, touches - 1) % replies.length];
  function hello() {
    const next = replies[touches % replies.length];
    setTouches((value) => value + 1);
    if (useStore.getState().settings.voice && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const words = new SpeechSynthesisUtterance(next);
      words.lang = id ? "id-ID" : "en-US";
      window.speechSynthesis.speak(words);
    }
  }
  return { touches, reply, hello };
}

export function WatchMascot() {
  const name = useStore((s) => s.settings.companionName);
  const id = useLang((l) => l.lang) === "id";
  const { touches, reply, hello } = useMascotInteraction();
  return (
    <div className={"watch-mascot" + (touches ? " mascot-touched" : "")}>
      <button
        type="button"
        className="mascot-touch"
        onClick={hello}
        data-caregiver-skip-notification="true"
        aria-label={(id ? "Bicara dengan " : "Talk with ") + name}
      >
        <Sprout key={touches} />
      </button>
      <p className="mascot-reply" role="status" aria-live="polite">
        {touches > 0 ? reply : ""}
      </p>
    </div>
  );
}
