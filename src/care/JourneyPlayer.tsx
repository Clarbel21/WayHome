import { useOnWatch } from "../memory/watchMode";
import { useStore } from "../store";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCare } from "./store";
import { useMemory, safetyReady } from "../memory/store";
import { useMediaURL } from "../memory/media";
import { Photo } from "../components/Photo";
import { SOSButton } from "../components/SOSButton";
export function JourneyInvitations() {
  const journeys = useCare((s) => s.journeys);
  const watch = useOnWatch();
  if (!journeys.length) return null;
  return (
    <section className="journey-invitations">
      {!watch && <h2>Optional Memory Journeys</h2>}
      {journeys.map((j) => (
        <Link
          className="memory-choice quiet"
          key={j.id}
          to={`/journeys/${j.id}`}
        >
          {j.title}
        </Link>
      ))}
    </section>
  );
}
export function JourneyPlayer() {
  const { id } = useParams(),
    journey = useCare((s) => s.journeys.find((j) => j.id === id));
  const entries = useMemory((s) => s.entries),
    sound = useMemory((s) => s.preferences.sound),
    [index, setIndex] = useState(0),
    [finished, setFinished] = useState(false);
  const entry = entries.find(
      (e) => e.id === journey?.entries[index] && e.approved,
    ),
    image = useMediaURL(entry?.imageId),
    audio = useMediaURL(entry?.audioId);
  const state = useStore();
  const ready = safetyReady();
  useEffect(() => {
    if (journey)
      useStore
        .getState()
        .recordActivity(
          `Memory Journey opened: ${journey.title} — optional, no grading`,
        );
  }, [id]);
  function advance(skipped: boolean) {
    state.recordActivity(
      `Memory Journey ${skipped ? "step skipped" : "step shared"}: ${journey?.title ?? "unavailable"}`,
    );
    if (index + 1 < (journey?.entries.length || 1)) setIndex((i) => i + 1);
    else {
      setFinished(true);
      state.recordActivity(
        `Memory Journey finished: ${journey?.title ?? "unavailable"}`,
      );
    }
  }
  return (
    <main className="memory-page">
      <section className="memory-experience">
        <nav className="memory-topline">
          {index > 0 && !finished ? (
            <button
              className="text-button"
              onClick={() => setIndex((i) => i - 1)}
            >
              Back one memory
            </button>
          ) : (
            <Link className="text-button" to="/memories">
              Back to memories
            </Link>
          )}
          <Link className="text-button" to="/companion">
            Exit journey
          </Link>
        </nav>
        <h1>{journey?.title ?? "This journey is unavailable"}</h1>
        {!ready ? (
          <>
            <h2>Memories can wait. We're here with you.</h2>
            <Link className="button" to="/caregiver/emergency">
              Open caregiver review
            </Link>
          </>
        ) : !journey ? (
          <Link className="button" to="/memories">
            Choose another memory
          </Link>
        ) : finished ? (
          <>
            <h2>Thank you for sharing a little time.</h2>
            <Link className="memory-choice" to="/memories">
              Return to Memory Garden
            </Link>
          </>
        ) : (
          <>
            <p>
              Every memory is optional. You can listen, look, skip, or leave.
            </p>
            {entry ? (
              <>
                <h2>{entry.title}</h2>
                {(image.url || entry.image) && (
                  <Photo src={image.url ?? entry.image!} alt={entry.title} />
                )}
                <p>{entry.description}</p>
                {audio.url && sound && (
                  <audio key={entry.id} controls src={audio.url} />
                )}{" "}
                {entry.audioId && !sound && (
                  <p>Sound is off in caregiver preferences.</p>
                )}
              </>
            ) : (
              <p>This memory isn't approved or available. You can skip it.</p>
            )}
            <div className="memory-choices">
              <button className="memory-choice" onClick={() => advance(false)}>
                {index + 1 < (journey.entries.length || 1)
                  ? "Next optional memory"
                  : "Finish journey"}
              </button>
              <button
                className="memory-choice quiet"
                onClick={() => advance(true)}
              >
                Skip this memory
              </button>
            </div>
          </>
        )}
        <SOSButton />
      </section>
    </main>
  );
}
