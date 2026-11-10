import { CaregiverPriorityCard } from "../caregiver/CaregiverPriorityCard";
import { requestDemoDevice } from "../demo/demoUi";
import { PhoneFrame } from "./devices/PhoneFrame";
import { IconButton } from "../design/Controls";
import { useWatchUi } from "./watchUi";
import { WayHomeMark } from "./WayHomeMark";
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
import { useFind } from "../services/find";
import {
  useCaregiverPopups,
  type CaregiverPopup,
} from "../services/caregiverPopup";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Battery,
  Bell,
  BellOff,
  BellRing,
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
  Watch,
  X,
  ChevronLeft,
} from "lucide-react";
import { useStore, navigable, simulatedLocation } from "../store";
import { useLang, useT, timeAgo } from "../i18n";
import { useZone } from "../zone/store";
import { RouteHomeMap, ZoneLadder, ZoneMap } from "../zone/ZoneViews";
import { evaluateSignals } from "../services/safety";
import { BatteryLow, Satellite, AlertTriangle } from "lucide-react";
import { wearLabels } from "../services/safety";
import { CheckInHistory, FamilyResponse } from "./CheckInSupport";
import { bleDevice } from "../services/ble";

export function CaregiverPhone() {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
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
  // Bring the caregiver to Today when the wearer leaves the zone or guidance starts,
  // so the escalation ladder and live route map are actually on screen.
  const zoneActive = useZone((z) => z.active);
  const guiding = s.mode === "GUIDED_RETURN";
  useEffect(() => {
    if (zoneActive || guiding) setView("today");
  }, [zoneActive, guiding]);
  useEffect(() => {
    scrollArea.current?.scrollTo({ top: 0 });
  }, [view]);
  useEffect(() => {
    if (
      s.mode === "EMERGENCY_SIMULATED" ||
      s.familyRequest?.status === "waiting" ||
      s.checkIn?.stage === "question"
    ) {
      setView("today");
      scrollArea.current?.scrollTo({ top: 0 });
    }
  }, [s.incident?.revision, s.familyRequest?.id, s.checkIn?.id]);
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
  const waiting = !!s.familyRequest && s.familyRequest.status !== "responded";
  const isEmergency = s.mode === "EMERGENCY_SIMULATED";
  const activeSection = sections.find((section) => section.id === view);
  return (
    <PhoneFrame view={view}>
      <div className="phone-system" aria-hidden="true">
        <span>9:41</span>
        <span>
          <Signal size={13} />
          <Wifi size={13} />
          <Battery size={17} />
        </span>
      </div>
      <CaregiverPopupLayer />
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
            <WayHomeMark />
          </span>
          <div>
            <p>{t("demoDevice")}</p>
            <strong>{s.settings.wearer}</strong>
          </div>
          <IconButton
            className="phone-bell"
            aria-label="View notifications"
            onClick={() => setView("updates")}
          >
            <Bell size={20} />
            {s.alerts.some((a) => !a.read) && (
              <span className="notification-dot" />
            )}
          </IconButton>
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
            <header className="phone-manager-head">
              <button
                type="button"
                aria-label="Back to care tools"
                onClick={() => setView("more")}
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                <small>CARE TOOLS</small>
                <strong>{activeSection?.label}</strong>
              </span>
            </header>
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
              <>
                <CaregiverModeDock />
                <PhoneSettings />
              </>
            )}
          </div>
        ) : view === "today" ? (
          <PhoneToday />
        ) : view === "updates" ? (
          <section className="phone-updates">
            <div className="phone-updates-head">
              <h3>{t("updatesTitle")}</h3>
              {s.alerts.some((a) => !a.read) && (
                <button className="text-button" onClick={() => s.read()}>
                  {t("markAllRead")}
                </button>
              )}
            </div>
            {!s.alerts.length && (
              <p>
                No updates yet. Send a check-in from Today to try the shared
                experience.
              </p>
            )}
            <ul>
              {s.alerts.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className={`${a.urgent ? "urgent" : ""} ${a.read ? "is-read" : ""}`}
                >
                  <span
                    className={
                      a.urgent ? "phone-alert-dot urgent" : "phone-alert-dot"
                    }
                  />
                  <div>
                    <strong>{a.title}</strong>
                    <time dateTime={new Date(a.time).toISOString()}>
                      {timeAgo(lang, a.time)}
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
        {view === "more" && (
          <>
            <Link className="phone-workspace-link" to="/caregiver">
              {t("workspace")} <ArrowRight size={16} />
            </Link>
            <p className="phone-disclaimer">{t("demoOnly")}</p>
          </>
        )}
      </div>
      <nav className="phone-bottom-nav" aria-label="Phone views">
        <button
          aria-pressed={view === "today"}
          onClick={() => setView("today")}
        >
          <House size={20} />
          <span>{t("navToday")}</span>
        </button>
        <button
          aria-pressed={view === "updates"}
          onClick={() => setView("updates")}
        >
          <Bell size={20} />
          <span>{t("navUpdates")}</span>
          {s.alerts.some((a) => !a.read) && <i className="notification-dot" />}
        </button>
        <button
          aria-pressed={view !== "today" && view !== "updates"}
          onClick={() => setView("more")}
        >
          <Grid2X2 size={20} />
          <span>{t("navTools")}</span>
        </button>
      </nav>
      <div className="phone-home-indicator" aria-hidden="true" />
    </PhoneFrame>
  );
}

function CaregiverPopupCard({ popup }: { popup: CaregiverPopup }) {
  const dismiss = useCaregiverPopups((state) => state.dismiss);
  return (
    <article
      className={`phone-action-popup level-${popup.level}`}
      role={popup.level === "urgent" ? "alert" : "status"}
    >
      <span className="phone-popup-icon" aria-hidden="true">
        {popup.level === "urgent" ? (
          <AlertTriangle size={18} />
        ) : (
          <Watch size={18} />
        )}
      </span>
      <span>
        <small>WAYHOME · NOW</small>
        <strong>{popup.title}</strong>
        <p>{popup.detail}</p>
      </span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(popup.id)}
      >
        <X size={15} />
      </button>
    </article>
  );
}

function CaregiverPopupLayer() {
  const popups = useCaregiverPopups((state) => state.popups);
  const dismiss = useCaregiverPopups((state) => state.dismiss);
  useEffect(() => {
    // Every notice expires from its creation time, even when a more urgent one
    // is being shown. A burst of watch taps never becomes a queue of overlays.
    const timers = popups.map((popup) => {
      const duration =
        popup.level === "urgent"
          ? 8000
          : popup.level === "routine"
            ? 2600
            : 5000;
      return window.setTimeout(
        () => dismiss(popup.id),
        Math.max(0, popup.time + duration - Date.now()),
      );
    });
    return () => timers.forEach(window.clearTimeout);
  }, [dismiss, popups]);
  const visible = popups.find((popup) => popup.level === "urgent") ?? popups[0];
  if (!visible) return null;
  return (
    <div className="phone-popup-layer" aria-live="polite">
      <CaregiverPopupCard key={visible.id} popup={visible} />
    </div>
  );
}

export function CaregiverModeDock() {
  const s = useStore();
  const t = useT();
  const modes = [
    {
      id: "normal" as const,
      label: t("normalMode"),
      hint: t("normalModeHint"),
    },
    {
      id: "focus" as const,
      label: t("focusMode"),
      hint: t("focusModeHint"),
    },
    {
      id: "dialogue" as const,
      label: t("dialogueMode"),
      hint: t("dialogueModeHint", {
        companion: s.settings.companionName,
      }),
    },
  ];
  const active =
    modes.find((mode) => mode.id === s.settings.experienceMode) ?? modes[0];

  return (
    <section className="phone-mode-dock" aria-label={t("watchMode")}>
      <header>
        <span className="phone-mode-symbol" aria-hidden="true">
          <SlidersHorizontal size={15} />
        </span>
        <span>
          <strong>{t("watchMode")}</strong>
          <small>
            {active.label} on {s.settings.wearer.split(" ")[0]}'s watch
          </small>
        </span>
      </header>
      <div className="phone-mode-dock-options">
        {modes.map(({ id, label, hint }) => (
          <button
            type="button"
            key={id}
            aria-label={`${label}: ${hint}`}
            aria-pressed={s.settings.experienceMode === id}
            onClick={() => {
              s.setExperienceMode(id, "caregiver");
              useWatchUi.getState().openMode();
            }}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// One scroll region: priority and its action first, then relevant context.
function PhoneToday() {
  const s = useStore(),
    t = useT();
  const find = useFind(),
    zone = useZone();
  const details = useRef<HTMLDetailsElement>(null);
  const findings = evaluateSignals(s.signals);
  const approved = s.landmarks.filter(navigable);
  const isEmergency = s.mode === "EMERGENCY_SIMULATED";
  function review() {
    if (details.current) {
      details.current.open = true;
      details.current.querySelector("summary")?.focus();
    }
  }
  function sendCheckIn() {
    s.event("CHECK");
    void bleDevice.sendCheckInRequest().catch(() => {});
    requestDemoDevice("watch");
  }
  return (
    <>
      <CaregiverPriorityCard onCheckIn={sendCheckIn} onReview={review} />
      {!isEmergency && (
        <section
          className="phone-quick-actions"
          aria-label={t("caregiverActions")}
        >
          <button
            className="wh-button"
            data-variant="secondary"
            disabled={!s.connected && !find.ringing}
            aria-pressed={Boolean(find.ringing)}
            onClick={() =>
              find.ringing ? find.stop() : find.start(s.settings.caregiver)
            }
          >
            {find.ringing ? <BellOff size={18} /> : <BellRing size={18} />}
            {find.ringing ? t("findStop") : t("findBand")}
          </button>
          {!s.connected && <p>{t("findOffline")}</p>}
          {find.ringing && <p role="status">{t("findNote")}</p>}
        </section>
      )}
      {!isEmergency && (
        <section
          className="phone-location-card"
          aria-label={t("locationOverview")}
        >
          <header className="phone-card-heading">
            <span>
              <MapPin size={16} />{" "}
              {s.mode === "GUIDED_RETURN" ? t("routeLabel") : t("lastKnown")}
            </span>
          </header>
          {s.mode === "GUIDED_RETURN" && zone.guideStartM !== null ? (
            <RouteHomeMap />
          ) : (
            <ZoneMap withSlider={false} />
          )}
          <div className="location-caption">
            <div>
              <strong>
                {s.mode === "GUIDED_RETURN"
                  ? t("nextStop", {
                      place:
                        approved[s.guideIndex]?.name ??
                        t("navigationApprovalNeeded"),
                    })
                  : simulatedLocation(s.position)}
              </strong>
              <small>{t("simulatedLocationReading")}</small>
            </div>
          </div>
        </section>
      )}
      {s.battery <= 20 && (
        <p className="phone-banner warn">
          <BatteryLow size={16} />
          {t("lowBattery", {
            n: s.battery,
            wearer: s.settings.wearer.split(" ")[0],
          })}
        </p>
      )}
      <details ref={details} className="phone-overview-details">
        <summary>{t("deviceCheckinDetails")}</summary>
        <div className="phone-readings four">
          <div className={s.connected ? "ok" : "bad"}>
            <Wifi size={17} />
            <span>{t("device")}</span>
            <strong>{s.connected ? t("connected") : t("disconnected")}</strong>
          </div>
          <div className={s.wearStatus === "likely_worn" ? "ok" : "warn"}>
            <Heart size={17} />
            <span>{t("wearInference")}</span>
            <strong>{wearLabels[s.wearStatus]}</strong>
          </div>
          <div className={s.battery <= 20 ? "warn" : "ok"}>
            <Battery size={17} />
            <span>{t("battery")}</span>
            <strong>{s.battery}%</strong>
          </div>
          <div className={s.signals.gpsConfidence < 0.6 ? "warn" : "ok"}>
            <Satellite size={17} />
            <span>{t("gps")}</span>
            <strong>{Math.round(s.signals.gpsConfidence * 100)}%</strong>
          </div>
        </div>
        {findings.length > 0 && (
          <ul className="phone-findings">
            {findings.map((f) => (
              <li key={f.key}>
                <AlertTriangle size={16} />
                {f.reason}
              </li>
            ))}
          </ul>
        )}
        <label className="zone-radius">
          <span>
            {t("safeRadius")} <b>{zone.radiusM} m</b>
          </span>
          <input
            aria-label={t("safeRadius")}
            type="range"
            min={100}
            max={1500}
            step={50}
            value={zone.radiusM}
            onChange={(e) => zone.setRadius(Number(e.target.value))}
          />
        </label>
        <ZoneLadder />
        <p>{t("deviceObservationNote")}</p>
        <Link className="wh-button" to="/caregiver/emergency">
          {t("resolveOpenReview")}
        </Link>
        <CheckInHistory />
        {s.familyRequest && isEmergency && <FamilyResponse />}
      </details>
    </>
  );
}
