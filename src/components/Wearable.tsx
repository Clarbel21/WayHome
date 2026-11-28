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
  Mic,
  HandHelping,
  MapPin,
  SlidersHorizontal,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
} from "lucide-react";
import { activeLadderStep, useZone, legTarget } from "../zone/store";
import { planRoute } from "../zone/route";
import { useWatchUi } from "./watchUi";
import { MemoryGardenExperience } from "../memory/MemoryPlayer";
import {
  useStore,
  navigable,
  requestContact,
  nextContact,
} from "../store";
import { RingTone, CallRecording } from "./RingTone";
import { attachmentNames, wearLabels } from "../services/safety";
import {
  startRingtone,
  stopRingtone,
  useFind,
  type FindRing,
} from "../services/find";
import { PhotoQuiz } from "../game/PhotoQuiz";
import { landmarkQuizDeck } from "../game/landmarks";
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

/** Talk: no reply for this long → back to the home screen (saves battery). */
export const TALK_IDLE_MS = 7000;

// The wearer sees exactly one screen at a time, chosen from the safety mode.
// Every action calls the existing store; this component holds no safety logic.
export function Wearable({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const t = useT();
  const location = useLocation();
  const [talk, setTalk] = useState<TalkReply | null>(null);
  // Call → "Who to call?" faces (lane C1). Closes when the mode changes.
  const [pickCall, setPickCall] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [arrived, setArrived] = useState(false);
  // T1 Talk lane: Momo's chat. One exchange on screen (what the wearer said,
  // what Momo answered), voice in via SpeechRecognition with a typed
  // fallback, voice out via speechSynthesis (the Care tools voice toggle
  // mutes her). No network, no medical content — kind keyword replies.
  const [chat, setChat] = useState<{ you: string | null; momo: string | null }>(
    { you: null, momo: null },
  );
  const [listening, setListening] = useState(false);
  // Talk is like a call with Momo: it listens by itself. 7 s of silence
  // (nobody speaking, Momo not talking) returns home to save battery.
  const [talkActivity, setTalkActivity] = useState(0);
  const recRef = useRef<any>(null);
  const prevMode = useRef(s.mode);
  useEffect(() => {
    if (s.mode !== "NORMAL") {
      setTalk(null);
      setPickCall(false);
      setShowModePicker(false);
      setArrived(false);
      stopListening();
    } else {
      // A guided walk ends at position 6 with the last landmark confirmed.
      // Read the recorded stop as well as the mode transition so a presenter
      // moment that completes several stops in one click still lands here.
      const stops = s.landmarks.filter(navigable);
      const lastStop = stops[stops.length - 1]?.name;
      const finished =
        s.position === 6 &&
        (prevMode.current === "GUIDED_RETURN" ||
          (!!lastStop &&
            s.alerts.some(
              (a) =>
                a.title ===
                `Landmark reached: ${lastStop} — wearer confirmed recognition`,
            )));
      setArrived(finished);
    }
    prevMode.current = s.mode;
  }, [s.mode, s.position, s.alerts, s.landmarks]);
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
    // resumed later; only the watch view is closed here. Safety screens also
    // take over the Game lane before the wearer can answer a question.
    const ui = useWatchUi.getState();
    if (s.mode === "NORMAL") return;
    if (ui.memories) ui.closeMemories();
    if (ui.game) ui.closeGame();
  }, [s.mode]);
  // G2/G3 will register their builders before their deck can be opened.
  useEffect(() => {
    if (watchUi.game && watchUi.game !== "landmarks") watchUi.closeGame();
  }, [watchUi.game]);
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
  // Only let the safe zone own the watch when no other safety screen does.
  // The step number is the same one the caregiver ladder shows, so neither
  // device can sit on an older step after "+8 min".
  const zonePrompt = z.prompt && (s.mode === "NORMAL" || s.mode === "CHECK_IN");
  const zoneStep =
    s.mode !== "EMERGENCY_SIMULATED" &&
    s.mode !== "GUIDED_RETURN" &&
    // A walk in progress, or any check-in/handover safety screen, owns the
    // watch instead; the ladder resumes on the home screen.
    z.guideStartM === null &&
    s.mode === "NORMAL"
      ? activeLadderStep(z)
      : 0;
  const [now, setNow] = useState(new Date());
  const approved = s.landmarks.filter(navigable);
  const landmark = approved[s.guideIndex];
  const missedStop =
    s.mode === "REORIENTATION"
      ? approved.find((stop) => stop.id === s.missedLandmark?.id)
      : undefined;
  const name = s.settings.companionName;
  const watchMessage = s.mode === "EMERGENCY_SIMULATED"
    ? t("sosHelpComing")
    : missedStop
      ? t("familyIsHelping")
      : modeMessage(lang, s.mode, name);
  // The person being called: the face the wearer picked, else the caregiver.
  const caregiver = requestContact(s)?.name ?? s.settings.caregiver;
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
          : watchMessage,
      );
      speech.lang = lang === "id" ? "id-ID" : "en-US";
      window.speechSynthesis.speak(speech);
      return () => window.speechSynthesis.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.mode,
    s.settings.voice,
    watchMessage,
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

  // --- T1 Talk lane: Momo's chat (voice in/out, typed fallback). -------
  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const stopListening = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  };
  // Momo speaks, then listens again (hands-free, like a phone call).
  const speakOut = (text: string, then?: () => void) => {
    if (!s.settings.voice || !("speechSynthesis" in window)) {
      then?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "id" ? "id-ID" : "en-US";
    utterance.onend = () => {
      setTalkActivity(Date.now());
      then?.();
    };
    window.speechSynthesis.speak(utterance);
  };
  // Keyword replies reuse the established talk lines (rule 7 — the ESP32
  // carries the same words). Kind, first person, ≤ 8 words, no advice.
  const momoReply = (said: string): string => {
    const q = said.toLowerCase();
    const has = (...words: string[]) => words.some((w) => q.includes(w));
    if (has("where", "di mana", "dimana")) return t("talkWhereReply");
    if (has("who", "family", "keluarga", "siapa"))
      return t("talkWhoReply", { caregiver });
    if (has("comfort", "tenang", "takut", "ragu", "pelan"))
      return t("talkComfort");
    if (has("nice", "glad", "senang", "cerita"))
      return t("talkSomethingNiceReply");
    return t("talkIntro");
  };
  const handleWearerLine = (said: string) => {
    const line = said.trim().slice(0, 60);
    if (!line) return;
    const reply = momoReply(line);
    setChat({ you: line, momo: reply });
    setTalkActivity(Date.now());
    speakOut(reply, startListening);
  };
  function startListening() {
    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Ctor || listening) return;
    const rec = new Ctor();
    rec.lang = lang === "id" ? "id-ID" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) =>
      handleWearerLine(event.results?.[0]?.[0]?.transcript ?? "");
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }
  const closeTalk = () => {
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setChat({ you: null, momo: null });
    if (experienceMode === "dialogue") s.chooseAssistance("home");
    else setTalk(null);
  };  // Opening Talk is like answering a call: Momo greets, then listens.
  const talkOpen = s.mode === "NORMAL" && talk !== null;
  const talkFns = useRef({ startListening, closeTalk, speakOut });
  talkFns.current = { startListening, closeTalk, speakOut };
  useEffect(() => {
    if (!talkOpen) return;
    setTalkActivity(Date.now());
    talkFns.current.speakOut(t("talkIntro"), () =>
      talkFns.current.startListening(),
    );
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talkOpen]);
  useEffect(() => {
    if (!talkOpen || experienceMode === "dialogue") return;
    const speaking =
      "speechSynthesis" in window && window.speechSynthesis.speaking;
    const timer = window.setTimeout(
      () => {
        if ("speechSynthesis" in window && window.speechSynthesis.speaking)
          setTalkActivity(Date.now());
        else talkFns.current.closeTalk();
      },
      speaking ? 1000 : TALK_IDLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [talkOpen, talkActivity, experienceMode]);


  if (s.mode === "EMERGENCY_SIMULATED") {
    screen = (
      <div className="wos-sos">
        <div className="wos-sos-icon" aria-hidden="true">
          <ShieldAlert size={30} />
        </div>
        {speech(watchMessage)}
        <ResolveSOSButton short />
      </div>
    );
  } else if (!s.connected) {
    // An offline watch cannot receive anything. Show one calm line and only
    // the actions that still work on the band itself: Home, Call and SOS.
    screenKey = "offline";
    screen = (
      <div className="wos-center wos-offline">
        <div className="wos-offline-icon" aria-hidden="true">
          <WifiOff size={30} />
        </div>
        {speech(t("offlineWatchLine"))}
        <div className="wos-offline-actions">
          <button
            className="watch-action wos-primary"
            aria-label={t("goHome")}
            onClick={() => s.chooseAssistance("home")}
          >
            <House size={18} /> {t("goHome")}
          </button>
          <button
            className="watch-action"
            aria-label={t("callFamily")}
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={18} /> {t("callFamily")}
          </button>
        </div>
      </div>
    );
  } else if (
    s.wearStatus === "not_worn" &&
    !(
      s.mode === "CHECK_IN" &&
      (s.checkIn?.stage === "question" || s.checkIn?.stage === "help_options")
    )
  ) {
    screenKey = "watch-taken-off";
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(t("putWatchOn"))}
      </div>
    );
  } else if (zoneStep) {
    // Every ladder step owns the watch until the wearer answers it. The
    // chip and the phone ladder carry the same step number; the words stay
    // short enough for the watch (one idea, up to three buttons).
    screenKey = `zone-step-${zoneStep}-${z.promptAt}`;
    const askingFamily = zoneStep >= 3;
    const stepTitle =
      zoneStep === 1
        ? t("zoneTitle")
        : zoneStep === 2
          ? t("zoneStillOut")
          : zoneStep === 3
            ? t("zoneCallFamily")
            : t("zoneCaregiverAlerted");
    const acceptGuide = () => {
      z.acceptGuide();
      s.chooseAssistance("home");
    };
    screen = (
      <div
        className={`wos-center wos-zone ${askingFamily ? "wos-zone-call" : ""}`}
        data-step={zoneStep}
      >
        <div className="wos-zone-icon" aria-hidden="true">
          {askingFamily ? <Phone size={28} /> : <MapPin size={28} />}
        </div>
        <span className="wos-zone-step">
          {t("zoneStepOf", { n: zoneStep })}
        </span>
        <strong className="wos-zone-title">{stepTitle}</strong>
        {askingFamily && (
          <span className="wos-zone-status">{t("zoneCaregiverAlerted")}</span>
        )}
        <span className="sr-only">
          {t("zoneDistance", { km: (z.distanceM / 1000).toFixed(2) })}
        </span>
        {askingFamily && (
          <button
            className="watch-action wos-primary"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={18} /> {t("callFamily")}
          </button>
        )}
        <button
          className={`watch-action ${askingFamily ? "wos-secondary" : "wos-primary"}`}
          onClick={acceptGuide}
        >
          <House size={18} /> {t("zoneYes")}
        </button>
        <button className="wos-ghost" onClick={z.decline}>
          {t("zoneNo")}
        </button>
        {zonePrompt && <span className="wos-zone-timer" aria-hidden="true" />}
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
    const missed = missedStop;
    screenKey = missed ? `missed-${missed.id}` : screenKey;
    screen = missed ? (
      <div className="wos-center wos-calm-screen">
        {speech(watchMessage)}
        <button
          className="watch-action wos-primary see-it-now"
          onClick={s.seeItNow}
        >
          <Check size={18} /> {t("seeItNow")}
        </button>
        <button
          className="wos-secondary cancel-guidance"
          onClick={s.backToHome}
        >
          {t("endMissedGuidance")}
        </button>
      </div>
    ) : (
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
        <button
          className="wos-secondary cancel-guidance"
          onClick={s.backToHome}
        >
          {t("cancelGuidance")}
        </button>
      </div>
    );
  } else if (s.mode === "CAREGIVER_HANDOVER") {
    const status = s.familyRequest?.status;
    if (status === "responded") {
      // Happy ending: one big line, no progress list to read after the call.
      screenKey = "family-replied";
      screen = (
        <div className="wos-center wos-arrived">
          <div className="wos-arrived-badge" aria-hidden="true">
            <Check size={30} />
          </div>
          <strong className="wos-arrived-title">
            {t("caregiverResponded", { caregiver })}
          </strong>
          <CallRecording contactId={s.familyRequest?.contactId} />
          <Sprout small />
          <button
            className="watch-action wos-primary"
            onClick={() => s.answerCheckIn("okay")}
          >
            {t("continueAfter")}
          </button>
        </div>
      );
    } else if (s.familyRequest?.missedAt) {
      // Call lane C2: nobody answered. One line, one next person, Back.
      const next = nextContact(s);
      screenKey = "call-missed";
      screen = (
        <div className="wos-center wos-call-missed">
          <div className="avatar none" aria-hidden="true">
            {caregiver.slice(0, 1)}
          </div>
          <strong className="wos-call-title">{t("noAnswer")}</strong>
          {next && (
            <button
              className="watch-action wos-primary"
              onClick={() => s.callContact(next.id)}
            >
              <Phone size={18} aria-hidden="true" />{" "}
              {t("tryName", { name: next.name })}
            </button>
          )}
          <button className="wos-back" onClick={s.backToHome}>
            <ChevronLeft size={18} aria-hidden="true" /> {t("backHome")}
          </button>
        </div>
      );
    } else if (s.familyRequest) {
      // Call lane C2: ringing. Face, name, "Ringing…" — the ring tone plays.
      screenKey = `call-ringing-${s.familyRequest.id}`;
      screen = (
        <div className="watch-landmark wos-center wos-handover wos-ringing">
          <RingTone />
          <div className={`avatar ${status ?? "none"} wos-ring-pulse`}>
            {caregiver.slice(0, 1)}
          </div>
          <strong>{caregiver}</strong>
          <p>{t("ringing")}</p>
          <small>{t("notifSent")}</small>
          <button className="wos-back" onClick={s.backToHome}>
            <ChevronLeft size={18} aria-hidden="true" /> {t("backHome")}
          </button>
        </div>
      );
    } else {
      screen = (
        <div className="watch-landmark wos-center wos-handover">
          <div className="avatar none">{caregiver.slice(0, 1)}</div>
          <strong>{caregiver}</strong>
          <button
            className="watch-action wos-primary"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={17} /> {t("helpFamily")}
          </button>
          <p>{t("needsReview")}</p>
          <small>{t("notifNone")}</small>
          {note}
          <button className="wos-back" onClick={s.backToHome}>
            <ChevronLeft size={18} aria-hidden="true" /> {t("backHome")}
          </button>
        </div>
      );
    }
  } else if (s.mode === "CHECK_IN" && s.checkIn?.stage === "help_options") {
    screenKey = "help-options";
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(t("howHelp"))}
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
    // The walk's "simulated directions" note belongs to the walk, not to
    // this question: drop it so one question + two answers always fit.
    const walkNote = s.interactionNote.startsWith(
      "These are simulated directions",
    );
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(modeMessage(lang, s.mode, name))}
        {!walkNote && note}
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
  } else if (watchUi.game && s.mode === "NORMAL") {
    // The Game lane is a data-driven quiz. G2 (faces) and G3 (happy places)
    // only need another deck builder here; PhotoQuiz handles the screens.
    const deck = watchUi.game === "landmarks" ? landmarkQuizDeck(t) : null;
    screenKey = `game-${watchUi.game}`;
    screen = deck ? (
      <div className="wos-game-host">
        <PhotoQuiz
          key={watchUi.game}
          deck={deck}
          onExit={() => {
            watchUi.closeGame();
            s.dismissAcknowledgment();
          }}
        />
      </div>
    ) : null;
  } else if (acknowledged) {
    screenKey = "acknowledged";
    screen = (
      <div className="wos-center">
        <Sprout small />
        {speech(t("hiName", { name: wearerFirst, companion: name }))}
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
  } else if (pickCall && s.mode === "NORMAL") {
    screenKey = "call-pick";
    screen = (
      <div className="wos-call-pick">
        <strong className="wos-call-title">{t("whoToCall")}</strong>
        <div
          className="wos-call-faces"
          role="group"
          aria-label={t("whoToCall")}
        >
          {s.familyContacts.slice(0, 3).map((c) => (
            <button
              key={c.id}
              className="wos-call-face"
              aria-label={`${t("callFamily")}: ${c.name}`}
              onClick={() => {
                setPickCall(false);
                s.callContact(c.id);
              }}
            >
              <span
                className="wos-call-avatar"
                style={{ background: c.color }}
                aria-hidden="true"
              >
                {c.name.slice(0, 1)}
              </span>
              <span className="wos-call-name">{c.name}</span>
              <Phone size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button className="wos-back" onClick={() => setPickCall(false)}>
          <ChevronLeft size={16} /> {t("backHome")}
        </button>
      </div>
    );
  } else if (experienceMode === "dialogue" || talk) {
    // T1: Momo's character + chat. Her face is the biggest thing, her line
    // is the one line on screen; the wearer just talks (no typing).
    screenKey = "talk-chat";
    const reply = chat.momo ?? t("talkIntro");
    screen = (
      <div className="wos-talk">
        {experienceMode === "dialogue" && (
          <span className="wos-profile-label">DIALOGUE MODE</span>
        )}
        <div className="wos-momo" aria-hidden="true">
          <Sprout small />
        </div>
        <p className="wos-bubble" aria-live="polite">
          {reply}
        </p>
        {chat.you && <p className="wos-you-said">“{chat.you}”</p>}
        <div className="wos-chat-actions">
          {/* No buttons to talk: Momo listens by herself (like a call). */}
          <p
            className={`wos-listening ${listening ? "on" : ""}`}
            role="status"
          >
            <Mic size={18} aria-hidden="true" />
            {lang === "id" ? "Mendengarkan…" : "Listening…"}
          </p>
          <button className="wos-back" onClick={closeTalk}>
            <ChevronLeft size={16} aria-hidden="true" />
            {experienceMode === "dialogue" ? t("focusHome") : t("backHome")}
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
            onClick={() => setPickCall(true)}
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
            aria-label={t("game")}
            onClick={() => watchUi.openGame("landmarks")}
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
      className={`watch-area mode-${s.mode.toLowerCase()} experience-${experienceMode} ${s.attachment} ${compact ? "compact" : ""} ${buzzing ? "buzz" : ""} ${ringing ? "find-ring" : ""} ${zoneStep ? "zone-alert" : ""}`}
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
              !watchUi.game &&
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
