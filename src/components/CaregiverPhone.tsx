import "../caregiver-phone-ui.css";
import {
  Contacts,
  SafetyPolicy,
  PolicyHistory,
  PhoneSettings,
  Journeys,
} from "../care/Tools";
import { Landmarks } from "../care/Landmarks";
import { FamilyMemories } from "../care/FamilyMemories";
import {
  CaregiverMemoryLibrary,
  MemoryActivityHistory,
} from "../memory/MemoryLibrary";
import { useCare } from "../care/store";
import { useFind } from "../services/find";
import { useTalkLog } from "./talkLog";
import {
  useCaregiverPopups,
  type CaregiverPopup,
} from "../services/caregiverPopup";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
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
  MessageCircle,
  ChevronLeft,
  Phone,
} from "lucide-react";
import {
  status,
  useStore,
  simulatedLocation,
  navigable,
  requestContact,
} from "../store";
import { useLang, useT, timeAgo } from "../i18n";
import { RADIUS_MAX, RADIUS_MIN, useZone } from "../zone/store";
import { RouteHomeMap, ZoneLadder, ZoneMap } from "../zone/ZoneViews";
import { evaluateSignals } from "../services/safety";
import { Check, BatteryLow, Satellite, AlertTriangle } from "lucide-react";
import { wearLabels } from "../services/safety";
import { CheckInHistory, FamilyResponse } from "./CheckInSupport";
import { bleDevice } from "../services/ble";
import { nearestDemoPoliceStation } from "../zone/demoPolice";
import { simulatePoliceNotification } from "./EmergencyAssistance";

// Codex's shared list (src/experienceModes.ts, PR #8) is not on main yet.
// Keep this single local copy of the agreed emoji + names; Codex will swap it
// for the shared import during integration.
const PHONE_EXPERIENCE_MODES = [
  { id: "normal", emoji: "🌿", name: "Normal" },
  { id: "focus", emoji: "🏠", name: "Focus" },
  { id: "dialogue", emoji: "💬", name: "Dialogue" },
] as const;

type PhoneView =
  | "more"
  | "today"
  | "updates"
  | "contacts"
  | "family"
  | "policy"
  | "landmarks"
  | "library"
  | "history"
  | "settings"
  | "device";

export function CaregiverPhone() {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
  useCare((s) => s.receipts.length);
  const talkLog = useTalkLog();
  const [view, setView] = useState<PhoneView>("today");
  const scrollArea = useRef<HTMLDivElement>(null);
  // The phone app is laid out once at its design size (a 274 px-wide
  // screen) and scaled like a screenshot to whatever size the stage gives
  // the phone. Every screen size shows the same layout: nothing reflows,
  // wraps differently or gets cut off; it only gets bigger or smaller.
  const phoneRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = phoneRef.current;
    if (!el) return;
    const fit = () => {
      const screen = Math.max(1, el.getBoundingClientRect().width - 16);
      el.style.setProperty("--phone-zoom", (screen / 274).toFixed(4));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Bring the caregiver to Today when the wearer leaves the zone or guidance starts,
  // so the escalation ladder and live route map are actually on screen.
  const zoneActive = useZone((z) => z.active);
  const guiding = s.mode === "GUIDED_RETURN";
  const missedStop = s.mode === "REORIENTATION" && !!s.missedLandmark;
  useEffect(() => {
    if (zoneActive || guiding || missedStop) setView("today");
  }, [zoneActive, guiding, missedStop]);
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
      id: "family",
      label: t("careFamilyTitle"),
      detail: t("careFamilyDetail"),
      icon: Heart,
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
      id: "device",
      label: "Device & readings",
      detail: "Connection, wear, battery and GPS",
      icon: Battery,
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
  const unread = s.alerts.some((a) => !a.read);
  return (
    <div
      className="care-phone cpui"
      ref={phoneRef}
      aria-label="Caregiver phone interface"
    >
      <div className="phone-island" aria-hidden="true" />
      <div className="care-phone-screen" data-view={view}>
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
          <header className="cph-appbar">
            <span className="cph-brand">
              <Leaf size={14} aria-hidden="true" />
              <strong>WayHome</strong>
            </span>
            <span className="cph-appbar-view">
              {view === "today"
                ? t("navToday")
                : view === "updates"
                  ? t("navUpdates")
                  : t("navTools")}
            </span>
            <button
              className="phone-bell cph-bell"
              aria-label="View notifications"
              onClick={() => setView("updates")}
            >
              <Bell size={18} />
              {unread && <span className="notification-dot" />}
            </button>
          </header>
          {view === "more" ? (
            <section className="phone-tools cph-tools">
              <p className="phone-kicker">MADE FOR YOUR FAMILY</p>
              <h3>Your care tools</h3>
              <p>
                {t("hello", { name: s.settings.caregiver.split(" ")[0] })} A few
                thoughtful ways to stay close.
              </p>
              <div className="phone-tool-list cph-tool-list">
                {sections.map(({ id, label, detail, icon: Icon }) => (
                  <button key={id} onClick={() => setView(id)}>
                    <span className="tool-icon">
                      <Icon size={19} />
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
            <div className="phone-manager cph-manager">
              <header className="phone-manager-head cph-manager-head">
                <button
                  type="button"
                  aria-label="Back to phone overview"
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
              ) : view === "family" ? (
                <FamilyMemories />
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
              ) : view === "device" ? (
                <PhoneDeviceDetails />
              ) : (
                <PhoneSettings />
              )}
            </div>
          ) : view === "today" ? (
            <PhoneToday />
          ) : view === "updates" ? (
            <section className="phone-updates cph-updates">
              <div className="phone-updates-head cph-updates-head">
                <h3>{t("updatesTitle")}</h3>
                {unread && (
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
              <section
                className="phone-talk-log cph-talk-log"
                aria-label="Talk log"
              >
                <h4>Talk log</h4>
                <p className="phone-talk-note">
                  Text only — no audio is stored.
                </p>
                {talkLog.lines.length === 0 ? (
                  <p className="phone-talk-empty">No Talk exchanges yet.</p>
                ) : (
                  <ul>
                    {[...talkLog.lines].reverse().map((line) => (
                      <li
                        key={line.at}
                        className={line.matters ? "matters" : ""}
                      >
                        <time>
                          {new Date(line.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        <div>
                          <strong>{line.you}</strong>
                          <span>{line.momo}</span>
                        </div>
                        {line.matters && (
                          <span
                            className="phone-talk-flag"
                            aria-label="Wants help or guidance"
                          >
                            !
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <CheckInHistory />
            </section>
          ) : null}
          {view === "more" && (
            <>
              <Link
                className="phone-workspace-link cph-workspace-link"
                to="/caregiver"
                aria-label="Open full workspace"
              >
                Open full workspace <ArrowRight size={16} />
              </Link>
              <p className="phone-disclaimer">{t("demoOnly")}</p>
            </>
          )}
        </div>
        <nav className="phone-bottom-nav cph-nav" aria-label="Phone views">
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
            {unread && <i className="notification-dot" />}
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
      </div>
    </div>
  );
}

function CaregiverPopupCard({ popup }: { popup: CaregiverPopup }) {
  const dismiss = useCaregiverPopups((state) => state.dismiss);
  useEffect(() => {
    const duration =
      popup.level === "urgent" ? 8000 : popup.level === "routine" ? 2600 : 5000;
    const timer = window.setTimeout(() => dismiss(popup.id), duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, popup.id, popup.level]);
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
  if (!popups.length) return null;
  return (
    <div className="phone-popup-layer" aria-live="polite">
      {popups.slice(0, 2).map((popup) => (
        <CaregiverPopupCard key={popup.id} popup={popup} />
      ))}
    </div>
  );
}

function CaregiverModeDock() {
  const s = useStore();
  const t = useT();
  const modes = PHONE_EXPERIENCE_MODES.map((mode) => ({
    ...mode,
    hint:
      mode.id === "normal"
        ? t("normalModeHint")
        : mode.id === "focus"
          ? t("focusModeHint")
          : t("dialogueModeHint", { companion: s.settings.companionName }),
  }));
  const active =
    modes.find((mode) => mode.id === s.settings.experienceMode) ?? modes[0];

  return (
    <section className="phone-mode-dock cph-mode" aria-label={t("watchMode")}>
      <header className="cph-mode-head">
        <span className="phone-mode-symbol" aria-hidden="true">
          <Watch size={15} />
        </span>
        <span>
          <strong>{t("watchMode")}</strong>
          <small>
            <span className="cph-mode-emoji" aria-hidden="true">
              {active.emoji}
            </span>{" "}
            {active.name} on {s.settings.wearer.split(" ")[0]}'s watch
          </small>
        </span>
      </header>
      <div className="phone-mode-dock-options cph-mode-options">
        {modes.map(({ id, emoji, name, hint }) => (
          <button
            type="button"
            key={id}
            aria-label={`${name}: ${hint}`}
            aria-pressed={s.settings.experienceMode === id}
            onClick={() => s.setExperienceMode(id, "caregiver")}
          >
            <span className="cph-mode-emoji" aria-hidden="true">
              {emoji}
            </span>{" "}
            <span>{name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const statusId: Record<string, string> = {
  "No active alerts": "Tidak ada peringatan",
  "Check-in Needed": "Perlu disapa",
  "Guidance Active": "Panduan aktif",
  "Caregiver Assistance Requested": "Bantuan diminta",
  "Simulated SOS": "SOS simulasi",
};

// Detailed device readings live in Care tools so Today stays scannable.
function PhoneDeviceDetails() {
  const s = useStore();
  const t = useT();
  const wearer = s.settings.wearer;
  const approved = s.landmarks.filter(navigable);
  return (
    <div className="cph-device">
      <div className="phone-readings four">
        <div className={s.connected ? "ok" : "bad"}>
          <Wifi size={17} />
          <span>{t("device")}</span>
          <strong>{s.connected ? t("connected") : t("disconnected")}</strong>
        </div>
        <div className={s.wearStatus === "likely_worn" ? "ok" : "warn"}>
          <Heart size={17} />
          <span>Wear inference</span>
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
      <details className="phone-overview-details">
        <summary>Device & check-in details</summary>
        <p>Battery: {s.battery}% · Heart rate: not measured (no sensor)</p>
        <p>
          {s.mode === "GUIDED_RETURN"
            ? "Guidance is active."
            : "Guidance is not active."}{" "}
          Next approved landmark:{" "}
          {approved[s.guideIndex]?.name ?? "None available"}
        </p>
        <p>
          {s.checkIn?.stage === "question"
            ? `Waiting for ${wearer} to respond.`
            : s.checkIn?.response
              ? `${wearer} ${s.checkIn.source === "caregiver" ? "had a caregiver review" : s.checkIn.response === "okay" ? "said they are okay" : "asked for help"}.`
              : "No check-in response yet."}
        </p>
        <time>
          Latest update:{" "}
          {new Date(
            Math.max(s.lastCheck, s.alerts[0]?.time ?? 0),
          ).toLocaleTimeString()}
        </time>
      </details>
      <p className="phone-disclaimer">
        Wear status is inferred. GPS confidence:{" "}
        {Math.round(s.signals.gpsConfidence * 100)}% · simulated readings.
      </p>
      <p className="phone-disclaimer">
        Last known position: {simulatedLocation(s.position)}
      </p>
    </div>
  );
}

function DemoPoliceStation({
  position,
  companion,
}: {
  position: number;
  companion: string;
}) {
  const t = useT();
  const [called, setCalled] = useState(false);
  const station = nearestDemoPoliceStation(position);
  return (
    <div className="cph-police">
      <p className="cph-hero-sub">
        {t("demoPoliceAttribution", { companion })}
      </p>
      <h3 className="cph-hero-title">{t("demoPoliceQuestion")}</h3>
      <div className="cph-police-row">
        <p>
          <strong>{station.name}</strong>
          <small>
            {t("demoPoliceDistance", { metres: Math.round(station.distance) })}
          </small>
        </p>
        <button
          type="button"
          className="button"
          disabled={called}
          onClick={() => setCalled(true)}
        >
          {t("demoPoliceCall")}
        </button>
      </div>
      <p className="cph-hero-sub" role="status">
        {t(called ? "demoPoliceCalled" : "demoPoliceDisclaimer")}
      </p>
    </div>
  );
}

// Today tab: one person, one status, one next action, then quiet context.
// Safety rules stay in the store.
function PhoneToday() {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
  const find = useFind();
  const wearer = s.settings.wearer;
  const first = wearer.split(" ")[0];
  const isEmergency = s.mode === "EMERGENCY_SIMULATED";
  const offline = !s.connected;
  const takenOff = s.connected && s.wearStatus === "not_worn";
  const waiting = !!s.familyRequest && s.familyRequest.status !== "responded";
  const findings = evaluateSignals(s.signals);
  const emergency = s.alerts.find(
    (a) => a.emergency && !a.emergency.resolvedAt,
  );
  const approved = s.landmarks.filter(navigable);
  const zone = useZone();
  const shortLocation =
    zone.distanceM > 0
      ? t("routeLeft", { m: Math.round(zone.distanceM) })
      : t("nearHome");
  // Happy endings (Step 7): a finished walk and an answered family request
  // are calm outcomes, not open concerns. Both are derived from store state,
  // so the phone follows the same flow on every device.
  const arrivedHome = s.mode === "NORMAL" && s.position === 6;
  const familyRequestDone = s.familyRequest?.status === "responded";
  const quiet =
    (s.mode === "NORMAL" || familyRequestDone) &&
    !findings.length &&
    s.connected &&
    !zone.active;
  const tone =
    isEmergency || (zone.active && zone.level >= 3)
      ? "urgent"
      : quiet && !takenOff
        ? "calm"
        : "attention";
  const alerting = tone !== "calm";
  const heading =
    takenOff && !isEmergency
      ? t("watchTakenOff")
      : zone.active && s.mode === "NORMAL"
        ? t("zoneOutside")
        : familyRequestDone
          ? t("requestDoneTitle")
          : lang === "id"
            ? (statusId[status[s.mode]] ?? status[s.mode])
            : status[s.mode];
  const subtitle = isEmergency
    ? t("sosSub")
    : offline
      ? t("offlineLastSeen", {
          where: shortLocation.charAt(0).toLowerCase() + shortLocation.slice(1),
        })
      : takenOff
        ? t("watchTakenOffDetail")
        : zone.active && s.mode !== "GUIDED_RETURN"
          ? t("zoneFor", {
              min: Math.floor(zone.vmin),
              km: (zone.distanceM / 1000).toFixed(2),
            })
          : s.mode === "GUIDED_RETURN"
            ? t("walkingHome", { wearer: first })
            : s.checkIn?.stage === "question"
              ? t("waitingAnswer", { wearer: first })
              : waiting
                ? requestContact(s)
                  ? t("callWants", {
                      wearer: first,
                      name: requestContact(s)!.name,
                    })
                  : t("familySub")
                : familyRequestDone
                  ? t("familyReplyDone", {
                      caregiver:
                        requestContact(s)?.name ?? s.settings.caregiver,
                    })
                  : arrivedHome
                    ? t("arrivedSummary", { wearer: first })
                    : s.mode === "NORMAL" && !findings.length
                      ? t("calmSub")
                      : t("changedSub");
  const sendCheckIn = () => {
    s.event("CHECK");
    // A paired watch shows the same question; the simulated one renders below.
    void bleDevice.sendCheckInRequest().catch(() => {});
    requestAnimationFrame(() => {
      const heading = document.getElementById("wearer-view-title");
      if (
        !matchMedia("(min-width: 1000px) and (min-height: 650px)").matches ||
        s.settings.largeText
      )
        heading?.scrollIntoView({
          behavior: s.settings.reducedMotion ? "instant" : "smooth",
          block: "start",
        });
      heading?.focus({ preventScroll: true });
    });
  };
  const ack = emergency?.emergency?.acknowledgedAt;
  const policeStation = emergency?.emergency?.policeStation;
  const offerPolice =
    isEmergency &&
    s.incident?.stage === "active" &&
    emergency?.emergency?.kind === "sos" &&
    !emergency.emergency.policePromptDismissed
      ? nearestDemoPoliceStation(
          emergency.emergency.routePosition ?? s.position,
        )
      : null;
  const routeActive = s.mode === "GUIDED_RETURN" && approved.length > 0;
  const guiding = s.mode === "GUIDED_RETURN" && zone.guideStartM !== null;
  const missedStop =
    !offline && !takenOff && s.mode === "REORIENTATION"
      ? s.missedLandmark
      : null;
  // Call lane C2: the wearer's call rings on this phone (demo, no real call).
  const ringingCall =
    s.mode === "CAREGIVER_HANDOVER" &&
    !!s.familyRequest &&
    s.familyRequest.status !== "responded" &&
    !s.familyRequest.missedAt
      ? s.familyRequest
      : null;
  const callee = requestContact(s)?.name ?? s.settings.caregiver;
  return (
    <div className={`cph-today ${alerting ? "cph-today-alert" : ""}`}>
      {ringingCall && (
        <section className="cph-incoming" aria-label="Incoming call">
          <strong>
            <Phone size={16} aria-hidden="true" />{" "}
            {t("incomingCall", { wearer: first, name: callee })}
          </strong>
          <small>{t("demoCall")}</small>
          <div className="cph-incoming-actions">
            <button className="cph-answer" onClick={s.answerFamilyCall}>
              {t("answerCall")}
            </button>
            <button className="cph-decline" onClick={s.missFamilyCall}>
              {t("declineCall")}
            </button>
          </div>
        </section>
      )}
      {/* 1 + 2 — who we are looking after, and whether anything needs us. */}
      <section
        className={`phone-status cph-hero tone-${tone} ${isEmergency ? "phone-emergency" : ""}`}
        aria-live="polite"
      >
        <div className="phone-status-topline cph-hero-top">
          <span className="phone-status-label cph-wearer">{wearer}</span>
          <span className={`phone-tone-chip ${tone}`}>
            {tone === "urgent"
              ? t("urgent")
              : tone === "calm"
                ? t("allCalm")
                : t("needsAttention")}
          </span>
        </div>
        {missedStop ? (
          <DemoPoliceStation
            key={missedStop.id}
            position={missedStop.position}
            companion={s.settings.companionName}
          />
        ) : (
          <>
            <h3 className="cph-hero-title">{heading}</h3>
            <p className="cph-hero-sub">
              {offerPolice ? t("sosPoliceQuestion") : subtitle}
            </p>
          </>
        )}
        {offerPolice && emergency && (
          <div className="cph-sos-police" aria-label={t("sosPoliceDemo")}>
            <strong>{offerPolice.name}</strong>
            <p className="cph-hero-sub">
              {t("demoPoliceDistance", {
                metres: Math.round(offerPolice.distance),
              })}
            </p>
            <p className="cph-hero-sub">{t("sosPoliceDemo")}</p>
            <div className="cph-sos-police-actions">
              <button
                type="button"
                className="button"
                onClick={() =>
                  simulatePoliceNotification(
                    `Caregiver simulated calling ${offerPolice.name} after an SOS`,
                    { alertId: emergency.id, station: offerPolice.name },
                  )
                }
              >
                {t("sosCallPolice")}
              </button>
              <button
                type="button"
                className="button light"
                onClick={() => s.dismissSosPolicePrompt(emergency.id)}
              >
                {t("sosPoliceNotNow")}
              </button>
            </div>
          </div>
        )}
        {isEmergency && policeStation && (
          <p role="status" className="cph-sos-police">
            {t("sosPoliceCalling", { station: policeStation })}
          </p>
        )}
        {s.mode === "CHECK_IN" && s.checkIn?.stage === "question" && (
          <span className="phone-live-dot" aria-hidden="true" />
        )}
      </section>

      {/* Alerts stay immediately below the status, never buried in the scroll. */}
      {s.battery <= 20 && (
        <p className="phone-banner warn cph-banner">
          <BatteryLow size={16} />
          {t("lowBattery", { n: s.battery, wearer: first })}
        </p>
      )}
      {!isEmergency && findings.length > 0 && !routeActive && (
        <section className="cph-alert" aria-label={t("whyAttention")}>
          <span className="cph-alert-label">{t("whyAttention")}</span>
          <ul className="phone-findings cph-findings">
            {findings.map((f) => (
              <li key={f.key}>
                <AlertTriangle size={14} />
                <span>{f.reason.split(":")[0]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3 + 4 — the two things a caregiver reaches for first. */}
      {!isEmergency && (
        <section
          className="phone-quick-actions cph-actions"
          aria-label="Caregiver actions"
        >
          <button
            className="button cph-action-primary"
            disabled={waiting || takenOff}
            onClick={sendCheckIn}
          >
            <MessageCircle size={16} />
            <span>{t("sendCheckIn")}</span>
          </button>
          <button
            className={`button light cph-action-secondary ${find.ringing ? "is-ringing" : ""}`}
            disabled={!s.connected && !find.ringing}
            title={!s.connected ? t("findOffline") : undefined}
            aria-pressed={Boolean(find.ringing)}
            onClick={() =>
              find.ringing
                ? useFind.getState().stop()
                : useFind.getState().start(s.settings.caregiver)
            }
          >
            {find.ringing ? <BellOff size={16} /> : <BellRing size={16} />}
            <span>{find.ringing ? t("findStop") : t("findBand")}</span>
          </button>
          {offline && <p>{t("checkInWillWait")}</p>}
          {waiting && <p>{t("respondFirst")}</p>}
          {find.ringing && (
            <p className="phone-find-note" role="status">
              {t("findNote")}
            </p>
          )}
        </section>
      )}

      {/* 5 — the caregiver sets the default mode; the wearer may change it,
          which still raises the existing caregiver notification. */}
      {!isEmergency && <CaregiverModeDock />}

      {/* 6 — one row carries connection, battery and the single last-known
          location reading. Live maps and the radius slider live in Care tools. */}
      {!isEmergency && (
        <section
          className="cph-summary"
          aria-label="Device and location summary"
        >
          <span className="cph-summary-item">
            <Wifi size={14} aria-hidden="true" />
            <strong>{s.connected ? t("connected") : t("disconnected")}</strong>
          </span>
          <span className="cph-summary-item">
            <Battery size={14} aria-hidden="true" />
            <strong>{s.battery}%</strong>
          </span>
          <span
            className="cph-summary-item cph-summary-location"
            title={`${t("lastKnown")}: ${shortLocation}`}
            aria-label={`${t("lastKnown")}: ${shortLocation}`}
          >
            <MapPin size={14} aria-hidden="true" />
            <small>Last known</small>
            <strong>{shortLocation}</strong>
          </span>
        </section>
      )}

      {/* 7 — home and the safe-zone radius at a glance (the walk-home map
          replaces it while guidance runs). */}
      {!isEmergency && !routeActive && !alerting && (
        <section className="cph-zone" aria-label="Safe zone around home">
          <ZoneMap compact />
        </section>
      )}

      {isEmergency ? (
        <section
          className={`phone-action-card urgent cph-emergency ${offerPolice || policeStation ? "cph-emergency-compact" : ""}`}
        >
          <h3>{t("attention")}</h3>
          <ol className="phone-timeline" aria-label={t("sosTimeline")}>
            <li className="done">
              <Check size={14} />
              <span>{t("tlSent")}</span>
              {emergency && <time>{timeAgo(lang, emergency.time)}</time>}
            </li>
            <li className={ack ? "done" : "current"}>
              {ack ? <Check size={14} /> : <i />}
              <span>{t("tlAcked")}</span>
              {ack && <time>{timeAgo(lang, ack)}</time>}
            </li>
            <li>
              <i />
              <span>{t("tlResolved")}</span>
            </li>
          </ol>
          {emergency && !ack && (
            <button
              className="button"
              onClick={() => s.acknowledgeEmergency(emergency.id)}
            >
              {t("ackSos")}
            </button>
          )}
          {ack && <p>{t("sosAckRecorded")}</p>}
          <Link className="button light" to="/caregiver/emergency">
            {t("reviewSos")} <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        <>
          {!guiding && !familyRequestDone && <ZoneLadder />}
          {routeActive ? (
            <section className="phone-action-card cph-route">
              <h3>{t("routeLabel")}</h3>
              {guiding && <RouteHomeMap />}
              <div className="phone-stops" aria-hidden="true">
                {approved.map((l, i) => (
                  <span
                    key={l.id}
                    className={
                      i < s.guideIndex
                        ? "done"
                        : i === s.guideIndex
                          ? "now"
                          : ""
                    }
                  >
                    <i />
                    <small data-name={l.name} />
                  </span>
                ))}
              </div>
              <p>
                {t("nextStop", {
                  place: approved[s.guideIndex]?.name ?? "—",
                })}
              </p>
            </section>
          ) : null}
          {guiding && <ZoneLadder />}
        </>
      )}
      {/* A finished family request is reported in the hero; the full
          response card is only useful while it is waiting for us. */}
      {!familyRequestDone && <FamilyResponse />}
    </div>
  );
}
