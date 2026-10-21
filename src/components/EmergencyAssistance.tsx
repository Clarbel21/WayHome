import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { simulatedLocation, status, useStore } from "../store";
import { verificationBlockers, wearLabels } from "../services/safety";
import { ResolveSOSButton } from "./ResolveSOSButton";
import { WearableConfiguration } from "./WearableConfiguration";
import { SafetyScenarios } from "./SafetyScenarios";
import { Wearable } from "./Wearable";
export function EmergencyAssistance() {
  const s = useStore();
  const [confirmed, setConfirmed] = useState(false);
  const [resolutionNote, setResolutionNote] = useState(
    "Caregiver has reviewed the simulated incident.",
  );
  const [verificationMessage, setVerificationMessage] = useState("");
  useEffect(() => {
    setConfirmed(false);
    setVerificationMessage("");
  }, [s.incident?.revision]);
  const blockers = verificationBlockers(s);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState(
    "Wearer may need additional assistance during this demonstration.",
  );
  const latest = s.alerts.find((a) => a.emergency);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CIRCLE OF SUPPORT</div>
          <h1>Emergency Assistance</h1>
          <p>
            Deterministic educational escalation. No real calls or messages are
            sent.
          </p>
        </div>
      </div>
      <div className="demo-layout">
        <div>
          <div className="memory-review-return">
            <Link className="button light" to="/memories">
              Return to Memory Garden
            </Link>
            <p>
              After reviewing the demo device readings, choose Review check-in
              after observations below. An active SOS requires separate
              resolution and verification.
            </p>
          </div>
          <section className="card settings-card emergency-panel">
            <ShieldAlert size={28} />
            <h2>SIMULATION — No police were contacted</h2>
            <p>Current wearer: {s.settings.wearer}</p>
            <p>Current safety status: {status[s.mode]}</p>
            <p>{simulatedLocation(s.position)}</p>
            <ResolveSOSButton />
            <div className="button-row">
              <button
                ref={trigger}
                className="button"
                onClick={() => {
                  dialog.current?.showModal();
                  cancelButton.current?.focus();
                }}
              >
                Simulate Police Notification
              </button>
              <button
                className="button light"
                disabled={
                  s.mode !== "EMERGENCY_SIMULATED" || !resolutionNote.trim()
                }
                onClick={() => s.resetEmergency(resolutionNote)}
              >
                Request incident resolution
              </button>
            </div>
            <p className="help-text">
              Requesting resolution leaves S5 active. Receipt, resolution and
              verification are separate. No connection or wear readings are
              changed.
            </p>
            <label>
              Resolution note
              <textarea
                value={resolutionNote}
                maxLength={240}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </label>
            <p role="status">
              Incident lifecycle:{" "}
              {s.incident?.stage.replaceAll("_", " ") || "none"} · Wear
              inference: {wearLabels[s.wearStatus]}.
            </p>
            {s.incident?.stage === "awaiting_verification" && (
              <div className="incident-verification">
                <h3>Verification required · S5 remains active</h3>
                <p>
                  These demo checks are not a real safety guarantee. Fix
                  observed device/scenario issues below first.
                </p>
                <ul>
                  {blockers.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I have independently checked on the wearer in this simulation
                </label>
                <button
                  className="button"
                  disabled={!confirmed || blockers.length > 0}
                  onClick={() => {
                    if (!s.incident) return;
                    setVerificationMessage(
                      s.verifyIncident(
                        s.incident.id,
                        s.incident.revision,
                        confirmed,
                      )
                        ? "Resolution verified and recorded. Device readings were preserved."
                        : "Verification could not complete. Review the latest incident and observations.",
                    );
                  }}
                >
                  Verify resolution and close incident
                </button>
              </div>
            )}
            <p role="status">{verificationMessage}</p>
          </section>
          <WearableConfiguration />
          <SafetyScenarios />
          <section
            className="card settings-card emergency-panel"
            aria-live="polite"
          >
            <h2>Latest emergency event</h2>
            {latest?.emergency ? (
              <>
                <dl className="emergency-details">
                  <dt>Wearer</dt>
                  <dd>{latest.emergency.wearer}</dd>
                  <dt>Simulated location</dt>
                  <dd>{latest.emergency.location}</dd>
                  <dt>Timestamp</dt>
                  <dd>{new Date(latest.emergency.time).toLocaleString()}</dd>
                  <dt>Safety status at event</dt>
                  <dd>{latest.emergency.safetyStatus}</dd>
                  <dt>Alert reason</dt>
                  <dd>{latest.emergency.reason}</dd>
                  <dt>Type</dt>
                  <dd>
                    {latest.emergency.kind === "police"
                      ? "Simulated police notification"
                      : "Simulated SOS"}
                  </dd>
                </dl>
                {latest.emergency.resolvedAt && (
                  <p>
                    Incident resolution verified by{" "}
                    {latest.emergency.resolvedBy} ·{" "}
                    {new Date(latest.emergency.resolvedAt).toLocaleString()}.
                    This records caregiver review, not guaranteed safety.
                  </p>
                )}
                {latest.emergency.acknowledgedAt ? (
                  <p>
                    Caregiver acknowledged by {latest.emergency.acknowledgedBy}{" "}
                    ·{" "}
                    {new Date(latest.emergency.acknowledgedAt).toLocaleString()}
                  </p>
                ) : (
                  <button
                    className="button light"
                    onClick={() => s.acknowledgeEmergency(latest.id)}
                  >
                    Acknowledge emergency event
                  </button>
                )}
                <p className="help-text">
                  Acknowledgment records caregiver review; it does not dismiss
                  S5 and does not mean the wearer is safe. Use the separate
                  resolution and verification process.
                </p>
              </>
            ) : (
              <p>
                No emergency events yet. A wearer SOS appears here immediately,
                even when notifications are turned off.
              </p>
            )}
            <Link className="text-button" to="/caregiver/alerts">
              View full alert history →
            </Link>
          </section>
        </div>
        <section className="card demo-twin">
          <div className="eyebrow">
            LIVE DIGITAL TWIN · {s.settings.companionName}
          </div>
          <Wearable compact />
        </section>
      </div>
      <dialog
        ref={dialog}
        className="emergency-dialog"
        aria-labelledby="emergency-title"
        onClose={() => trigger.current?.focus()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return;
            s.event("POLICE", reason);
            close();
          }}
        >
          <h2 id="emergency-title">Confirm simulated police notification</h2>
          <p>SIMULATION — No police were contacted</p>
          <p>
            This creates a local demo event for {s.settings.wearer}, records
            their simulated location, and puts the wearable in S5. It will not
            contact emergency services.
          </p>
          <label htmlFor="emergency-reason">Alert reason</label>
          <textarea
            id="emergency-reason"
            required
            maxLength={240}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="button-row">
            <button
              ref={cancelButton}
              autoFocus
              className="button light"
              type="button"
              onClick={close}
            >
              Cancel
            </button>
            <button className="button" type="submit" disabled={!reason.trim()}>
              Confirm simulation
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
