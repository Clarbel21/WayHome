import { useEffect, useState } from "react";
import {
  Battery,
  Wifi,
  Phone,
  ArrowRight,
  Heart,
  House,
  ShieldAlert,
} from "lucide-react";
import { messages, useStore } from "../store";
import { attachmentNames, wearLabels } from "../services/safety";
import { LandmarkPhoto } from "./LandmarkPhoto";
import { SOSButton } from "./SOSButton";
import { Sprout } from "./Sprout";
export { Photo } from "./Photo";
export function Wearable({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const [now, setNow] = useState(new Date());
  const approved = s.landmarks.filter((l) => l.approved);
  const landmark = approved[s.guideIndex];
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (s.settings.voice && "speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(
        messages(s.settings.companionName)[s.mode],
      );
      window.speechSynthesis.speak(speech);
      return () => window.speechSynthesis.cancel();
    }
  }, [s.mode, s.settings.voice, s.settings.companionName]);
  return (
    <div className={`watch-area ${s.attachment} ${compact ? "compact" : ""}`}>
      <div className="watch-strap top" />
      <div className="watch">
        <div className="watch-crown" />
        <div className="watch-screen">
          <div className="watch-status">
            <span>
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span>
              {s.connected ? <Wifi size={13} /> : <span>Offline</span>}
              <Battery size={17} />
              {s.battery}%
            </span>
          </div>
          <div className="watch-label">
            WAYHOME <span>• {s.connected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="wearable-module">
            {attachmentNames[s.attachment]} · {wearLabels[s.wearStatus]}{" "}
            (inferred)
          </div>
          <div className="wearable-name">{s.settings.companionName}</div>
          <Sprout small={compact} />
          <div className="speech" aria-live="polite">
            {messages(s.settings.companionName)[s.mode]}
          </div>
          {s.mode === "GUIDED_RETURN" &&
            (landmark ? (
              <div className="watch-landmark">
                <LandmarkPhoto landmark={landmark} />
                <strong>{landmark.name}</strong>
                <p>{landmark.instruction}</p>
                {(!s.connected || !s.worn || s.signals.gpsConfidence < 0.6) && (
                  <p role="status">
                    Guidance paused. Ask your caregiver to review attachment and
                    location readings.
                  </p>
                )}
                <button
                  className="watch-action"
                  disabled={
                    !s.connected || !s.worn || s.signals.gpsConfidence < 0.6
                  }
                  onClick={s.nextLandmark}
                >
                  {s.guideIndex === approved.length - 1
                    ? "I'm home"
                    : "I see it · Next step"}
                  <ArrowRight size={16} />
                </button>
                <button className="text-button" onClick={() => s.event("LOST")}>
                  I'm confused
                </button>
              </div>
            ) : (
              <div className="watch-landmark">
                <p>No approved landmarks yet.</p>
                <button
                  className="watch-action"
                  onClick={() => s.event("HELP")}
                >
                  Contact my caregiver
                </button>
              </div>
            ))}
          {s.mode === "REORIENTATION" && (
            <div className="watch-landmark">
              {approved[0] && <LandmarkPhoto landmark={approved[0]} />}
              <p>Let's find a place you recognize.</p>
              <button className="watch-action" onClick={() => s.event("GUIDE")}>
                Find a familiar place <House size={16} />
              </button>
              <button className="text-button" onClick={() => s.event("HELP")}>
                Call {s.settings.caregiver}
              </button>
            </div>
          )}
          {s.mode === "CAREGIVER_HANDOVER" && (
            <div className="watch-landmark">
              <div className="avatar">{s.settings.caregiver.slice(0, 1)}</div>
              <strong>{s.settings.caregiver}</strong>
              <p>Caregiver notification sent — simulation</p>
              <button className="watch-action" onClick={() => s.event("HELP")}>
                <Phone size={16} /> Send another request
              </button>
            </div>
          )}
          {s.mode === "EMERGENCY_SIMULATED" && (
            <div className="sos-message">
              <ShieldAlert size={24} />
              <p>
                {s.settings.caregiver} and {s.settings.emergency} are shown as
                notified in this demo.
              </p>
              <small>No real calls or emergency messages are sent.</small>
            </div>
          )}
          {["NORMAL", "CHECK_IN"].includes(s.mode) && (
            <div className="watch-controls">
              <button className="watch-action" onClick={() => s.event("OKAY")}>
                <Heart size={17} />
                I'm okay
              </button>
              <button
                onClick={() =>
                  s.event(s.mode === "CHECK_IN" ? "LOST" : "GUIDE")
                }
              >
                <House size={17} />
                {s.mode === "CHECK_IN" ? "I need help" : "Help me get home"}
              </button>
              <button onClick={() => s.event("HELP")}>
                <Phone size={17} />
                Call my caregiver
              </button>
            </div>
          )}
          <SOSButton />
        </div>
      </div>
      <div className="watch-strap bottom" />
    </div>
  );
}
