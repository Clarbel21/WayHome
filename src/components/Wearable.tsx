import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Battery, Wifi, Phone, Heart, House, ShieldAlert } from "lucide-react";
import { messages, useStore, navigable } from "../store";
import { attachmentNames, wearLabels } from "../services/safety";
import { LandmarkPhoto } from "./LandmarkPhoto";
import { ResolveSOSButton } from "./ResolveSOSButton";
import { SOSButton } from "./SOSButton";
import { Sprout } from "./Sprout";
export { Photo } from "./Photo";
export function Wearable({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const location = useLocation();
  const [talking, setTalking] = useState(false);
  const [comfort, setComfort] = useState(false);
  useEffect(() => {
    if (s.mode !== "NORMAL") setTalking(false);
  }, [s.mode]);
  const acknowledged =
    s.checkIn?.response === "okay" &&
    s.checkIn.source !== "caregiver" &&
    s.interactionNote.startsWith("Thank you for telling me") &&
    s.mode !== "EMERGENCY_SIMULATED";
  const [now, setNow] = useState(new Date());
  const approved = s.landmarks.filter(navigable);
  const landmark = approved[s.guideIndex];
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (s.settings.voice && "speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(
        s.mode === "GUIDED_RETURN"
          ? !s.connected ||
            s.wearStatus !== "likely_worn" ||
            s.signals.gpsConfidence < 0.6
            ? "Guidance is paused. Your caregiver can help."
            : landmark?.spokenCue ||
              landmark?.instruction ||
              "No approved landmarks are available. Your caregiver can help."
          : messages(s.settings.companionName)[s.mode],
      );
      window.speechSynthesis.speak(speech);
      return () => window.speechSynthesis.cancel();
    }
  }, [
    s.mode,
    s.settings.voice,
    s.settings.companionName,
    landmark?.id,
    landmark?.spokenCue,
    landmark?.instruction,
    s.connected,
    s.wearStatus,
    s.signals.gpsConfidence,
  ]);
  return (
    <div
      className={`watch-area mode-${s.mode.toLowerCase()} ${s.attachment} ${compact ? "compact" : ""}`}
    >
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
            {s.mode === "CHECK_IN" &&
            !acknowledged &&
            s.checkIn?.stage === "help_options"
              ? "How can I help?"
              : messages(s.settings.companionName)[s.mode]}
          </div>
          {talking && s.mode === "NORMAL" && (
            <div className="watch-controls">
              <p>
                {comfort
                  ? "Take your time. You are welcome here, just as you are."
                  : "I'm here to keep you company. We can take a quiet moment together."}
              </p>
              <button className="watch-action" onClick={() => setComfort(true)}>
                Something comforting
              </button>
              <button
                onClick={() => {
                  setTalking(false);
                  setComfort(false);
                }}
              >
                Back to wearable home
              </button>
            </div>
          )}
          {acknowledged && (
            <div className="watch-controls">
              <Link
                className="watch-action"
                to="/memories"
                state={{ from: location.pathname }}
              >
                Open Memory Garden
              </Link>
              <button onClick={s.dismissAcknowledgment}>
                Return to wearable home
              </button>
            </div>
          )}
          {s.interactionNote && s.mode !== "EMERGENCY_SIMULATED" && (
            <p role="status">{s.interactionNote}</p>
          )}
          {s.mode === "GUIDED_RETURN" &&
            (landmark ? (
              <div className="watch-landmark">
                <LandmarkPhoto landmark={landmark} />
                <strong>{landmark.name}</strong>
                <p>{landmark.instruction}</p>
                {landmark.recognition && (
                  <p className="recognition-cue">{landmark.recognition}</p>
                )}
                <small>
                  Approx.{" "}
                  {Math.max(
                    10,
                    ((landmark.gridPosition ?? s.guideIndex) + 1) * 40 -
                      s.position * 10,
                  )}{" "}
                  m · simulated, not measured
                </small>
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
                  onClick={() => s.nextLandmark(landmark.id)}
                >
                  I see it
                </button>
                <button
                  className="watch-action"
                  onClick={() => s.chooseAssistance("unrecognized")}
                >
                  I don't see it
                </button>
                <button
                  className="watch-action"
                  onClick={() => s.chooseAssistance("family")}
                >
                  Call my family
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
              <p>
                Take your time. You don't need to remember anything right now.
              </p>
              <button
                className="watch-action"
                onClick={() => s.chooseAssistance("family")}
              >
                Contact my family
              </button>
            </div>
          )}
          {s.mode === "CAREGIVER_HANDOVER" && (
            <div className="watch-landmark">
              <div className="avatar">{s.settings.caregiver.slice(0, 1)}</div>
              <strong>{s.settings.caregiver}</strong>
              {!s.familyRequest && (
                <button
                  className="watch-action"
                  onClick={() => s.chooseAssistance("family")}
                >
                  Contact my family
                </button>
              )}
              <p>
                {!s.familyRequest
                  ? "Your caregiver needs to review this concern."
                  : s.familyRequest?.status === "responded"
                    ? `${s.settings.caregiver} has responded in this demo. They are here to help.`
                    : "Waiting for caregiver response"}
              </p>
              <small>
                {s.familyRequest
                  ? "Caregiver notification sent — simulation. No real call was made."
                  : "No real call or message has been sent."}
              </small>
              {s.familyRequest?.status === "acknowledged" && (
                <p>Your caregiver has seen your request.</p>
              )}
              {s.familyRequest?.status === "responded" && (
                <button
                  className="watch-action"
                  onClick={() => s.answerCheckIn("okay")}
                >
                  Continue after response
                </button>
              )}
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
          {s.mode === "CHECK_IN" && s.checkIn?.stage === "help_options" && (
            <div className="watch-controls">
              <button
                className="watch-action"
                onClick={() => s.chooseAssistance("home")}
              >
                Help me get home
              </button>
              <button
                className="watch-action"
                onClick={() => s.chooseAssistance("family")}
              >
                Contact my family
              </button>
              <button
                className="watch-action"
                onClick={() => s.chooseAssistance("confused")}
              >
                I'm confused
              </button>
              <button onClick={s.returnToCheckIn}>Back to check-in</button>
            </div>
          )}
          {!talking &&
            !acknowledged &&
            (s.mode === "NORMAL" ||
              (s.mode === "CHECK_IN" &&
                s.checkIn?.stage !== "help_options")) && (
              <div className="watch-controls">
                <button
                  className="watch-action"
                  onClick={() => s.answerCheckIn("okay")}
                >
                  <Heart size={17} />
                  I'm okay
                </button>
                <button
                  onClick={() =>
                    s.mode === "CHECK_IN"
                      ? s.answerCheckIn("help")
                      : s.chooseAssistance("home")
                  }
                >
                  <House size={17} />
                  {s.mode === "CHECK_IN" ? "I need help" : "Help me get home"}
                </button>
                {s.mode === "NORMAL" && (
                  <button onClick={() => s.chooseAssistance("family")}>
                    <Phone size={17} />
                    Contact my family
                  </button>
                )}
              </div>
            )}
          {s.mode === "NORMAL" && !talking && !acknowledged && (
            <div className="watch-controls watch-home-extras">
              <button onClick={() => setTalking(true)}>
                Talk to Companion
              </button>
              <Link
                className="watch-action"
                to="/memories"
                state={{ from: location.pathname }}
              >
                Memory Garden
              </Link>
            </div>
          )}
          {(s.guidanceActive || s.mode === "GUIDED_RETURN") &&
            s.mode !== "EMERGENCY_SIMULATED" && (
              <button
                className="watch-action cancel-guidance"
                onClick={s.cancelGuidance}
              >
                Cancel guidance
              </button>
            )}
          {s.mode === "EMERGENCY_SIMULATED" && <ResolveSOSButton />}
          <SOSButton />
        </div>
      </div>
      <div className="watch-strap bottom" />
    </div>
  );
}
