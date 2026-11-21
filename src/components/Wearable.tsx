import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  BatteryLow,
  BellOff,
  BellRing,
  Check,
  Heart,
  House,
  Leaf,
  MessageCircle,
  Phone,
  ShieldAlert,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HandHelping,
  MapPin,
  SlidersHorizontal,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
} from "lucide-react";
import { useZone, legTarget } from "../zone/store";
import { planRoute } from "../zone/route";
import { useWatchUi } from "./watchUi";
import { MemoryGardenExperience } from "../memory/MemoryPlayer";
import { useStore, navigable } from "../store";
import { attachmentNames, wearLabels } from "../services/safety";
import {
  startRingtone,
  stopRingtone,
  useFind,
  type FindRing,
} from "../services/find";
import { LandmarkPhoto } from "./LandmarkPhoto";
import { ResolveSOSButton } from "./ResolveSOSButton";
import { SOSButton } from "./SOSButton";
import { Sprout } from "./Sprout";
import "../watch-ui.css";
import { useLang, useT, modeMessage, noteText } from "../i18n";
import {
  useCaregiverPopups,
  type CaregiverPopupLevel,
} from "../services/caregiverPopup";
export { Photo } from "./Photo";

type TalkReply = "intro" | "comfort" | "where" | "who" | "nice";

// The wearer sees exactly one screen at a time, chosen from the safety mode.
// Every action calls the existing store; this component holds no safety logic.
export function Wearable({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
  const location = useLocation();
  const [talk, setTalk] = useState<TalkReply | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);
  const [arrived, setArrived] = useState(false);
  const prevMode = useRef(s.mode);
  useEffect(() => {
    if (s.mode !== "NORMAL") {
      setTalk(null);
      setShowModePicker(false);
    }
    if (
      prevMode.current === "GUIDED_RETURN" &&
      s.mode === "NORMAL" &&
      s.position === 6
    )
      setArrived(true);
    if (s.mode !== "NORMAL") setArrived(false);
    prevMode.current = s.mode;
  }, [s.mode, s.position]);
  const acknowledged =
    s.checkIn?.response === "okay" &&
    s.checkIn.source !== "caregiver" &&
    s.interactionNote.startsWith("Thank you for telling me") &&
    s.mode !== "EMERGENCY_SIMULATED";
  const z = useZone();
  const watchUi = useWatchUi();
  // Safety always wins: if anything needs the wearer's attention, leave the
  // Memory Garden so the alert or guidance owns the screen.
  useEffect(() => {
    // The activity itself is paused by the memory safety rules and can be
    // resumed later; only the watch view is closed here.
    if (s.mode !== "NORMAL" && useWatchUi.getState().memories)
      useWatchUi.getState().closeMemories();
  }, [s.mode]);
  // Bring the watch into view when the Memory Garden opens on it.
  const watchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!watchUi.memories) return;
    const el = watchRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight)
      el.scrollIntoView({
        behavior: s.settings.reducedMotion ? "instant" : "smooth",
        block: "center",
      });
  }, [watchUi.memories]);
  const [buzzing, setBuzzing] = useState(false);
  useEffect(() => {
    if (!z.buzzAt || Date.now() - z.buzzAt > 1500) return;
    setBuzzing(true);
    const off = setTimeout(() => setBuzzing(false), 1300);
    return () => clearTimeout(off);
  }, [z.buzzAt]);
  // Find My: the caregiver is ringing this band. The watch shakes, vibrates
  // and repeats a tone until the wearer stops it (or 30 s pass). Safety
  // screens win: an emergency owns the watch instead, and an offline band
  // cannot ring.
  const find = useFind();
  const ringing: FindRing | null =
    find.ringing && s.connected && s.mode !== "EMERGENCY_SIMULATED"
      ? find.ringing
      : null;
  useEffect(() => {
    if (!ringing) return;
    startRingtone();
    const vibrate =
      "vibrate" in navigator
        ? window.setInterval(() => navigator.vibrate([260, 140, 260]), 900)
        : null;
    const timeout = window.setTimeout(() => useFind.getState().stop(), 30000);
    return () => {
      stopRingtone();
      if (vibrate !== null) window.clearInterval(vibrate);
      window.clearTimeout(timeout);
    };
  }, [ringing]);
  useEffect(() => {
    if (find.ringing && (!s.connected || s.mode === "EMERGENCY_SIMULATED")) {
      useFind.getState().stop();
    }
  }, [find.ringing, s.connected, s.mode]);
  const wearerFirst = s.settings.wearer.split(" ")[0];
  // Only ask "Heading home?" when no other safety screen owns the watch.
  const zonePrompt = z.prompt && (s.mode === "NORMAL" || s.mode === "CHECK_IN");
  const [now, setNow] = useState(new Date());
  const approved = s.landmarks.filter(navigable);
  const landmark = approved[s.guideIndex];
  const name = s.settings.companionName;
  const caregiver = s.settings.caregiver;
  const experienceMode = s.settings.experienceMode;
  const experienceModeLabel =
    experienceMode === "focus"
      ? t("focusMode")
      : experienceMode === "dialogue"
        ? t("dialogueMode")
        : t("normalMode");
  const reportWatchAction = (
    label: string,
    level: CaregiverPopupLevel = "awareness",
  ) =>
    useCaregiverPopups
      .getState()
      .notify(`${wearerFirst} used the watch`, label, level);
  const captureWatchAction = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest("button");
    if (
      !button ||
      button.disabled ||
      button.dataset.caregiverSkipNotification === "true"
    )
      return;
    const label =
      button.dataset.caregiverAction ||
      button.getAttribute("aria-label") ||
      button.textContent?.replace(/\s+/g, " ").trim();
    if (!label) return;
    const level: CaregiverPopupLevel = /SOS|emergency|urgent help/i.test(label)
      ? "urgent"
      : /home|mode|guidance|okay|not yet|see it|arrived|help|call/i.test(label)
        ? "awareness"
        : "routine";
    reportWatchAction(label.slice(0, 90), level);
  };
  const guidanceBlocked =
    !s.connected || !s.worn || s.signals.gpsConfidence < 0.6;
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (s.settings.voice && "speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(
        s.mode === "GUIDED_RETURN"
          ? guidanceBlocked || s.wearStatus !== "likely_worn"
            ? t("guidancePaused")
            : landmark?.spokenCue || landmark?.instruction || t("noLandmarks")
          : modeMessage(lang, s.mode, name),
      );
      speech.lang = lang === "id" ? "id-ID" : "en-US";
      window.speechSynthesis.speak(speech);
      return () => window.speechSynthesis.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.mode,
    s.settings.voice,
    name,
    lang,
    landmark?.id,
    landmark?.spokenCue,
    landmark?.instruction,
    s.connected,
    s.wearStatus,
    s.signals.gpsConfidence,
  ]);

  const note =
    s.interactionNote && s.mode !== "EMERGENCY_SIMULATED" ? (
      <p className="wos-note" role="status">
        {noteText(lang, s.interactionNote)}
      </p>
    ) : null;

  const speech = (text: string) => (
    <div className="speech" aria-live="polite">
      {text}
    </div>
  );

  const zoneGuided = s.mode === "GUIDED_RETURN" && z.guideStartM !== null;
  const walking = zoneGuided && z.phase === "walking";
  const legRemaining = zoneGuided
    ? Math.max(
        0,
        z.distanceM -
          legTarget(z.guideStartM ?? 0, s.guideIndex, approved.length),
      )
    : 0;
  // Turn-by-turn text comes from the same route plan the caregiver map draws.
  const turn = planRoute(approved.length).turns[s.guideIndex] ?? "straight";
  const previous = approved[s.guideIndex - 1];
  const directionText =
    turn === "right" && previous
      ? t("turnRightAt", { name: previous.name })
      : turn === "left" && previous
        ? t("turnLeftAt", { name: previous.name })
        : t("goStraight");
  // The watch says only the turn; the photo shows where.
  const shortDirection =
    turn === "right"
      ? t("turnRight")
      : turn === "left"
        ? t("turnLeft")
        : t("goStraight");
  const legLength =
    zoneGuided && approved.length ? (z.guideStartM ?? 0) / approved.length : 0;
  const legDone = legLength
    ? Math.min(1, Math.max(0, 1 - legRemaining / legLength))
    : 0;
  const DirectionIcon =
    turn === "right"
      ? () => <CornerUpRight size={26} />
      : turn === "left"
        ? () => <CornerUpLeft size={26} />
        : () => <ArrowUp size={26} />;

  let screen: React.ReactNode;
  let screenKey: string = s.mode;

  if (s.mode === "EMERGENCY_SIMULATED") {
    const sos = s.alerts.find((a) => a.emergency && !a.emergency.resolvedAt);
    const seen = !!sos?.emergency?.acknowledgedAt;
    screen = (
      <div className="wos-sos">
        <div className="wos-sos-icon" aria-hidden="true">
          <ShieldAlert size={30} />
        </div>
        {speech(modeMessage(lang, s.mode, name))}
        <ol className="wos-steps" aria-label="SOS progress">
          <li className="done">
            <Check size={13} /> {t("stepSent")}
          </li>
          <li className={seen ? "done" : "current"}>
            {seen ? <Check size={13} /> : <span className="dot" />}{" "}
            {t("stepSeen")}
          </li>
        </ol>
        <p className="wos-sos-who">
          {seen ? t("sosAcked", { caregiver }) : t("sosWaiting", { caregiver })}
        </p>
        <div className="sos-message">
          <p>
            {t("sosNotified", { caregiver, emergency: s.settings.emergency })}
          </p>
          <small>{t("sosNoReal")}</small>
        </div>
        <p className="wos-calm">{t("stayHere")}</p>
        <ResolveSOSButton />
      </div>
    );
  } else if (zonePrompt) {
    screenKey = `zone-${z.promptAt}`;
    screen = (
      <div className="wos-center wos-zone">
        <div className="wos-zone-icon" aria-hidden="true">
          <MapPin size={28} />
        </div>
        <strong className="wos-zone-title">{t("zoneTitle")}</strong>
        <span className="sr-only">
          {t("zoneDistance", { km: (z.distanceM / 1000).toFixed(2) })}
        </span>
        <button
          className="watch-action wos-primary"
          onClick={() => {
            z.acceptGuide();
            s.chooseAssistance("home");
          }}
        >
          <House size={18} /> {t("zoneYes")}
        </button>
        <button className="wos-ghost" onClick={z.decline}>
          {t("zoneNo")}
        </button>
        <span className="wos-zone-timer" aria-hidden="true" />
      </div>
    );
  } else if (s.mode === "GUIDED_RETURN") {
    screenKey = `guide-${landmark?.id ?? "none"}`;
    // Landmark-led and minimal: one big photo of the place, one short line,
    // big buttons. Progress is the dots; distance and repeats are left out.
    screen = landmark ? (
      <div
        className={`watch-landmark wos-guide2 ${walking ? "is-walking" : ""} ${experienceMode === "focus" ? "is-focus" : ""}`}
      >
        <span
          className="wos-dots"
          role="img"
          aria-label={t("stopOf", {
            n: s.guideIndex + 1,
            total: approved.length,
          })}
        >
          {approved.map((l, i) => (
            <i
              key={l.id}
              className={
                i < s.guideIndex ? "done" : i === s.guideIndex ? "now" : ""
              }
            />
          ))}
        </span>
        {walking && (
          <div className="wos-dir2" aria-live="polite">
            <DirectionIcon />
            <b>{shortDirection}</b>
            <i className="wos-leg-bar" aria-hidden="true">
              <i style={{ width: `${Math.round(legDone * 100)}%` }} />
            </i>
          </div>
        )}
        <div className="wos-photo2">
          <LandmarkPhoto landmark={landmark} />
        </div>
        <strong className="wos-place">
          {walking ? landmark.name : t("doYouSee", { name: landmark.name })}
        </strong>
        {guidanceBlocked && (
          <p role="status" className="wos-warn">
            {t("guidancePaused")}
          </p>
        )}
        <button
          className="watch-action wos-primary"
          disabled={guidanceBlocked}
          onClick={() => s.nextLandmark(landmark.id)}
        >
          <Check size={20} /> {t("iSeeIt")}
        </button>
        <div className="wos-row2">
          <button
            className="wos-secondary"
            onClick={() => s.chooseAssistance("unrecognized")}
          >
            {t("iDontSeeIt")}
          </button>
          {experienceMode !== "focus" && (
            <button
              className="wos-secondary wos-call-mini"
              aria-label={t("callMyFamily")}
              onClick={() => s.chooseAssistance("family")}
            >
              <Phone size={18} aria-hidden="true" />
              {lang === "id" ? "Telepon" : "Call"}
            </button>
          )}
        </div>
        <button
          className="wos-ghost cancel-guidance"
          onClick={s.cancelGuidance}
        >
          {t("cancelGuidance")}
        </button>
      </div>
    ) : (
      <div className="watch-landmark wos-center">
        <Sprout small />
        <p>{t("noLandmarks")}</p>
        <button className="watch-action" onClick={() => s.event("HELP")}>
          {t("contactCaregiver")}
        </button>
        <button
          className="wos-ghost cancel-guidance"
          onClick={s.cancelGuidance}
        >
          {t("cancelGuidance")}
        </button>
      </div>
    );
  } else if (s.mode === "REORIENTATION") {
    const missed = s.missedLandmark
      ? approved.find((l) => l.id === s.missedLandmark?.id)
      : undefined;
    screenKey = missed ? `missed-${missed.id}` : screenKey;
    screen = (
      <div className="watch-landmark wos-center wos-calm-screen">
        <div className="wos-breathe" aria-hidden="true">
          <span />
        </div>
        {speech(modeMessage(lang, s.mode, name))}
        {missed ? (
          <>
            <div className="wos-photo small">
              <LandmarkPhoto landmark={missed} />
            </div>
            <strong className="wos-missed-name">{missed.name}</strong>
            <button
              className="watch-action wos-primary see-it-now"
              onClick={s.seeItNow}
            >
              <Check size={18} /> {t("seeItNow")}
            </button>
            <button
              className="wos-secondary"
              onClick={() => s.chooseAssistance("family")}
            >
              <Phone size={15} /> {t("helpFamily")}
            </button>
            {/* Minimal text (TEAM_PLAN v2): icon-only, name kept for tests */}
            <button
              className="wos-ghost cancel-guidance wos-icon-only"
              aria-label={t("cancelGuidance")}
              onClick={s.backToHome}
            >
              <House size={18} />
            </button>
          </>
        ) : (
          <>
            <small className="wos-kicker">{t("breathe")}</small>
            {approved[0] && (
              <div className="wos-photo small">
                <LandmarkPhoto landmark={approved[0]} />
              </div>
            )}
            <p>{t("takeTime")}</p>
            {note}
            <button
              className="watch-action wos-primary"
              onClick={() => s.chooseAssistance("family")}
            >
              <Phone size={17} /> {t("helpFamily")}
            </button>
            {/* Minimal text (TEAM_PLAN v2): icon-only, name kept for tests */}
            <button
              className="wos-ghost cancel-guidance wos-icon-only"
              aria-label={t("cancelGuidance")}
              onClick={s.backToHome}
            >
              <House size={18} />
            </button>
          </>
        )}
      </div>
    );
  } else if (s.mode === "CAREGIVER_HANDOVER") {
    const status = s.familyRequest?.status;
    screen = (
      <div className="watch-landmark wos-center wos-handover">
        <div className={`avatar ${status ?? "none"}`}>
          {caregiver.slice(0, 1)}
        </div>
        <strong>{caregiver}</strong>
        {s.familyRequest && (
          <ol className="wos-steps" aria-label="Family request progress">
            <li className="done">
              <Check size={13} /> {t("stepSent")}
            </li>
            <li className={status !== "waiting" ? "done" : "current"}>
              {status !== "waiting" ? (
                <Check size={13} />
              ) : (
                <span className="dot" />
              )}{" "}
              {t("stepSeen")}
            </li>
            <li
              className={
                status === "responded"
                  ? "done"
                  : status === "acknowledged"
                    ? "current"
                    : ""
              }
            >
              {status === "responded" ? (
                <Check size={13} />
              ) : (
                <span className="dot" />
              )}{" "}
              {t("stepComing")}
            </li>
          </ol>
        )}
        {!s.familyRequest && (
          <button
            className="watch-action wos-primary"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={17} /> {t("helpFamily")}
          </button>
        )}
        <p>
          {!s.familyRequest
            ? t("needsReview")
            : status === "responded"
              ? t("caregiverResponded", { caregiver })
              : t("waitingCaregiver")}
        </p>
        <small>{s.familyRequest ? t("notifSent") : t("notifNone")}</small>
        {note}
        {status !== "responded" && (
          /* Minimal text (TEAM_PLAN v2): icon-only, name kept for tests */
          <button
            className="wos-back wos-icon-only"
            aria-label={t("backHome")}
            onClick={s.backToHome}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {status === "responded" && (
          <button
            className="watch-action wos-primary"
            onClick={() => s.answerCheckIn("okay")}
          >
            {t("continueAfter")}
          </button>
        )}
      </div>
    );
  } else if (s.mode === "CHECK_IN" && s.checkIn?.stage === "help_options") {
    screenKey = "help-options";
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(t("howHelp"))}
        {note}
        <div className="watch-controls wos-list">
          <button
            className="watch-action"
            onClick={() => s.chooseAssistance("home")}
          >
            <House size={18} /> {t("helpHome")}
          </button>
          <button
            className="watch-action"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={18} /> {t("helpFamily")}
          </button>
          <button
            className="watch-action"
            onClick={() => s.chooseAssistance("confused")}
          >
            <HandHelping size={18} /> {t("helpConfused")}
          </button>
          <button className="wos-back" onClick={s.returnToCheckIn}>
            <ChevronLeft size={16} /> {t("backCheckIn")}
          </button>
        </div>
      </div>
    );
  } else if (s.mode === "CHECK_IN" && !acknowledged) {
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(modeMessage(lang, s.mode, name))}
        <small className="wos-kicker">{t("checkInHint")}</small>
        {note}
        <div className="watch-controls wos-answer">
          <button
            className="watch-action wos-yes"
            onClick={() => s.answerCheckIn("okay")}
          >
            <Heart size={22} />
            {t("okay")}
          </button>
          <button className="wos-help" onClick={() => s.answerCheckIn("help")}>
            <HandHelping size={22} />
            {t("needHelp")}
          </button>
        </div>
      </div>
    );
  } else if (watchUi.memories && s.mode === "NORMAL") {
    screenKey = "memories";
    screen = (
      <div className="wos-memories">
        <MemoryGardenExperience
          onClose={() => {
            watchUi.closeMemories();
            s.dismissAcknowledgment();
          }}
        />
      </div>
    );
  } else if (acknowledged) {
    screenKey = "acknowledged";
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(modeMessage(lang, "NORMAL", name))}
        {note}
        <div className="watch-controls wos-list">
          <button className="watch-action" onClick={watchUi.openMemories}>
            <Leaf size={17} /> {t("openGarden")}
          </button>
          <button className="wos-back" onClick={s.dismissAcknowledgment}>
            {t("returnHome")}
          </button>
        </div>
      </div>
    );
  } else if (arrived) {
    screenKey = "arrived";
    screen = (
      <div className="wos-center wos-arrived">
        <div className="wos-arrived-badge" aria-hidden="true">
          <House size={30} />
        </div>
        <strong className="wos-arrived-title">
          {lang === "id" ? "Selamat datang di rumah." : "Welcome home."}
        </strong>
        <Sprout small />
        {speech(modeMessage(lang, "NORMAL", name))}
        <button
          className="watch-action wos-primary"
          onClick={() => {
            setArrived(false);
            s.dismissAcknowledgment();
          }}
        >
          {t("backHome")}
        </button>
      </div>
    );
  } else if (showModePicker) {
    screenKey = "choose-experience-mode";
    const choices = [
      {
        id: "normal" as const,
        label: t("normalMode"),
        hint: t("normalModeHint"),
        icon: Heart,
      },
      {
        id: "focus" as const,
        label: t("focusMode"),
        hint: t("focusModeHint"),
        icon: ArrowUp,
      },
      {
        id: "dialogue" as const,
        label: t("dialogueMode"),
        hint: t("dialogueModeHint", { companion: name }),
        icon: MessageCircle,
      },
    ];
    screen = (
      <div className="wos-center wos-mode-picker">
        <SlidersHorizontal size={27} aria-hidden="true" />
        <strong>{t("chooseMode")}</strong>
        <small className="wos-mode-notice">{t("modeChangeNotice")}</small>
        <div className="watch-controls wos-list">
          {choices.map((choice) => {
            const Icon = choice.icon;
            const selected = experienceMode === choice.id;
            return (
              <button
                key={choice.id}
                className="watch-action wos-mode-choice"
                aria-pressed={selected}
                data-caregiver-action={`Changed watch to ${choice.label} mode`}
                onClick={() => {
                  s.setExperienceMode(choice.id, "wearer");
                  setTalk(null);
                  setShowModePicker(false);
                }}
              >
                <span className="wos-mode-choice-icon">
                  <Icon size={17} />
                </span>
                <span>
                  <strong>{choice.label}</strong>
                  <small>{choice.hint}</small>
                </span>
                {selected && <Check size={16} className="wos-mode-check" />}
              </button>
            );
          })}
          <button className="wos-back" onClick={() => setShowModePicker(false)}>
            <ChevronLeft size={16} /> {t("backHome")}
          </button>
        </div>
      </div>
    );
  } else if (experienceMode === "focus") {
    screenKey = "focus-home";
    screen = (
      <div className="wos-center wos-focus-home">
        <span className="wos-profile-label">FOCUS MODE</span>
        <div className="wos-focus-icon" aria-hidden="true">
          <ArrowUp size={34} />
        </div>
        <strong>{t("focusTitle")}</strong>
        <button
          className="watch-action wos-primary wos-focus-primary"
          onClick={() => s.chooseAssistance("home")}
        >
          <House size={22} /> {t("focusHome")}
        </button>
        <button
          className="wos-secondary"
          onClick={() => s.chooseAssistance("family")}
        >
          <Phone size={18} /> {t("callFamily")}
        </button>
      </div>
    );
  } else if (experienceMode === "dialogue" || talk) {
    const activeTalk = talk ?? "intro";
    screenKey = `talk-${activeTalk}`;
    const reply =
      activeTalk === "comfort"
        ? t("talkComfort")
        : activeTalk === "where"
          ? t("talkWhereReply")
          : activeTalk === "who"
            ? t("talkWhoReply", { caregiver })
            : activeTalk === "nice"
              ? t("talkSomethingNiceReply")
              : t("talkIntro");
    screen = (
      <div className="wos-talk">
        {experienceMode === "dialogue" && (
          <span className="wos-profile-label">DIALOGUE MODE</span>
        )}
        <div className="wos-talk-head">
          <Sprout small />
          <p className="wos-bubble">{reply}</p>
        </div>
        <div className="watch-controls wos-list">
          <button className="wos-chip" onClick={() => setTalk("where")}>
            {t("talkWhere")}
          </button>
          <button className="wos-chip" onClick={() => setTalk("who")}>
            {t("talkWho")}
          </button>
          <button className="wos-chip" onClick={() => setTalk("comfort")}>
            <Sparkles size={15} /> {t("somethingComforting")}
          </button>
          <button className="wos-chip" onClick={() => setTalk("nice")}>
            <MessageCircle size={15} /> {t("talkSomethingNice")}
          </button>
          {experienceMode === "dialogue" ? (
            <button
              className="wos-back"
              onClick={() => s.chooseAssistance("home")}
            >
              <House size={16} /> {t("focusHome")}
            </button>
          ) : (
            <button className="wos-back" onClick={() => setTalk(null)}>
              <ChevronLeft size={16} /> {t("backHome")}
            </button>
          )}
        </div>
      </div>
    );
  } else {
    screenKey = "home";
    screen = (
      <div className="wos-home">
        <div className="wos-hello">
          <Sprout small />
          {speech(t("hiName", { name: wearerFirst, companion: name }))}
        </div>
        {/* Simplified emoji home (TEAM_PLAN v2): Home / Call / Talk / Game.
            Accessible names keep the established task wording. */}
        <div
          className="wos-emoji-grid"
          role="group"
          aria-label="Wearer actions"
        >
          <button
            className="wos-emoji-tile"
            aria-label={t("goHome")}
            onClick={() => s.chooseAssistance("home")}
          >
            <span className="wos-emoji-symbol" aria-hidden="true">
              🏠
            </span>
            <span>{lang === "id" ? "Pulang" : "Home"}</span>
          </button>
          <button
            className="wos-emoji-tile"
            aria-label={t("callFamily")}
            onClick={() => s.chooseAssistance("family")}
          >
            <span className="wos-emoji-symbol" aria-hidden="true">
              📞
            </span>
            <span>{lang === "id" ? "Telepon" : "Call"}</span>
          </button>
          <button
            className="wos-emoji-tile"
            aria-label={t("talk")}
            onClick={() => setTalk("intro")}
          >
            <span className="wos-emoji-symbol" aria-hidden="true">
              💬
            </span>
            <span>{lang === "id" ? "Obrolan" : "Talk"}</span>
          </button>
          <button
            className="wos-emoji-tile"
            aria-label={t("memories")}
            onClick={watchUi.openMemories}
          >
            <span className="wos-emoji-symbol" aria-hidden="true">
              🎮
            </span>
            <span>{lang === "id" ? "Permainan" : "Game"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`watch-area mode-${s.mode.toLowerCase()} experience-${experienceMode} ${s.attachment} ${compact ? "compact" : ""} ${buzzing ? "buzz" : ""} ${ringing ? "find-ring" : ""} ${zonePrompt ? "zone-alert" : ""}`}
      onClickCapture={captureWatchAction}
    >
      <div className="watch-strap top" />
      <div className="watch" ref={watchRef}>
        <div className="watch-crown" aria-hidden="true" />
        <div className="watch-side-button" aria-hidden="true" />
        {/* wh-screen: ownership hook for watch-ui.css — its rules anchor on
            this class so they out-rank the shared upgrade.css tiers even
            though that file is bundled after this component's styles. */}
        <div className="watch-screen wos wh-screen">
          {/* Minimal status row (minimal-text rule): the time plus only the
              signals that matter to the wearer. The companion name is spoken
              by the greeting below; battery appears only when it is low. */}
          <div className="watch-status">
            <span>
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="watch-signal">
              {s.connected ? (
                <i className="wos-live" aria-label="Connected" />
              ) : (
                <>
                  <WifiOff size={12} />
                  <span>{t("offline")}</span>
                </>
              )}
              {s.battery <= 20 && (
                <>
                  <BatteryLow size={16} className="wos-low" />
                  <span>{s.battery}%</span>
                </>
              )}
            </span>
          </div>
          <span className="sr-only">
            {attachmentNames[s.attachment]} · {wearLabels[s.wearStatus]}{" "}
            (inferred)
          </span>
          <div className="wos-body" data-screen={screenKey} key={screenKey}>
            {screen}
          </div>
          <div className="wos-footer">
            {/* Settings live on the four-button home only: safety screens and
                activity screens keep the whole footer row for the SOS bar. */}
            {s.mode === "NORMAL" &&
              !watchUi.memories &&
              !showModePicker &&
              screenKey === "home" && (
                <button
                  className="wos-mode-button"
                  onClick={() => setShowModePicker(true)}
                >
                  <SlidersHorizontal size={14} />
                  {t("modeButton", { mode: experienceModeLabel })}
                </button>
              )}
            {s.guidanceActive &&
              s.mode !== "GUIDED_RETURN" &&
              s.mode !== "EMERGENCY_SIMULATED" && (
                <button
                  className="wos-ghost cancel-guidance wos-footer-cancel"
                  onClick={s.cancelGuidance}
                >
                  {t("cancelGuidance")}
                </button>
              )}
            <SOSButton />
          </div>
          {ringing && (
            <div className="wos-find" role="alert">
              <span className="wos-find-icon" aria-hidden="true">
                <BellRing size={28} />
              </span>
              <strong>{t("findTitle", { companion: name })}</strong>
              <p>{t("findBody", { caregiver: ringing.by })}</p>
              <button
                className="wos-stop"
                onClick={() => useFind.getState().stop()}
              >
                <BellOff size={17} /> {t("findStop")}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="watch-strap bottom" />
    </div>
  );
}
