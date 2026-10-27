import {
  Contacts,
  SafetyPolicy,
  PolicyHistory,
  PhoneSettings,
  Journeys,
} from "../care/Tools";
import { Landmarks } from "../care/Landmarks";
import {
  CaregiverMemoryLibrary,
  MemoryActivityHistory,
} from "../memory/MemoryLibrary";
import { useCare } from "../care/store";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Battery,
  Bell,
  Heart,
  Signal,
  Wifi,
  House,
  Grid2X2,
  Users,
  MapPin,
  Leaf,
  SlidersHorizontal,
  History,
  Settings,
} from "lucide-react";
import { status, useStore, simulatedLocation, navigable } from "../store";
import { wearLabels } from "../services/safety";
import { CheckInHistory, FamilyResponse } from "./CheckInSupport";

export function CaregiverPhone() {
  const s = useStore();
  useCare((s) => s.receipts.length);
  const [view, setView] = useState<
    | "more"
    | "today"
    | "updates"
    | "contacts"
    | "policy"
    | "landmarks"
    | "library"
    | "history"
    | "settings"
  >("today");
  const scrollArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollArea.current?.scrollTo({ top: 0 });
  }, [view]);
  const sections = [
    {
      id: "contacts",
      label: "Contacts",
      detail: "Your trusted circle",
      icon: Users,
    },
    {
      id: "policy",
      label: "Safety policy",
      detail: "Check-ins and alerts",
      icon: SlidersHorizontal,
    },
    {
      id: "landmarks",
      label: "Familiar landmarks",
      detail: "Review navigation photographs",
      icon: MapPin,
    },
    {
      id: "library",
      label: "Memory Library",
      detail: "Photos, stories and journeys",
      icon: Leaf,
    },
    {
      id: "history",
      label: "Activity history",
      detail: "Responses and shared moments",
      icon: History,
    },
    {
      id: "settings",
      label: "Settings",
      detail: "Personalize your companion",
      icon: Settings,
    },
  ] as const;
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
          <span>9:41</span>
          <span>
            <Signal size={13} />
            <Wifi size={13} />
            <Battery size={17} />
          </span>
        </div>
        {view !== "today" && (isEmergency || waiting) && (
          <button
            className={`phone-priority-banner ${isEmergency ? "emergency" : ""}`}
            onClick={() => setView("today")}
          >
            {isEmergency ? "SOS needs review" : "Family response requested"}
            <ArrowRight size={16} />
          </button>
        )}
        <div className="phone-scroll" ref={scrollArea}>
          <header className="phone-greeting">
            <span className="phone-avatar">
              {s.settings.caregiver[0] || "J"}
            </span>
            <div>
              <p>YOUR CIRCLE OF CARE</p>
              <strong>Hello, {s.settings.caregiver.split(" ")[0]}.</strong>
            </div>
            <button
              className="phone-bell"
              aria-label="View notifications"
              onClick={() => setView("updates")}
            >
              <Bell size={20} />
              {s.alerts.some((a) => !a.read) && (
                <span className="notification-dot" />
              )}
            </button>
          </header>
          {view === "more" ? (
            <section className="phone-tools">
              <p className="phone-kicker">MADE FOR YOUR FAMILY</p>
              <h3>Your care tools</h3>
              <p>A few thoughtful ways to stay close.</p>
              <div className="phone-tool-list">
                {sections.map(({ id, label, detail, icon: Icon }) => (
                  <button key={id} onClick={() => setView(id)}>
                    <span className="tool-icon">
                      <Icon size={20} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {view !== "today" && view !== "updates" && view !== "more" ? (
            <div className="phone-manager">
              <button className="button light" onClick={() => setView("today")}>
                Back to phone overview
              </button>
              {view === "contacts" ? (
                <Contacts />
              ) : view === "policy" ? (
                <SafetyPolicy />
              ) : view === "landmarks" ? (
                <Landmarks />
              ) : view === "library" ? (
                <>
                  <CaregiverMemoryLibrary />
                  <Journeys />
                </>
              ) : view === "history" ? (
                <>
                  <PolicyHistory />
                  <MemoryActivityHistory />
                </>
              ) : (
                <PhoneSettings />
              )}
              <button className="button light" onClick={() => setView("today")}>
                Close {view === "library" ? "Memory Library" : "phone section"}
              </button>
            </div>
          ) : view === "today" ? (
            <>
              <section
                className={`phone-status ${isEmergency ? "phone-emergency" : ""}`}
                aria-live="polite"
              >
                <span className="phone-status-label">
                  {s.settings.wearer} · LIVE DEMO
                </span>
                <span className="phone-person-avatar">
                  {s.settings.wearer[0]}
                </span>
                <h3>{status[s.mode]}</h3>
                <p>
                  {isEmergency
                    ? "A simulated SOS needs your review. Acknowledgment does not resolve it."
                    : "A little support, whenever it’s needed."}
                </p>
              </section>
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
                        if (
                          !matchMedia(
                            "(min-width: 1000px) and (min-height: 650px)",
                          ).matches ||
                          s.settings.largeText
                        )
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
              <section
                className="phone-location-card"
                aria-label="Simulated location overview"
              >
                <div className="location-illustration" aria-hidden="true">
                  <svg
                    viewBox="0 0 300 100"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <rect width="300" height="100" fill="#e4eadb" />
                    <path
                      d="M-20 25L320 65M80 -20L125 120M230 -20L185 120"
                      stroke="#faf9f2"
                      strokeWidth="17"
                    />
                    <path d="M-20 25L320 65" stroke="#cad5bb" strokeWidth="1" />
                    <rect
                      x="20"
                      y="56"
                      width="53"
                      height="30"
                      rx="10"
                      fill="#c8d8bd"
                    />
                    <rect
                      x="145"
                      y="4"
                      width="45"
                      height="23"
                      rx="8"
                      fill="#c8d8bd"
                    />
                    <circle cx="150" cy="47" r="22" fill="#375c4030" />
                    <circle
                      cx="150"
                      cy="47"
                      r="9"
                      fill="#375c40"
                      stroke="white"
                      strokeWidth="3"
                    />
                  </svg>
                  <span>Illustrative demo map</span>
                </div>
                <div className="location-caption">
                  <MapPin size={17} />
                  <div>
                    <strong>Last known location</strong>
                    <small>{simulatedLocation(s.position)}</small>
                    <small>
                      Simulated GPS confidence ·{" "}
                      {Math.round(s.signals.gpsConfidence * 100)}%
                    </small>
                  </div>
                </div>
              </section>
              <details className="phone-overview-details">
                <summary>Device & check-in details</summary>
                <p>
                  Battery: {s.battery}% · Heart rate: not measured (no sensor)
                </p>
                <p>
                  {s.mode === "GUIDED_RETURN"
                    ? "Guidance is active."
                    : "Guidance is not active."}{" "}
                  Next approved landmark:{" "}
                  {s.landmarks.filter(navigable)[s.guideIndex]?.name ??
                    "None available"}
                </p>
                <p>
                  {s.checkIn?.stage === "question"
                    ? `Waiting for ${s.settings.wearer} to respond.`
                    : s.checkIn?.response
                      ? `${s.settings.wearer} ${s.checkIn.source === "caregiver" ? "had a caregiver review" : s.checkIn.response === "okay" ? "said they are okay" : "asked for help"}.`
                      : "No check-in response yet."}
                </p>
                <time>
                  Latest update:{" "}
                  {new Date(
                    Math.max(s.lastCheck, s.alerts[0]?.time ?? 0),
                  ).toLocaleTimeString()}
                </time>
              </details>
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
                {Math.round(s.signals.gpsConfidence * 100)}% · simulated
                readings.
              </p>
            </>
          ) : view === "updates" ? (
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
          ) : null}
          <Link className="phone-workspace-link" to="/caregiver">
            Open caregiver workspace <ArrowRight size={16} />
          </Link>
          <p className="phone-disclaimer">
            Demo only. No real calls or notifications.
          </p>
        </div>
        <nav className="phone-bottom-nav" aria-label="Phone views">
          <button
            aria-pressed={view === "today"}
            onClick={() => setView("today")}
          >
            <House size={20} />
            <span>Today</span>
          </button>
          <button
            aria-pressed={view === "updates"}
            onClick={() => setView("updates")}
          >
            <Bell size={20} />
            <span>Updates</span>
            {s.alerts.some((a) => !a.read) && (
              <i className="notification-dot" />
            )}
          </button>
          <button
            aria-pressed={view !== "today" && view !== "updates"}
            onClick={() => setView("more")}
          >
            <Grid2X2 size={20} />
            <span>Care tools</span>
          </button>
        </nav>
        <div className="phone-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
}
