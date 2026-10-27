import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Battery, Bell, Heart, Signal, Wifi } from "lucide-react";
import { status, useStore } from "../store";
import { wearLabels } from "../services/safety";
import { CheckInHistory, FamilyResponse } from "./CheckInSupport";

export function CaregiverPhone() {
  const s = useStore();
  const [view, setView] = useState<"today" | "updates">("today");
  const emergency = s.alerts.find(
    (a) => a.emergency && !a.emergency.resolvedAt,
  );
  const waiting = !!s.familyRequest && s.familyRequest.status !== "responded";
  const isEmergency = s.mode === "EMERGENCY_SIMULATED";
  return (
    <div className="care-phone" aria-label="Caregiver phone interface">
      <div className="phone-island" aria-hidden="true" />
      <div className="care-phone-screen">
        <div className="phone-system" aria-hidden="true">
          <span>WAYHOME</span>
          <span>
            <Signal size={13} />
            <Wifi size={13} />
            <Battery size={17} />
          </span>
        </div>
        <header className="phone-greeting">
          <span className="phone-avatar">{s.settings.caregiver[0] || "J"}</span>
          <div>
            <p>YOUR CIRCLE OF CARE</p>
            <strong>Hello, {s.settings.caregiver.split(" ")[0]}.</strong>
          </div>
          <Bell size={20} />
        </header>
        <div className="phone-tabs" aria-label="Phone views">
          <button
            aria-pressed={view === "today"}
            onClick={() => setView("today")}
          >
            Today
          </button>
          <button
            aria-pressed={view === "updates"}
            onClick={() => setView("updates")}
          >
            Updates
            {s.alerts.some((a) => !a.read) && (
              <span className="phone-unread">
                {s.alerts.filter((a) => !a.read).length}
              </span>
            )}
          </button>
        </div>
        {view === "today" ? (
          <>
            <section
              className={`phone-status ${isEmergency ? "phone-emergency" : ""}`}
              aria-live="polite"
            >
              <span className="phone-status-label">
                {s.settings.wearer} · LIVE DEMO
              </span>
              <Heart size={27} />
              <h3>{status[s.mode]}</h3>
              <p>
                {isEmergency
                  ? "A simulated SOS needs your review. Acknowledgment does not resolve it."
                  : "A familiar companion, with human support close by."}
              </p>
            </section>
            <div className="phone-readings">
              <div>
                <Wifi size={17} />
                <span>Device</span>
                <strong>{s.connected ? "Connected" : "Disconnected"}</strong>
              </div>
              <div>
                <Heart size={17} />
                <span>Wear inference</span>
                <strong>{wearLabels[s.wearStatus]}</strong>
              </div>
            </div>
            <p className="phone-disclaimer">
              Wear status is inferred. GPS confidence:{" "}
              {Math.round(s.signals.gpsConfidence * 100)}% · simulated readings.
            </p>
            {isEmergency ? (
              <section className="phone-action-card">
                <h3>Your attention matters.</h3>
                {emergency && !emergency.emergency?.acknowledgedAt && (
                  <button
                    className="button"
                    onClick={() => s.acknowledgeEmergency(emergency.id)}
                  >
                    Acknowledge SOS alert
                  </button>
                )}
                {emergency?.emergency?.acknowledgedAt && (
                  <p>
                    SOS acknowledgment recorded. Resolution still needs
                    caregiver verification.
                  </p>
                )}
                <Link className="button light" to="/caregiver/emergency">
                  Review SOS <ArrowRight size={15} />
                </Link>
              </section>
            ) : (
              <section className="phone-action-card">
                <h3>A little reassurance.</h3>
                <p>
                  Ask how they're feeling. Their response appears in the
                  companion interface.
                </p>
                <button
                  className="button"
                  disabled={waiting}
                  onClick={() => {
                    s.event("CHECK");
                    requestAnimationFrame(() => {
                      const heading =
                        document.getElementById("wearer-view-title");
                      heading?.scrollIntoView({
                        behavior: s.settings.reducedMotion
                          ? "instant"
                          : "smooth",
                        block: "start",
                      });
                      heading?.focus({ preventScroll: true });
                    });
                  }}
                >
                  Send a check-in
                </button>
                {waiting && (
                  <p>
                    Respond to the family request below before sending another
                    check-in.
                  </p>
                )}
              </section>
            )}
            <FamilyResponse />
          </>
        ) : (
          <section className="phone-updates">
            <h3>Little moments. Shared.</h3>
            {!s.alerts.length && (
              <p>
                No updates yet. Send a check-in from Today to try the shared
                experience.
              </p>
            )}
            <ul>
              {s.alerts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <span
                    className={
                      a.urgent ? "phone-alert-dot urgent" : "phone-alert-dot"
                    }
                  />
                  <div>
                    <strong>{a.title}</strong>
                    <time>
                      {new Date(a.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  {!a.read && (
                    <button
                      className="text-button"
                      aria-label={`Mark update read: ${a.title}`}
                      onClick={() => s.read(a.id)}
                    >
                      Read
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <CheckInHistory />
          </section>
        )}
        <Link className="phone-workspace-link" to="/caregiver">
          Open caregiver workspace <ArrowRight size={16} />
        </Link>
        <p className="phone-disclaimer">
          Demo only. No real calls or notifications.
        </p>
      </div>
      <div className="phone-home-indicator" aria-hidden="true" />
    </div>
  );
}
