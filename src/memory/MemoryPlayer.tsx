import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import { useStore } from "../store";
import { Sprout } from "../components/Sprout";
import { Wearable, Photo } from "../components/Wearable";
import { SOSButton } from "../components/SOSButton";
import {
  activityNames,
  kinds,
  safetyReady,
  useMemory,
  type MemoryEntry,
} from "./store";
import { useMediaURL } from "./media";
import { suggestActivity } from "./suggestions";
import { GardenVisualization } from "./GardenVisualization";
export function MemoryImage({
  entry,
  hidden = false,
}: {
  entry: MemoryEntry;
  hidden?: boolean;
}) {
  const media = useMediaURL(entry.imageId);
  return media.error ? (
    <p className="memory-notice">{media.error}</p>
  ) : media.url || entry.image ? (
    <div className="memory-photo">
      <Photo
        src={media.url || entry.image!}
        alt={
          hidden
            ? "A familiar person to explore together"
            : entry.kind === "places"
              ? "A meaningful place to explore together"
              : entry.title
        }
      />
      {entry.sample && <small>Fictional sample illustration</small>}
    </div>
  ) : (
    <p className="memory-notice">
      A picture can be added by your caregiver. We can still share a memory
      together.
    </p>
  );
}
function MusicPlayer({ entry }: { entry: MemoryEntry }) {
  const media = useMediaURL(entry.audioId);
  const sound = useMemory((s) => s.preferences.sound);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = audio.current;
    return () => element?.pause();
  }, [media.url]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sound) {
      audio.current?.pause();
      setPlaying(false);
    }
  }, [sound]);
  return (
    <div className="memory-music">
      <span className="music-disc">♫</span>
      <h3>{entry.title}</h3>
      <p>{entry.artist || "A personal music memory"}</p>
      {entry.audioId ? (
        <>
          {media.error && <p role="status">{media.error}</p>}
          {media.url && (
            <>
              <audio
                ref={audio}
                src={media.url}
                onEnded={() => setPlaying(false)}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
                onError={() => {
                  setPlaying(false);
                  setError(
                    "This recording could not play. You can still share how a familiar tune feels.",
                  );
                }}
              />
              <button
                className="memory-choice"
                disabled={!sound}
                onClick={async () => {
                  setError("");
                  if (playing) {
                    audio.current?.pause();
                    return;
                  }
                  try {
                    await audio.current?.play();
                  } catch {
                    setError(
                      "Playback could not start. Try another recording or enjoy a quiet memory.",
                    );
                  }
                }}
              >
                {playing ? <Pause /> : <Play />}
                {playing ? "Pause recording" : "Play recording"}
              </button>
              {error && <p role="status">{error}</p>}
            </>
          )}
        </>
      ) : (
        <p className="memory-notice">
          No audio is attached. Nothing is playing. Think of a familiar tune or
          hum together.
        </p>
      )}
      {!sound && entry.audioId && (
        <p>Sound is off in Memory Library preferences. No audio will play.</p>
      )}
    </div>
  );
}
export function MemoryActivityPlayer() {
  const m = useMemory();
  const name = useStore((s) => s.settings.companionName);
  const [moreFeelings, setMoreFeelings] = useState(false);
  const session = m.session!;
  const entry = m.entries.find((e) => e.id === session.entryId && e.approved);
  const kind = session.kind;
  useEffect(() => setMoreFeelings(false), [session.id]);
  if (kind !== "garden" && !entry)
    return (
      <div className="memory-question">
        <h2>This memory is taking a little rest.</h2>
        <p>
          Your caregiver may have changed its approval. Let's choose something
          else.
        </p>
        <button className="memory-choice" onClick={m.home}>
          Choose another activity
        </button>
      </div>
    );
  const done = session.completed;
  return (
    <>
      <div className="memory-activity-title">
        <span className="eyebrow">{activityNames[kind]}</span>
        {entry?.sample && <span className="subtle-tag">FICTIONAL SAMPLE</span>}
      </div>
      {kind === "faces" && entry && (
        <>
          <MemoryImage entry={entry} hidden={!session.revealed} />
          <h2>Does this person look familiar?</h2>
          {!session.revealed ? (
            <div className="memory-choices">
              <button
                className="memory-choice"
                onClick={() => m.respond("Yes")}
              >
                Yes
              </button>
              <button
                className="memory-choice"
                onClick={() => m.respond("Not sure")}
              >
                Not sure
              </button>
              <button
                className="memory-choice"
                onClick={() => m.respond("Tell me more")}
              >
                Tell me more
              </button>
            </div>
          ) : (
            <div className="memory-reveal" role="status">
              <p>
                {entry.relationship
                  ? `This is your ${entry.relationship}, ${entry.title}.`
                  : `This is ${entry.title}.`}{" "}
                {entry.description}
              </p>
              <small>Thank you for sharing a moment with {name}.</small>
            </div>
          )}
        </>
      )}
      {kind === "places" && entry && (
        <>
          <MemoryImage entry={entry} />
          <h2>Does this place bring back any memories?</h2>
          {!session.revealed ? (
            <div className="memory-choices">
              <button
                className="memory-choice"
                onClick={() => m.respond("Yes")}
              >
                Yes
              </button>
              <button
                className="memory-choice"
                onClick={() => m.respond("Not sure")}
              >
                Not sure
              </button>
              <button
                className="memory-choice"
                onClick={() => m.respond("Tell me about it")}
              >
                Tell me about it
              </button>
            </div>
          ) : (
            <div className="memory-reveal" role="status">
              <h3>{entry.title}</h3>
              <p>
                {entry.description ||
                  "A familiar place can hold a little happiness. There is no need to remember every detail."}
              </p>
              <small>A shared memory, separate from navigation.</small>
            </div>
          )}
        </>
      )}
      {kind === "music" && entry && (
        <>
          <MusicPlayer entry={entry} />
          <h2>How does this song make you feel?</h2>
          {!done ? (
            <div className="memory-choices">
              {(moreFeelings
                ? ["Nostalgic", "Not sure"]
                : ["Happy", "Calm"]
              ).map((feeling) => (
                <button
                  className="memory-choice"
                  key={feeling}
                  onClick={() => m.respond(feeling)}
                >
                  {feeling}
                </button>
              ))}
              <button
                className="memory-choice quiet"
                onClick={() => setMoreFeelings(!moreFeelings)}
              >
                {moreFeelings ? "Other feelings" : "More feelings"}
              </button>
            </div>
          ) : (
            <div className="memory-reveal" role="status">
              <p>Thank you for sharing. Every feeling is welcome.</p>
              {entry.description && <p>{entry.description}</p>}
            </div>
          )}
        </>
      )}
      {kind === "routine" && entry && (
        <>
          <h2>{entry.title}</h2>
          <p>Choose what comes next, in an order that feels right to you.</p>
          <ol className="routine-order">
            {session.order.map((i) => (
              <li key={i}>{entry.steps[i]}</li>
            ))}
          </ol>
          {!done && (
            <>
              <div className="memory-choices">
                {entry.steps
                  .map((step, i) => ({ step, i }))
                  .reverse()
                  .filter(({ i }) => !session.order.includes(i))
                  .map(({ step, i }) => (
                    <button
                      className="memory-choice"
                      key={i}
                      onClick={() => m.selectStep(i)}
                    >
                      {step}
                    </button>
                  ))}
              </div>
              {session.order.length > 0 && (
                <button className="text-button" onClick={m.undoStep}>
                  Change my last choice
                </button>
              )}
              {session.order.length === entry.steps.length && (
                <button className="memory-choice" onClick={() => m.complete()}>
                  This feels familiar
                </button>
              )}
            </>
          )}
          {done && (
            <div className="memory-reveal" role="status">
              <p>That’s your familiar rhythm. Thank you for sharing.</p>
              {entry.description && <p>{entry.description}</p>}
            </div>
          )}
        </>
      )}
      {kind === "garden" && (
        <>
          <GardenVisualization />
          <h2>A little joy, growing gently.</h2>
          <p>
            Your garden is always here. Nothing is lost when you take a break.
          </p>
          {!done && (
            <div className="memory-choices">
              <button
                className="memory-choice"
                onClick={() => m.complete("flower")}
              >
                Plant a flower
              </button>
              <button
                className="memory-choice"
                onClick={() => m.complete("tree")}
              >
                Plant a little tree
              </button>
              <button
                className="memory-choice"
                onClick={() => m.complete("butterfly")}
              >
                Welcome a butterfly
              </button>
            </div>
          )}
        </>
      )}
      {done && (
        <div className="memory-finish">
          {kind !== "garden" && <GardenVisualization />}
          <p>
            <Leaf size={20} />A keepsake has grown in your garden.
          </p>
          <button className="memory-choice" onClick={m.home}>
            Back to my memories <ArrowRight size={18} />
          </button>
        </div>
      )}
      {!done && (
        <button className="text-button memory-skip" onClick={m.skip}>
          Skip this activity — that's okay
        </button>
      )}
    </>
  );
}
export function MemoryGardenExperience({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const m = useMemory();
  const s = useStore();
  const [categoryPage, setCategoryPage] = useState(0);
  const [empty, setEmpty] = useState("");
  const safe = safetyReady();
  const screen = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (embedded) return;
    window.scrollTo(0, 0);
    const heading = screen.current?.querySelector<HTMLElement>("h1,h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [embedded, safe, m.stage, m.session?.id]);
  const options = m.preferences.preferred.length
    ? m.preferences.preferred
    : kinds;
  const suggestion = suggestActivity(m.entries, m.preferences, m.history);
  const visible = options.slice(categoryPage * 3, categoryPage * 3 + 3);
  useEffect(() => {
    if (categoryPage * 3 >= options.length) setCategoryPage(0);
  }, [options.length, categoryPage]);
  if (!safe)
    return (
      <section ref={screen} className="memory-safety" aria-live="assertive">
        <h1>Memory Garden is paused</h1>
        <h2>Memories can wait. We're here with you.</h2>
        <p>
          {m.session
            ? "Your saved activity and garden are preserved."
            : "No activity has started yet. Your garden is unchanged."}
        </p>
        <div className="memory-pause-reasons" role="status">
          <h3>Why it hasn't opened yet</h3>
          <ul>
            {(s.mode === "EMERGENCY_SIMULATED" ||
              (s.incident && s.incident.stage !== "resolved")) && (
              <li>
                A simulated help request still needs caregiver resolution and
                verification.
              </li>
            )}
            {!s.connected && <li>The simulated device is disconnected.</li>}
            {s.wearStatus !== "likely_worn" && (
              <li>
                The attachment readings need a caregiver check. Wear status is{" "}
                {s.wearStatus.replaceAll("_", " ")}.
              </li>
            )}
            {s.signals.gpsConfidence < 0.6 && (
              <li>The simulated location is uncertain.</li>
            )}
            {s.mode === "GUIDED_RETURN" && <li>Guided return is active.</li>}
            {s.mode === "REORIENTATION" && (
              <li>A route or reorientation check is active.</li>
            )}
            {s.mode === "CAREGIVER_HANDOVER" && (
              <li>A caregiver assistance request is active.</li>
            )}
            {s.mode === "CHECK_IN" && (
              <li>A check-in or device review is still needed.</li>
            )}
          </ul>
          <p>
            Open caregiver review to check the demo readings, then return here.
            Activities will not clear a safety alert automatically.
          </p>
          <Link className="button" to="/caregiver/emergency">
            Open caregiver review (demo)
          </Link>
        </div>
        <Wearable compact={embedded} />
        {!embedded && (
          <Link className="button light" to="/companion">
            Back to Companion Mode
          </Link>
        )}
      </section>
    );
  return (
    <section
      ref={screen}
      className={`memory-experience ${embedded ? "embedded" : ""}`}
    >
      <div className="memory-topline">
        <button
          className="text-button"
          onClick={() => {
            m.home();
            setEmpty("");
          }}
        >
          <ArrowLeft size={18} />
          Back to memories
        </button>
        {!embedded ? (
          <Link className="text-button" to="/companion" onClick={m.exit}>
            Exit memories
          </Link>
        ) : (
          <button className="text-button" onClick={m.exit}>
            Exit activity
          </button>
        )}
      </div>
      <div className="memory-host">
        <Sprout small />
        <span>Here with {s.settings.companionName}</span>
      </div>
      {m.stage === "invite" ? (
        <div className="memory-question">
          <span className="eyebrow">A LITTLE TIME TOGETHER</span>
          <h1>Welcome to your Memory Garden.</h1>
          <p>
            Hi, I'm {s.settings.companionName}. Would you like to explore a
            memory?
          </p>
          <h2>Would you like to look at some happy memories together?</h2>
          <div className="memory-choices">
            <button className="memory-choice" onClick={m.begin}>
              Let's begin
            </button>
            <Link
              className="memory-choice quiet"
              to="/companion"
              onClick={m.exit}
            >
              Maybe later
            </Link>
          </div>
        </div>
      ) : m.stage === "activity" && m.session ? (
        m.session.paused ? (
          <div className="memory-question">
            <h2>Your memory is here, just as you left it.</h2>
            <p>Would you like to continue?</p>
            <div className="memory-choices">
              <button className="memory-choice" onClick={m.resume}>
                Resume activity
              </button>
              <button className="memory-choice quiet" onClick={m.home}>
                Choose something else
              </button>
            </div>
          </div>
        ) : (
          <MemoryActivityPlayer />
        )
      ) : (
        <div className="memory-question">
          <GardenVisualization />
          <h1>A memory, a feeling, a little joy.</h1>
          <p>What would you like to explore with {s.settings.companionName}?</p>
          {suggestion && (
            <div className="memory-suggestion">
              <span className="eyebrow">AN OPTIONAL IDEA</span>
              <p>{suggestion.reason}</p>
              <strong>Optional idea: {activityNames[suggestion.kind]}</strong>
              <small>
                Choose an activity below. Nothing starts automatically.
              </small>
            </div>
          )}
          <div className="memory-choices">
            {visible.map((kind) => (
              <button
                className="memory-choice"
                key={kind}
                onClick={() => {
                  setEmpty("");
                  if (
                    !m.start(
                      kind,
                      kind === suggestion?.kind
                        ? suggestion.entryId
                        : undefined,
                    )
                  )
                    setEmpty(
                      "No approved memories in this activity yet. Your caregiver can add one in Memory Library.",
                    );
                }}
              >
                {activityNames[kind]}
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
          {options.length > 3 && (
            <button
              className="text-button"
              onClick={() => {
                setCategoryPage(categoryPage === 0 ? 1 : 0);
                setEmpty("");
              }}
            >
              {categoryPage === 0 ? "More activities" : "Earlier activities"}{" "}
              <ArrowRight size={16} />
            </button>
          )}
          {empty && (
            <p role="status" className="memory-notice">
              {empty}
            </p>
          )}
          <p className="memory-help">
            Take as much or as little time as you like. You can always skip or
            leave.
          </p>
        </div>
      )}
      <div className="memory-safety-footer">
        <SOSButton />
        <small>
          Educational prototype. No real emergency calls. Activities are for
          connection, not diagnosis or treatment.
        </small>
      </div>
    </section>
  );
}
export function MemoryGardenHome() {
  const s = useStore();
  return (
    <div
      className={`memory-page ${s.settings.reducedMotion ? "reduce-motion" : ""} ${s.settings.largeText ? "large-text" : ""}`}
    >
      <header className="public-header">
        <Link className="brand" to="/">
          <span>
            <Leaf />
          </span>
          WayHome.
        </Link>
        <Link className="button light" to="/caregiver/library">
          Caregiver Memory Library
        </Link>
      </header>
      <main>
        <MemoryGardenExperience />
      </main>
    </div>
  );
}
