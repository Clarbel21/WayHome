import { useEffect } from "react";
import { useStore } from "../store";

// One timer for the application, even when several wearable previews are visible.
export function CheckInRuntime() {
  const mode = useStore((s) => s.mode);
  const c = useStore((s) => s.checkIn);
  useEffect(() => {
    if (mode !== "CHECK_IN") return;
    if (!c) {
      const s = useStore.getState();
      // Rendering a pending device review must not revoke caregiver verification.
      useStore.setState({
        checkIn: {
          id: crypto.randomUUID(),
          stage: "question",
          repeats: 0,
          deadline: s.reviewedIncident
            ? null
            : Date.now() + s.settings.checkInTimeoutSeconds * 1000,
        },
      });
      return;
    }
    if (c.stage !== "question" || c.deadline === null) return;
    const timer = window.setTimeout(
      () => useStore.getState().checkInTimeout(c.id),
      Math.max(0, c.deadline - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [mode, c]);
  return null;
}
export function FamilyResponse() {
  const s = useStore();
  const request = s.familyRequest;
  if (!request) return null;
  return (
    <section className="card settings-card" aria-label="Family request">
      <h2>Family request · simulation</h2>
      <p>
        {new Date(request.requestedAt).toLocaleString()} · {request.status}
      </p>
      <p>
        Acknowledgment and response do not resolve safety incidents. No real
        call is made.
      </p>
      {request.status === "waiting" && (
        <button
          className="button"
          onClick={() => s.respondFamily(request.id, "acknowledge")}
        >
          Acknowledge family request
        </button>
      )}
      {request.status === "acknowledged" && (
        <button
          className="button"
          onClick={() => s.respondFamily(request.id, "respond")}
        >
          Simulate caregiver response
        </button>
      )}
      {request.status === "responded" && (
        <p>
          Response recorded. Review any remaining safety conditions separately.
        </p>
      )}
    </section>
  );
}
export function CheckInDemo() {
  const s = useStore();
  return (
    <section className="card settings-card">
      <h2>Check-in interaction demo</h2>
      <label>
        Response timeout (seconds)
        <select
          value={s.settings.checkInTimeoutSeconds}
          onChange={(e) =>
            s.settingsUpdate({ checkInTimeoutSeconds: Number(e.target.value) })
          }
        >
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={s.settings.checkInNotify}
          onChange={(e) =>
            s.settingsUpdate({ checkInNotify: e.target.checked })
          }
        />{" "}
        Notify caregiver after unanswered repeat (simulation)
      </label>
      <p>
        Start a check-in, then try either answer on the wearable. Help offers
        home guidance, family contact, and calm support. During guidance, try
        either recognition answer. SOS can interrupt every branch.
      </p>
      <button className="button" onClick={() => s.event("CHECK")}>
        Start feeling check-in
      </button>{" "}
      <button
        className="button light"
        disabled={s.mode !== "CHECK_IN" || s.checkIn?.stage !== "question"}
        onClick={() => {
          const c = useStore.getState().checkIn;
          if (c?.deadline) s.checkInTimeout(c.id, c.deadline);
        }}
      >
        Simulate response timeout
      </button>
      <p>
        One timeout gently repeats. A second logs an unresolved check-in; the
        policy above controls caregiver notification. Nobody is labeled lost; no
        police are called.
      </p>
      <FamilyResponse />
    </section>
  );
}

export function CheckInHistory() {
  const history = useStore((s) => s.checkInHistory);
  if (!history.length) return null;
  return (
    <section className="card settings-card" aria-label="Check-in responses">
      <h2>Check-in responses</h2>
      {history.slice(0, 5).map((c, i) => (
        <p key={`${c.id}-${i}`}>
          {c.response === "okay"
            ? "I'm okay"
            : c.response === "help"
              ? "I need help"
              : "Unresolved check-in"}
          {" · "}
          {new Date(c.respondedAt ?? c.unresolvedAt ?? 0).toLocaleString()}
        </p>
      ))}
    </section>
  );
}
