import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CornerUpLeft,
  CornerUpRight,
  Footprints,
  Lightbulb,
  House,
  Sparkles,
} from "lucide-react";
import { navigable, useStore, type Landmark } from "../store";
import { useMediaURL } from "./media";
import { useOnWatch } from "./watchMode";
import { planRoute, type Turn } from "../zone/route";
import { safetyReady, useMemory } from "./store";
import {
  buildSession,
  cueFor,
  familiarityLabel,
  familiarityLevel,
  isCorrect,
  neighbourhood,
  requeue,
  usePractice,
  type Question,
} from "./practice";

const imgSrc = (src: string) =>
  src.startsWith("/images/")
    ? `${import.meta.env.BASE_URL}${src.slice(1)}`
    : src;

/** Landmark or place photo: uploaded photo if there is one, else the built-in art. */
function PlaceImage({
  photo,
  photoId,
  alt = "",
}: {
  photo: string;
  photoId?: string;
  alt?: string;
}) {
  const media = useMediaURL(photoId);
  const src =
    media.url ||
    (photo ? imgSrc(photo) : `${import.meta.env.BASE_URL}images/home.svg`);
  return <img src={src} alt={alt} />;
}

const turnWord: Record<Turn, string> = {
  left: "turn left",
  right: "turn right",
  straight: "go straight on",
};
function TurnIcon({ turn, size = 22 }: { turn: Turn; size?: number }) {
  return turn === "left" ? (
    <CornerUpLeft size={size} aria-hidden="true" />
  ) : turn === "right" ? (
    <CornerUpRight size={size} aria-hidden="true" />
  ) : (
    <ArrowUp size={size} aria-hidden="true" />
  );
}

type Stage =
  | { name: "intro" }
  | { name: "walk"; step: number }
  | {
      name: "quiz";
      queue: Question[];
      index: number;
      picked: string | null;
      hinted: boolean;
      clue: boolean;
      done: boolean;
      base: number;
    }
  | { name: "finished"; looked: number };

/** The walk home as a row of photos with the turn made at each place. */
export function RouteStrip({ route }: { route: Landmark[] }) {
  const turns = planRoute(route.length).turns;
  return (
    <ol className="wp-route-strip" aria-label="Your walk home, in order">
      {route.map((l, i) => (
        <li key={l.id}>
          <PlaceImage photo={l.photo} photoId={l.photoId} />
          <span>{l.name}</span>
          {i < route.length - 1 && (
            <i className="wp-route-turn" title={turnWord[turns[i + 1]]}>
              <TurnIcon turn={turns[i + 1]} size={14} />
            </i>
          )}
        </li>
      ))}
    </ol>
  );
}

export function WayHomePractice({ onExit }: { onExit: () => void }) {
  const s = useStore();
  const practice = usePractice();
  const route = useMemo(() => s.landmarks.filter(navigable), [s.landmarks]);
  const turns = planRoute(route.length).turns;
  const short = useMemory((m) => m.preferences.duration === "short");
  const [stage, setStage] = useState<Stage>({ name: "intro" });
  const watch = useOnWatch();
  const first = s.settings.wearer.split(" ")[0];
  const byId = (id: string) => {
    const l = route.find((x) => x.id === id);
    if (l)
      return {
        id: l.id,
        name: l.name,
        photo: l.photo,
        photoId: l.photoId,
        cue: cueFor(l),
      };
    return neighbourhood.find((p) => p.id === id)!;
  };

  if (!safetyReady())
    return (
      <div className="wp-practice">
        <p className="memory-notice" role="status">
          Practice is paused while a safety check is open. Your place is kept.
        </p>
        <button className="memory-choice quiet" onClick={onExit}>
          Back to my garden
        </button>
      </div>
    );

  if (!route.length)
    return (
      <div className="wp-practice">
        <h1>Your walk home</h1>
        <p>
          Your caregiver hasn't chosen the places on your walk home yet. They
          can add them under Familiar landmarks.
        </p>
        <button className="memory-choice quiet" onClick={onExit}>
          Back to my garden
        </button>
      </div>
    );

  const startQuiz = () => {
    const queue = buildSession(route, short ? 6 : 9);
    setStage({
      name: "quiz",
      queue,
      base: queue.length,
      index: 0,
      picked: null,
      hinted: false,
      clue: false,
      done: false,
    });
  };

  // ---------------------------------------------------------------- intro
  if (stage.name === "intro")
    return (
      <div className="wp-practice">
        {watch ? (
          <h1>Your walk home</h1>
        ) : (
          <>
            <span className="eyebrow">PRACTICE MY WAY HOME</span>
            <h1>Let's get to know your walk home.</h1>
            <p className="wp-lead">
              These are the places you pass on the way home. When they feel
              familiar, they're easier to spot when you're out walking.
            </p>
          </>
        )}
        <RouteStrip route={route} />
        <div className="memory-choices">
          <button className="memory-choice" onClick={startQuiz}>
            <Sparkles size={20} aria-hidden="true" /> Practice with me
          </button>
          <button
            className="memory-choice quiet"
            onClick={() => setStage({ name: "walk", step: 0 })}
          >
            <Footprints size={20} aria-hidden="true" />{" "}
            {watch ? "See my walk" : "Look at my walk first"}
          </button>
        </div>
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={16} /> {watch ? "Back" : "Back to my garden"}
        </button>
      </div>
    );

  // ---------------------------------------------------------------- walkthrough
  if (stage.name === "walk") {
    const i = stage.step;
    const l = route[i];
    const last = i === route.length - 1;
    return (
      <div className="wp-practice">
        <span className="eyebrow">
          PLACE {i + 1} OF {route.length}
        </span>
        <div className="wp-dots" aria-hidden="true">
          {route.map((x, k) => (
            <i key={x.id} className={k < i ? "done" : k === i ? "now" : ""} />
          ))}
        </div>
        <div className="wp-walk-turn">
          <TurnIcon turn={turns[i] ?? "straight"} />
          <span>
            {i === 0
              ? watch
                ? "Go straight"
                : "Start by going straight ahead"
              : `${turns[i] === "left" ? "Turn left" : turns[i] === "right" ? "Turn right" : "Go straight on"}${watch ? "" : ` at the ${route[i - 1].name}`}`}
          </span>
        </div>
        <figure className="wp-walk-photo">
          <PlaceImage photo={l.photo} photoId={l.photoId} alt={l.name} />
        </figure>
        <h1>
          {watch
            ? l.name
            : last
              ? "And there's home."
              : `You'll see the ${l.name}.`}
        </h1>
        <p className="wp-cue">
          <Lightbulb size={18} aria-hidden="true" /> Look for {cueFor(l)}.
        </p>
        <div className="wp-nav-row">
          <button
            className="memory-choice quiet"
            onClick={() =>
              i === 0
                ? setStage({ name: "intro" })
                : setStage({ name: "walk", step: i - 1 })
            }
          >
            <ArrowLeft size={18} /> Back
          </button>
          {last ? (
            <button className="memory-choice" onClick={startQuiz}>
              {watch ? "Practice" : "Practice with me"} <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="memory-choice"
              onClick={() => setStage({ name: "walk", step: i + 1 })}
            >
              {watch ? "Next" : "Next place"} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- finished
  if (stage.name === "finished")
    return (
      <div className="wp-practice wp-finished">
        <div className="wp-bloom" aria-hidden="true">
          <Sparkles size={30} />
        </div>
        <h1>{watch ? "Lovely walk!" : `Lovely walk, ${first}.`}</h1>
        {!watch && (
          <p className="wp-lead">
            You looked at {stage.looked} places on your way home today. A new
            flower is growing in your garden.
          </p>
        )}
        {!watch && (
          <ul className="wp-familiar-list">
            {route.map((l) => {
              const level = familiarityLevel(practice.familiarity[l.id]);
              return (
                <li key={l.id}>
                  <PlaceImage photo={l.photo} photoId={l.photoId} />
                  <span>{l.name}</span>
                  <em className={`wp-level ${level}`}>
                    {level === "well"
                      ? "Feels familiar"
                      : level === "new"
                        ? "Next time"
                        : "Let's look again soon"}
                  </em>
                </li>
              );
            })}
          </ul>
        )}
        <div className="memory-choices">
          <button className="memory-choice" onClick={startQuiz}>
            Practice again
          </button>
          <button className="memory-choice quiet" onClick={onExit}>
            {watch ? "Done" : "Back to my garden"}
          </button>
        </div>
      </div>
    );

  // ---------------------------------------------------------------- questions
  const q = stage.queue[stage.index];
  const target = byId(q.landmarkId);
  const answered = stage.done;
  const total = stage.queue.length;
  const prompt = watch
    ? q.kind === "spot"
      ? `Find the ${target.name}`
      : q.kind === "next"
        ? q.afterId === "start"
          ? "Which comes first?"
          : `After the ${byId(q.afterId).name}?`
        : `Which way at the ${target.name}?`
    : q.kind === "spot"
      ? `Which one is the ${target.name}?`
      : q.kind === "next"
        ? q.afterId === "start"
          ? "You're starting your walk home. Which place do you see first?"
          : `After the ${byId(q.afterId).name}, which place comes next?`
        : `At the ${target.name}, which way do you go?`;

  const pick = (choice: string) => {
    if (stage.done) return;
    if (isCorrect(q, choice)) {
      practice.record(q.landmarkId, !stage.hinted);
      setStage({ ...stage, picked: choice, done: true });
    } else if (!stage.hinted) {
      // Errorless: show the right one with its clue; they then choose it.
      setStage({
        ...stage,
        picked: choice,
        hinted: true,
        clue: true,
        // Bring it back once, and never more than 3 extra questions per walk.
        queue:
          stage.queue.filter((x) => x === q).length > 1 ||
          stage.queue.length - stage.base >= 3
            ? stage.queue
            : requeue(stage.queue, stage.index),
      });
    }
  };
  const next = () => {
    if (stage.index + 1 >= total) {
      practice.finishSession();
      useMemory.setState((m) => ({ growth: [...m.growth, "flower"] }));
      setStage({
        name: "finished",
        looked: new Set(stage.queue.map((x) => x.landmarkId)).size,
      });
    } else
      setStage({
        ...stage,
        index: stage.index + 1,
        picked: null,
        hinted: false,
        clue: false,
        done: false,
      });
  };
  const wrongPick =
    stage.hinted && stage.picked && !isCorrect(q, stage.picked)
      ? stage.picked
      : null;

  return (
    <div className="wp-practice">
      <div className="wp-quiz-top">
        <span className="eyebrow">
          {stage.index + 1} OF {total}
        </span>
        <div className="wp-dots" aria-hidden="true">
          {stage.queue.map((_, k) => (
            <i
              key={k}
              className={
                k < stage.index ? "done" : k === stage.index ? "now" : ""
              }
            />
          ))}
        </div>
      </div>
      {q.kind === "turn" && (
        <figure className="wp-walk-photo small">
          <PlaceImage
            photo={target.photo}
            photoId={target.photoId}
            alt={target.name}
          />
        </figure>
      )}
      <h1 className="wp-prompt" aria-live="polite">
        {prompt}
      </h1>
      {!answered && !stage.clue && (
        <button
          className="text-button wp-clue-button"
          onClick={() => setStage({ ...stage, clue: true })}
        >
          <Lightbulb size={16} /> {watch ? "Clue" : "Show me a clue"}
        </button>
      )}
      {stage.clue && !answered && (
        <p className="wp-cue" role="status">
          <Lightbulb size={18} aria-hidden="true" />
          {watch
            ? q.kind === "turn"
              ? wrongPick
                ? "Tap the glowing arrow."
                : "Think of the next place."
              : wrongPick
                ? "Tap the glowing one."
                : `Look for ${target.cue}.`
            : wrongPick
              ? q.kind === "turn"
                ? `At the ${target.name} you ${turnWord[q.answer]}. Tap the glowing arrow.`
                : `That one is the ${byId(wrongPick).name}. The ${target.name} has ${target.cue} — it's glowing now.`
              : q.kind === "turn"
                ? `Think of the walk: after the ${target.name} you head toward the next place.`
                : `Look for ${target.cue}.`}
        </p>
      )}

      {q.kind === "turn" ? (
        <div className="wp-turns" role="group" aria-label="Which way">
          {q.options.map((o) => {
            const right = o === q.answer;
            return (
              <button
                key={o}
                className={`wp-turn-option ${answered && right ? "is-right" : ""} ${wrongPick && right ? "glow" : ""} ${wrongPick === o ? "dim" : ""}`}
                disabled={answered || (!!wrongPick && !right)}
                onClick={() => pick(o)}
              >
                <TurnIcon turn={o} size={30} />
                <span>
                  {o === "left"
                    ? "Left"
                    : o === "right"
                      ? "Right"
                      : "Straight on"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="wp-photo-options"
          role="group"
          aria-label="Choose a place"
        >
          {q.options.map((id) => {
            const place = byId(id);
            const right = id === q.landmarkId;
            const showName =
              answered || wrongPick === id || (!!wrongPick && right);
            return (
              <button
                key={id}
                className={`wp-photo-option ${answered && right ? "is-right" : ""} ${wrongPick && right ? "glow" : ""} ${wrongPick === id || (answered && !right) ? "dim" : ""}`}
                aria-label={showName ? place.name : "Choose this place"}
                disabled={answered || (!!wrongPick && !right)}
                onClick={() => pick(id)}
              >
                <PlaceImage photo={place.photo} photoId={place.photoId} />
                {showName && <span>{place.name}</span>}
                {answered && right && (
                  <i className="wp-tick" aria-hidden="true">
                    <Check size={18} />
                  </i>
                )}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <div className="wp-feedback" role="status">
          <p>
            <strong>
              {stage.hinted
                ? "That's it."
                : watch
                  ? "Yes!"
                  : "Yes, well spotted!"}
            </strong>
            {!watch &&
              (q.kind === "turn"
                ? ` At the ${target.name} you ${turnWord[q.answer]}.`
                : ` The ${target.name} — look for ${target.cue}.`)}
          </p>
          <button className="memory-choice" onClick={next}>
            {stage.index + 1 >= total
              ? watch
                ? "Finish"
                : "Finish my walk"
              : "Next"}{" "}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
      <button className="text-button" onClick={onExit}>
        <House size={16} /> {watch ? "Stop" : "Stop for now"}
      </button>
    </div>
  );
}

/** Caregiver view: how familiar each route landmark feels in practice. */
export function LandmarkFamiliarity() {
  const s = useStore();
  const practice = usePractice();
  const route = s.landmarks.filter(navigable);
  if (!route.length) return null;
  return (
    <section
      className="card settings-card wp-familiarity"
      aria-label="Landmark familiarity"
    >
      <h2>Landmark familiarity from practice</h2>
      <p>
        From "Practice my way home" in the Memory Garden ({practice.sessions}{" "}
        session{practice.sessions === 1 ? "" : "s"}). This describes the{" "}
        <strong>landmark</strong>, not the person: if a place stays "Still
        learning", try a clearer photo or a more distinctive clue.
      </p>
      <ul>
        {route.map((l) => {
          const f = practice.familiarity[l.id];
          const level = familiarityLevel(f);
          return (
            <li key={l.id}>
              <PlaceImage photo={l.photo} photoId={l.photoId} />
              <div>
                <strong>{l.name}</strong>
                <small>
                  {f
                    ? `${f.firstTry} recognised straight away · ${f.hinted} with a clue`
                    : "Not practised yet"}
                </small>
              </div>
              <em className={`wp-level ${level}`}>{familiarityLabel[level]}</em>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
