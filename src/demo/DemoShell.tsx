import { useEffect, useRef, useState, useId, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Check,
  Monitor,
  Watch,
  Smartphone,
} from "lucide-react";
import { WayHomeMark } from "../components/WayHomeMark";
import { Wearable } from "../components/Wearable";
import {
  CaregiverPhone,
  CaregiverModeDock,
} from "../components/CaregiverPhone";
import { DemoStage, LangSwitch } from "../components/DemoStage";
import { DeviceConnect } from "../components/DeviceConnect";
import { useMemory } from "../memory/store";
import { useZone } from "../zone/store";
import { useStore, navigable } from "../store";
import { useWatchUi } from "../components/watchUi";
import { useT } from "../i18n";
import { bleDevice } from "../services/ble";
import {
  useDemoUi,
  useDemoHandoff,
  type DemoStory,
  type DemoDevice,
} from "./demoUi";
import { demoInstruction, hasUnfinishedDemo } from "./story";
import { buildLabel } from "../components/UpdateNotice";
import "./shell.css";

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 879px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 879px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}
export function DemoShell() {
  const s = useStore(),
    ui = useDemoUi(),
    t = useT(),
    narrow = useNarrow();
  const location = useLocation();
  const navigate = useNavigate();
  const zone = useZone();
  const homePage = useWatchUi((state) => state.homePage);
  const memories = useWatchUi((state) => state.memories);
  const handoff = useDemoHandoff();
  const instruction = demoInstruction(s, ui.story, homePage, zone, memories);
  const first = s.settings.wearer.split(" ")[0],
    caregiver = s.settings.caregiver.split(" ")[0];
  const [resumed] = useState(() =>
    hasUnfinishedDemo(useStore.getState(), useWatchUi.getState().memories),
  );
  const [paired, setPaired] = useState(bleDevice.connected);
  const [pendingStory, setPendingStory] = useState<DemoStory | null>(null);
  // Classic presentation switcher (TEAM_PLAN phase 0): side-by-side is the
  // desktop default; the explicit tabs stay for narrow screens.
  const [view, setView] = useState<"together" | "watch" | "caregiver">(
    "together",
  );
  const resetDialog = useRef<HTMLDialogElement>(null),
    more = useRef<HTMLDetailsElement>(null);
  const resetTitle = useId();
  const resetTrigger = useRef<HTMLElement | null>(null);
  const watchTab = useRef<HTMLButtonElement>(null),
    phoneTab = useRef<HTMLButtonElement>(null);
  const incidentOpen =
    s.mode === "EMERGENCY_SIMULATED" ||
    !!(s.incident && s.incident.stage !== "resolved");
  const pendingFamily =
    s.familyRequest && s.familyRequest.status !== "responded";
  useEffect(
    () =>
      bleDevice.subscribe((event) => {
        if (event.type === "connection") setPaired(event.connected);
      }),
    [],
  );
  useEffect(() => {
    document.title = "WayHome — Try the demo";
    const story = new URLSearchParams(location.search).get("story");
    if (
      story === "walk" ||
      story === "checkin" ||
      story === "family" ||
      story === "explore"
    )
      useDemoUi.getState().chooseStory(story);
  }, [location.search]);
  function chooseDevice(device: DemoDevice, focus = false) {
    ui.chooseDevice(device);
    handoff.suggest(device);
    if (focus)
      requestAnimationFrame(() =>
        document
          .getElementById(
            device === "watch" ? "wearer-view-title" : "caregiver-view-title",
          )
          ?.focus({ preventScroll: true }),
      );
  }
  function chooseStory(
    story: DemoStory,
    event?: { currentTarget: HTMLElement },
  ) {
    if (story === "explore") {
      ui.chooseStory(story);
      return;
    }
    if (incidentOpen) return;
    if (
      hasUnfinishedDemo(useStore.getState(), useWatchUi.getState().memories)
    ) {
      resetTrigger.current = event?.currentTarget ?? null;
      setPendingStory(story);
      resetDialog.current?.showModal();
    } else {
      ui.chooseStory(story);
      chooseDevice(story === "checkin" ? "caregiver" : "watch");
    }
  }
  function closeReset() {
    resetDialog.current?.close();
    setPendingStory(null);
    resetTrigger.current?.focus();
  }
  function startNew() {
    const current = useStore.getState();
    if (
      current.mode === "EMERGENCY_SIMULATED" ||
      (current.incident && current.incident.stage !== "resolved") ||
      !pendingStory
    )
      return;
    // Pause an unfinished activity before closing its view; keep its saved progress.
    if (useWatchUi.getState().memories) {
      const memory = useMemory.getState();
      if (memory.session && !memory.session.completed) memory.exit();
    }
    // Existing guarded reset preserves profiles, landmarks, memory content and garden.
    useStore.getState().reset();
    ui.chooseStory(pendingStory);
    chooseDevice(pendingStory === "checkin" ? "caregiver" : "watch");
    closeReset();
    if (more.current) more.current.open = false;
  }
  function tabsKey(
    event: KeyboardEvent<HTMLButtonElement>,
    device: DemoDevice,
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "watch"
        : event.key === "End"
          ? "caregiver"
          : device === "watch"
            ? "caregiver"
            : "watch";
    chooseDevice(next);
    (next === "watch" ? watchTab : phoneTab).current?.focus();
  }
  const target =
    handoff.suggested && handoff.suggested !== ui.device
      ? handoff.suggested
      : instruction.device;
  const stories = ["walk", "checkin", "family"] as const;
  const titles = {
    walk: "demoWalkTitle",
    checkin: "demoCheckinTitle",
    family: "demoFamilyTitle",
    explore: "demoExploreTitle",
  };
  return (
    <div
      className={`demo-redesign demo-shell ${s.settings.largeText ? "large-text" : ""} ${s.settings.reducedMotion ? "reduce-motion" : ""}`}
    >
      <a
        className="demo-skip"
        href="#demo-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("demo-main")?.focus();
        }}
      >
        {t("demoSkip")}
      </a>
      <header className="demo-shell-header">
        <Link to="/" className="demo-shell-brand">
          <WayHomeMark />
          <span>WayHome</span>
        </Link>
        <span className="demo-shell-label">{t("demoLabel")}</span>
        <div className="demo-shell-header-actions">
          <LangSwitch />
          {paired && (
            <button
              className="demo-paired"
              onClick={() => {
                if (more.current) more.current.open = true;
              }}
            >
              {t("watchPaired")}
            </button>
          )}
          <details
            ref={more}
            className="demo-more"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary>
              {t("demoMore")}
              {paired && (
                <span className="demo-task-dot" aria-label={t("watchPaired")} />
              )}
              <ChevronDown size={16} />
            </summary>
            <div className="demo-more-content">
              <h2>{t("demoOptions")}</h2>
              <button
                className="wh-button"
                data-variant="secondary"
                disabled={incidentOpen}
                onClick={(event) =>
                  chooseStory(ui.story === "explore" ? "walk" : ui.story, event)
                }
              >
                {t("demoNew")}
              </button>
              {incidentOpen && <p>{t("demoResolveFirst")}</p>}
              <CaregiverModeDock />
              <DeviceConnect />
              <button
                className="wh-button"
                data-variant="secondary"
                onClick={() => {
                  ui.chooseStory("explore");
                  if (s.mode !== "NORMAL")
                    navigate("/memories", {
                      state: { from: location.pathname },
                    });
                  else {
                    useWatchUi.getState().openMemories();
                    chooseDevice("watch");
                  }
                  if (more.current) more.current.open = false;
                }}
              >
                {t("exploreMemories")}
              </button>
              <Link to="/caregiver">
                {t("caregiverMode")} <ArrowRight size={16} />
              </Link>
              <Link to="/demo">
                {t("demoControls")} <ArrowRight size={16} />
              </Link>
              <p>{t("demoAbout")}</p>
            </div>
          </details>
          <Link to="/" onClick={s.closeDemo}>
            {t("demoExit")}
          </Link>
        </div>
      </header>
      <main id="demo-main" tabIndex={-1}>
        <nav className="demo-stories" aria-label={t("demoStories")}>
          {stories.map((story) => (
            <button
              key={story}
              type="button"
              aria-pressed={ui.story === story}
              disabled={incidentOpen}
              onClick={(event) => chooseStory(story, event)}
            >
              {t(
                story === "walk"
                  ? "demoWalk"
                  : story === "checkin"
                    ? "demoCheckin"
                    : "demoFamily",
              )}
            </button>
          ))}
        </nav>
        <section
          className={`demo-instruction ${incidentOpen ? "is-urgent" : ""}`}
          aria-labelledby="demo-story-title"
        >
          <div>
            <span className="demo-resume">
              {resumed && hasUnfinishedDemo(s, memories)
                ? t("demoResume")
                : t("demoInteractive")}
            </span>
            <h1 id="demo-story-title">
              {incidentOpen
                ? t("demoSosTitle")
                : t(titles[ui.story], { name: first })}
            </h1>
          </div>
          <p role="status">
            {t(instruction.key, {
              name: first,
              caregiver,
              n: s.guideIndex + 1,
              total: s.landmarks.filter(navigable).length,
            })}
          </p>
          {s.mode === "GUIDED_RETURN" && s.landmarks.some(navigable) && (
            <span className="demo-step">
              {t("stopOf", {
                n: s.guideIndex + 1,
                total: s.landmarks.filter(navigable).length,
              })}
            </span>
          )}
          {instruction.complete && (
            <div className="demo-completion">
              <Check size={20} aria-hidden="true" />
              <button onClick={(event) => chooseStory("checkin", event)}>
                {t("demoTryCheckin")}
              </button>
              <button onClick={() => ui.chooseStory("explore")}>
                {t("demoFreeExplore")}
              </button>
            </div>
          )}
        </section>
        <div className="demo-mobile-navigation">
          <div
            className="demo-device-tabs"
            role="tablist"
            aria-label={t("demoDeviceView")}
          >
            <button
              ref={watchTab}
              id="watch-tab"
              role="tab"
              aria-selected={ui.device === "watch"}
              aria-controls="watch-panel"
              tabIndex={ui.device === "watch" ? 0 : -1}
              onKeyDown={(e) => tabsKey(e, "watch")}
              onClick={() => chooseDevice("watch")}
            >
              <Watch size={18} />
              {t("viewWatch")}
              {instruction.device === "watch" && s.mode !== "NORMAL" && (
                <span
                  className="demo-task-dot"
                  aria-label={t("demoTaskWaiting")}
                />
              )}
            </button>
            <button
              ref={phoneTab}
              id="caregiver-tab"
              role="tab"
              aria-selected={ui.device === "caregiver"}
              aria-controls="caregiver-panel"
              tabIndex={ui.device === "caregiver" ? 0 : -1}
              onKeyDown={(e) => tabsKey(e, "caregiver")}
              onClick={() => chooseDevice("caregiver")}
            >
              <Smartphone size={18} />
              {t("viewCaregiver")}
              {(incidentOpen || pendingFamily) && (
                <span
                  className={`demo-task-dot ${incidentOpen ? "urgent" : ""}`}
                  aria-label={t("demoTaskWaiting")}
                />
              )}
            </button>
          </div>
          {target !== ui.device && (
            <button
              className="demo-handoff"
              onClick={() => chooseDevice(target, true)}
            >
              {t(target === "watch" ? "demoAnswerWatch" : "demoSeeCaregiver", {
                caregiver,
              })}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
        <nav
          className="demo-view-switcher"
          aria-label={t("demoDeviceView")}
        >
          {(["together", "watch", "caregiver"] as const).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              onClick={() => setView(name)}
            >
              {name === "together" ? (
                <Monitor size={16} aria-hidden="true" />
              ) : name === "watch" ? (
                <Watch size={16} aria-hidden="true" />
              ) : (
                <Smartphone size={16} aria-hidden="true" />
              )}
              {t(
                name === "together"
                  ? "viewTogether"
                  : name === "watch"
                    ? "viewWatch"
                    : "viewCaregiver",
              )}
            </button>
          ))}
        </nav>
        <div
          className={`shared-devices demo-devices view-${view}`}
        >
          <section
            id="caregiver-panel"
            className="caregiver-interface demo-device-panel"
            role={narrow ? "tabpanel" : "region"}
            aria-labelledby="caregiver-view-title"
            hidden={
              (narrow && ui.device !== "caregiver") ||
              (!narrow && view === "watch")
            }
          >
            <h2 id="caregiver-view-title" tabIndex={-1}>
              {t("demoCaregiverLabel", { name: caregiver })}
            </h2>
            <div className="device-presentation phone-presentation">
              <CaregiverPhone />
            </div>
          </section>
          <section
            id="watch-panel"
            className="wearer-interface demo-device-panel"
            role={narrow ? "tabpanel" : "region"}
            aria-labelledby="wearer-view-title"
            hidden={
              (narrow && ui.device !== "watch") ||
              (!narrow && view === "caregiver")
            }
          >
            <h2 id="wearer-view-title" tabIndex={-1}>
              {t("demoWatchLabel", { name: first })}
            </h2>
            <div className="device-presentation watch-presentation">
              <Wearable />
            </div>
            <p className="demo-device-note">{t("demoSosHint")}</p>
          </section>
        </div>
        <section className="demo-stage-dock" aria-label={t("demoMoreScenarios")}>
          <DemoStage />
        </section>
        <footer className="demo-shell-footer">
          <span>{t("demoSimulation")}</span>
          <small>{buildLabel}</small>
        </footer>
      </main>
      <dialog
        ref={resetDialog}
        className="wh-dialog demo-reset-dialog"
        aria-labelledby={resetTitle}
        onClose={() => {
          setPendingStory(null);
          resetTrigger.current?.focus();
        }}
      >
        <h2 id={resetTitle}>{t("demoNewQuestion")}</h2>
        <p>{t("demoResetExplanation")}</p>
        {incidentOpen && <p role="alert">{t("demoResolveFirst")}</p>}
        <div className="demo-dialog-actions">
          <button
            className="wh-button"
            data-variant="secondary"
            autoFocus
            onClick={closeReset}
          >
            {t("demoKeepCurrent")}
          </button>
          <button
            className="wh-button"
            disabled={incidentOpen}
            onClick={startNew}
          >
            {t("demoStartNew")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
