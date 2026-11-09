import { useRef } from "react";
import { useStore } from "../store";
import { useT } from "../i18n";
import { useCaregiverPopups } from "../services/caregiverPopup";

export function SOSButton() {
  const t = useT();
  const lastActivation = useRef(0);
  function send() {
    // A double tap or repeated key must not create duplicate SOS alerts.
    const now = performance.now();
    if (lastActivation.current && now - lastActivation.current < 600) return;
    lastActivation.current = now;
    useStore.getState().event("SOS");
    useCaregiverPopups
      .getState()
      .notify("SOS sent from the watch", "Urgent help requested", true);
  }
  return (
    <button
      type="button"
      className="sos-hold"
      data-caregiver-skip-notification="true"
      onClick={send}
      onKeyDown={(event) => {
        if (event.repeat && (event.key === " " || event.key === "Enter"))
          event.preventDefault();
      }}
    >
      SOS <span>{t("sosTap")}</span>
    </button>
  );
}
