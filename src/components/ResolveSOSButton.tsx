import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useT } from "../i18n";
import { verificationBlockers } from "../services/safety";
export function ResolveSOSButton({
  label,
  className = "watch-action resolve-sos-button",
  onResolved,
}: { label?: string; className?: string; onResolved?: () => void } = {}) {
  const s = useStore();
  const t = useT();
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
        className={className}
        onClick={() => {
          if (!s.incident) return;
          setTarget({ id: s.incident.id, revision: s.incident.revision });
          setError("");
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        {label ?? t("resolveWatchLabel")}
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
                setError(t("resolveChangedError"));
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
                setError(t("resolveFailed"));
                return;
              }
              close();
              onResolved?.();
            }}
          >
            <h2 id={title}>{t("resolveTitle")}</h2>
            <p>{t("resolveBody")}</p>
            {changed && (
              <p className="form-error" role="alert">
                {t("resolveChanged")}
              </p>
            )}
            {blockers.length > 0 && (
              <div className="resolve-sos-blockers">
                <p>{t("resolveWarnings")}</p>
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
                  {t("resolveOpenReview")}
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
                {t("resolveKeep")}
              </button>
              <button type="submit" className="button" disabled={changed}>
                {t("resolveConfirm")}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
