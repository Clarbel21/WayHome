import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { verificationBlockers } from "../services/safety";
export function ResolveSOSButton() {
  const s = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const title = useId();
  const [target, setTarget] = useState<{ id: string; revision: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const blockers = verificationBlockers(s);
  const changed =
    !!target &&
    (target.id !== s.incident?.id || target.revision !== s.incident?.revision);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  if (s.mode !== "EMERGENCY_SIMULATED" || !s.incident) return null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="watch-action resolve-sos-button"
        onClick={() => {
          if (!s.incident) return;
          setTarget({ id: s.incident.id, revision: s.incident.revision });
          setError("");
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        Help received — resolve SOS
      </button>
      <dialog
        ref={dialog}
        className="emergency-dialog resolve-sos-dialog"
        aria-labelledby={title}
        onClose={() => {
          setTarget(null);
          trigger.current?.focus();
        }}
      >
        {target && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const current = useStore.getState();
              if (
                !target ||
                target.id !== current.incident?.id ||
                target.revision !== current.incident?.revision
              ) {
                setError(
                  "A new help request arrived. Close this confirmation and review the latest SOS.",
                );
                return;
              }
              current.resetEmergency(
                "Caregiver confirms help received and wearer checked using Resolve SOS.",
              );
              if (
                !useStore
                  .getState()
                  .resolveIncident(target.id, target.revision, true)
              ) {
                setError(
                  "The incident could not be closed. Review the latest request and device observations.",
                );
                return;
              }
              close();
            }}
          >
            <h2 id={title}>
              Has help arrived and the situation been resolved?
            </h2>
            <p>
              Confirm only after a caregiver has independently checked on the
              wearer. This ends the simulated SOS and keeps its alert history.
              It does not change device readings or guarantee safety.
            </p>
            {changed && (
              <p className="form-error" role="alert">
                A new SOS arrived. Close this confirmation and review the latest
                request.
              </p>
            )}
            {blockers.length > 0 && (
              <div className="resolve-sos-blockers">
                <p>
                  These device warnings will stay visible after resolving SOS.
                  You can still continue local memories after caregiver
                  confirmation:
                </p>
                <ul>
                  {blockers.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <Link
                  className="button light"
                  to="/caregiver/emergency"
                  onClick={close}
                >
                  Open caregiver review
                </Link>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <button
                ref={cancel}
                autoFocus
                type="button"
                className="button light"
                onClick={close}
              >
                Keep SOS active
              </button>
              <button type="submit" className="button" disabled={changed}>
                Caregiver confirms — resolve SOS
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
