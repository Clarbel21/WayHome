import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Battery,
  BatteryLow,
  Check,
  Heart,
  House,
  Leaf,
  MessageCircle,
  Phone,
  ShieldAlert,
  WifiOff,
  ChevronLeft,
  Sparkles,
  HandHelping,
  MapPin,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
} from "lucide-react";
import { useZone, legTarget } from "../zone/store";
import { planRoute } from "../zone/route";
import { useStore, navigable } from "../store";
import { attachmentNames, wearLabels } from "../services/safety";
import { LandmarkPhoto } from "./LandmarkPhoto";
import { ResolveSOSButton } from "./ResolveSOSButton";
import { SOSButton } from "./SOSButton";
import { Sprout } from "./Sprout";
import { useLang, useT, modeMessage, noteText } from "../i18n";
export { Photo } from "./Photo";

type TalkReply = "intro" | "comfort" | "where" | "who";

// The wearer sees exactly one screen at a time, chosen from the safety mode.
// Every action calls the existing store; this component holds no safety logic.
export function Wearable({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
  const location = useLocation();
  const [talk, setTalk] = useState<TalkReply | null>(null);
  const [arrived, setArrived] = useState(false);
  const prevMode = useRef(s.mode);
  useEffect(() => {
    if (s.mode !== "NORMAL") setTalk(null);
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
  const [buzzing, setBuzzing] = useState(false);
  useEffect(() => {
    if (!z.buzzAt || Date.now() - z.buzzAt > 1500) return;
    setBuzzing(true);
    const off = setTimeout(() => setBuzzing(false), 1300);
    return () => clearTimeout(off);
  }, [z.buzzAt]);
  const wearerFirst = s.settings.wearer.split(" ")[0];
  const zonePrompt =
    z.prompt && s.mode !== "EMERGENCY_SIMULATED" && s.mode !== "GUIDED_RETURN";
  const [now, setNow] = useState(new Date());
  const approved = s.landmarks.filter(navigable);
  const landmark = approved[s.guideIndex];
  const name = s.settings.companionName;
  const caregiver = s.settings.caregiver;
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
        {speech(t("zoneText", { name: wearerFirst }))}
        <small className="wos-kicker">
          {t("zoneDistance", { km: (z.distanceM / 1000).toFixed(2) })}
        </small>
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
    screen = landmark ? (
      <div className="watch-landmark wos-guide">
        <div className="wos-guide-top">
          <span>
            {t("stopOf", { n: s.guideIndex + 1, total: approved.length })}
          </span>
          <span className="wos-dots" aria-hidden="true">
            {approved.map((l, i) => (
              <i
                key={l.id}
                className={
                  i < s.guideIndex ? "done" : i === s.guideIndex ? "now" : ""
                }
              />
            ))}
          </span>
        </div>
        {walking && (
          <div className="wos-direction" aria-live="polite">
            <DirectionIcon />
            <span>
              <b>{directionText}</b>
              <small>
                {t("legToward", {
                  m: Math.round(legRemaining),
                  name: landmark.name,
                })}
              </small>
              <i className="wos-leg-bar" aria-hidden="true">
                <i style={{ width: `${Math.round(legDone * 100)}%` }} />
              </i>
            </span>
          </div>
        )}
        <div className={`wos-photo ${walking ? "small" : ""}`}>
          <LandmarkPhoto landmark={landmark} />
        </div>
        <small className="wos-kicker">
          {walking ? t("headingTo") : t("lookFor")}
        </small>
        <strong>{landmark.name}</strong>
        {!walking && zoneGuided && (
          <p className="wos-question">
            {t("doYouSee", { name: landmark.name })}
          </p>
        )}
        <p>{landmark.instruction}</p>
        {landmark.recognition && (
          <p className="recognition-cue">{landmark.recognition}</p>
        )}
        {!zoneGuided && (
          <small>
            {t("approx", {
              m: Math.max(
                10,
                ((landmark.gridPosition ?? s.guideIndex) + 1) * 40 -
                  s.position * 10,
              ),
            })}
          </small>
        )}
        {guidanceBlocked && (
          <p role="status" className="wos-warn">
            {t("guidancePaused")}
          </p>
        )}
        {note}
        <button
          className="watch-action wos-primary"
          disabled={guidanceBlocked}
          onClick={() => s.nextLandmark(landmark.id)}
        >
          <Check size={18} /> {t("iSeeIt")}
        </button>
        <button
          className="wos-secondary"
          onClick={() => s.chooseAssistance("unrecognized")}
        >
          {t("iDontSeeIt")}
        </button>
        <div className="wos-row">
          <button
            className="wos-ghost"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={14} /> {t("callMyFamily")}
          </button>
          <button
            className="wos-ghost cancel-guidance"
            onClick={s.cancelGuidance}
          >
            {t("cancelGuidance")}
          </button>
        </div>
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
    screen = (
      <div className="watch-landmark wos-center wos-calm-screen">
        <div className="wos-breathe" aria-hidden="true">
          <span />
        </div>
        {speech(modeMessage(lang, s.mode, name))}
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
      </div>
    );
  } else if (s.mode === "CAREGIVER_HANDOVER") {
    const status = s.familyRequest?.status;
    screen = (
      <div className="watch-landmark wos-center wos-handover">
        {speech(modeMessage(lang, s.mode, name))}
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
        {status === "acknowledged" && <p>{t("caregiverSeen")}</p>}
        <small>{s.familyRequest ? t("notifSent") : t("notifNone")}</small>
        {note}
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
  } else if (acknowledged) {
    screenKey = "acknowledged";
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(modeMessage(lang, "NORMAL", name))}
        {note}
        <div className="watch-controls wos-list">
          <Link
            className="watch-action"
            to="/memories"
            state={{ from: location.pathname }}
          >
            <Leaf size={17} /> {t("openGarden")}
          </Link>
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
  } else if (talk) {
    screenKey = `talk-${talk}`;
    const reply =
      talk === "comfort"
        ? t("talkComfort")
        : talk === "where"
          ? t("talkWhereReply")
          : talk === "who"
            ? t("talkWhoReply", { caregiver })
            : t("talkIntro");
    screen = (
      <div className="wos-talk">
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
          <button className="wos-back" onClick={() => setTalk(null)}>
            <ChevronLeft size={16} /> {t("backHome")}
          </button>
        </div>
      </div>
    );
  } else {
    screenKey = "home";
    screen = (
      <div className="wos-home">
        <div className="wos-hello">
          <Sprout small />
          {speech(modeMessage(lang, "NORMAL", name))}
        </div>
        {note}
        <div className="wos-tiles" role="group" aria-label="Wearer actions">
          <button
            className="wos-tile home"
            onClick={() => s.chooseAssistance("home")}
          >
            <House size={26} />
            <span>{t("goHome")}</span>
          </button>
          <button
            className="wos-tile family"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={26} />
            <span>{t("callFamily")}</span>
          </button>
          <button className="wos-tile talk" onClick={() => setTalk("intro")}>
            <MessageCircle size={26} />
            <span>{t("talk")}</span>
          </button>
          <Link
            className="wos-tile garden"
            to="/memories"
            state={{ from: location.pathname }}
          >
            <Leaf size={26} />
            <span>{t("memories")}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`watch-area mode-${s.mode.toLowerCase()} ${s.attachment} ${compact ? "compact" : ""} ${buzzing ? "buzz" : ""} ${zonePrompt ? "zone-alert" : ""}`}
    >
      <div className="watch-strap top" />
      <div className="watch">
        <div className="watch-crown" />
        <div className="watch-screen wos">
          <div className="watch-status">
            <span>
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span
              className="wos-wear"
              title={`${attachmentNames[s.attachment]} · ${wearLabels[s.wearStatus]} (inferred)`}
            >
              {s.settings.companionName}
            </span>
            <span>
              {s.connected ? (
                <i className="wos-live" aria-label="Connected" />
              ) : (
                <>
                  <WifiOff size={12} />
                  <span>{t("offline")}</span>
                </>
              )}
              {s.battery <= 20 ? (
                <BatteryLow size={16} className="wos-low" />
              ) : (
                <Battery size={16} />
              )}
              {s.battery}%
            </span>
          </div>
          <span className="sr-only">
            {attachmentNames[s.attachment]} · {wearLabels[s.wearStatus]}{" "}
            (inferred)
          </span>
          <div className="wos-body" key={screenKey}>
            {screen}
          </div>
          <div className="wos-footer">
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
        </div>
      </div>
      <div className="watch-strap bottom" />
    </div>
  );
}
