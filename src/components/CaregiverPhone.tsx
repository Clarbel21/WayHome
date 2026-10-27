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
import { useLang, useT, timeAgo } from "../i18n";
import { evaluateSignals } from "../services/safety";
import {
  Check,
  MapPinned,
  BatteryLow,
  Satellite,
  AlertTriangle,
} from "lucide-react";
import { wearLabels } from "../services/safety";
import { CheckInHistory, FamilyResponse } from "./CheckInSupport";

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
              <p>{t("circle")}</p>
              <strong>
                {t("hello", { name: s.settings.caregiver.split(" ")[0] })}
              </strong>
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
          <Link className="phone-workspace-link" to="/caregiver">
            {t("workspace")} <ArrowRight size={16} />
          </Link>
          <p className="phone-disclaimer">{t("demoOnly")}</p>
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
            {s.alerts.some((a) => !a.read) && (
              <i className="notification-dot" />
            )}
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

const statusId: Record<string, string> = {
  "No active alerts": "Tidak ada peringatan",
  "Check-in Needed": "Perlu disapa",
  "Guidance Active": "Panduan aktif",
  "Caregiver Assistance Requested": "Bantuan diminta",
  "Simulated SOS": "SOS simulasi",
};

// Today tab: one status, one next action, then context. Safety rules stay in the store.
function PhoneToday() {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
  const wearer = s.settings.wearer;
  const first = wearer.split(" ")[0];
  const isEmergency = s.mode === "EMERGENCY_SIMULATED";
  const waiting = !!s.familyRequest && s.familyRequest.status !== "responded";
  const findings = evaluateSignals(s.signals);
  const emergency = s.alerts.find(
    (a) => a.emergency && !a.emergency.resolvedAt,
  );
  const approved = s.landmarks.filter(navigable);
  const tone = isEmergency
    ? "urgent"
    : s.mode === "NORMAL" && !findings.length && s.connected
      ? "calm"
      : "attention";
  const heading =
    lang === "id"
      ? (statusId[status[s.mode]] ?? status[s.mode])
      : status[s.mode];
  const subtitle = isEmergency
    ? t("sosSub")
    : s.mode === "GUIDED_RETURN"
      ? t("walkingHome", { wearer: first })
      : s.checkIn?.stage === "question"
        ? t("waitingAnswer", { wearer: first })
        : waiting
          ? t("familySub")
          : s.mode === "NORMAL" && !findings.length
            ? t("calmSub")
            : t("changedSub");
  const sendCheckIn = () => {
    s.event("CHECK");
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
  return (
    <>
      <section
        className={`phone-status tone-${tone} ${isEmergency ? "phone-emergency" : ""}`}
        aria-live="polite"
      >
        <span className="phone-status-label">{wearer} · LIVE DEMO</span>
        <span className={`phone-tone-chip ${tone}`}>
          {tone === "urgent"
            ? t("urgent")
            : tone === "calm"
              ? t("allCalm")
              : t("needsAttention")}
        </span>
        <h3>{heading}</h3>
        <p>{subtitle}</p>
        {s.mode === "CHECK_IN" && s.checkIn?.stage === "question" && (
          <span className="phone-live-dot" aria-hidden="true" />
        )}
      </section>

      {isEmergency ? (
        <section className="phone-action-card urgent">
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
          {waiting && <FamilyResponse />}
          <section className="phone-action-card">
            {s.mode === "GUIDED_RETURN" && approved.length > 0 ? (
              <>
                <h3>{t("routeLabel")}</h3>
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
              </>
            ) : findings.length ? (
              <>
                <h3>{t("whyAttention")}</h3>
                <ul className="phone-findings">
                  {findings.map((f) => (
                    <li key={f.key}>
                      <AlertTriangle size={15} />
                      <span>{f.reason.split(":")[0]}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h3>{t("reassureTitle")}</h3>
                <p>{t("reassureBody")}</p>
              </>
            )}
            <button className="button" disabled={waiting} onClick={sendCheckIn}>
              {t("sendCheckIn")}
            </button>
            {waiting && <p>{t("respondFirst")}</p>}
          </section>
        </>
      )}
      {(!waiting || isEmergency) && <FamilyResponse />}
      {s.battery <= 20 && (
        <p className="phone-banner warn">
          <BatteryLow size={16} />
          {t("lowBattery", { n: s.battery, wearer: first })}
        </p>
      )}
      <section
        className="phone-location-card"
        aria-label="Simulated location overview"
      >
        <RouteStrip
          position={s.position}
          lowGps={s.signals.gpsConfidence < 0.6}
        />
        <div className="location-caption">
          <MapPin size={17} />
          <div>
            <strong>{t("lastKnown")}</strong>
            <small>{simulatedLocation(s.position)}</small>
            <small>
              Simulated GPS confidence ·{" "}
              {Math.round(s.signals.gpsConfidence * 100)}%
            </small>
          </div>
        </div>
      </section>
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
    </>
  );
}

// Seven fictional route points, matching simulatedLocation(); home is the last.
const ROUTE = [
  [24, 78],
  [62, 62],
  [104, 66],
  [146, 46],
  [190, 52],
  [232, 46],
  [276, 40],
];
function RouteStrip({
  position,
  lowGps,
}: {
  position: number;
  lowGps: boolean;
}) {
  const p = Math.max(0, Math.min(6, Math.round(position)));
  const d = ROUTE.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const done = ROUTE.slice(0, p + 1)
    .map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`)
    .join(" ");
  const [cx, cy] = ROUTE[p];
  return (
    <div className="location-illustration route-strip" aria-hidden="true">
      <svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice">
        <rect width="300" height="100" fill="#e4eadb" />
        <rect x="40" y="8" width="60" height="26" rx="8" fill="#d3dfc8" />
        <rect x="180" y="68" width="80" height="24" rx="8" fill="#d3dfc8" />
        <path
          d={d}
          stroke="#faf9f2"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          stroke="#b7c6ab"
          strokeWidth="2"
          strokeDasharray="3 5"
          fill="none"
        />
        <path
          d={done}
          stroke="#3b6b4c"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {ROUTE.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.6"
            fill={i <= p ? "#3b6b4c" : "#9fb293"}
          />
        ))}
        <g transform={`translate(${ROUTE[6][0]} ${ROUTE[6][1]})`}>
          <rect x="-9" y="-16" width="18" height="14" rx="2" fill="#28483b" />
          <path d="M-12 -15 L0 -25 L12 -15Z" fill="#28483b" />
        </g>
        <circle
          cx={cx}
          cy={cy}
          r={lowGps ? 20 : 13}
          fill={lowGps ? "#88651e33" : "#375c4030"}
        />
        <circle
          cx={cx}
          cy={cy}
          r="7"
          fill={lowGps ? "#88651e" : "#375c40"}
          stroke="white"
          strokeWidth="3"
        />
      </svg>
      <span>
        <MapPinned size={12} /> Illustrative demo map
      </span>
    </div>
  );
}
