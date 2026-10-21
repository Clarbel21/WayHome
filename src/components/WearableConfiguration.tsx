import { useEffect, useState } from "react";
import { useStore } from "../store";
import {
  attachmentNames,
  inputLabels,
  wearLabels,
  wearPreset,
  type Attachment,
  type Observation,
} from "../services/safety";
export function WearableConfiguration() {
  const s = useStore();
  const [draft, setDraft] = useState(s.wearInputs);
  useEffect(() => setDraft(s.wearInputs), [s.attachment, s.wearInputs]);
  return (
    <section className="card settings-card wearable-config">
      <h2>Modular wearable · simulated inputs</h2>
      <p>
        One companion, three attachment options. These illustrative sensors are
        not tested hardware specifications.
      </p>
      <label>
        Attachment configuration
        <select
          value={s.attachment}
          onChange={(e) => s.setAttachment(e.target.value as Attachment)}
        >
          {Object.entries(attachmentNames).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p role="status">
        <strong>Wear inference: {wearLabels[s.wearStatus]}</strong> ·{" "}
        {s.connected ? "sample device connected" : "sample device disconnected"}
      </p>
      <p>
        All wear statuses are uncertain inferences, not guaranteed. Lack of
        movement may mean rest. Disconnection or a changed attachment requires
        new observations.
      </p>
      <div className="settings-grid">
        {Object.entries(inputLabels[s.attachment]).map(([key, label]) => (
          <label key={key}>
            {label}
            <select
              aria-label={label}
              value={draft[key as keyof typeof draft]}
              onChange={(e) =>
                setDraft({ ...draft, [key]: e.target.value as Observation })
              }
            >
              <option value="unknown">Unknown / no reading</option>
              <option value="yes">Yes · simulated</option>
              <option value="no">No · simulated</option>
            </select>
          </label>
        ))}
      </div>
      <div className="button-row">
        <button className="button light" onClick={() => s.observeWear(draft)}>
          Record attachment observations
        </button>
        <button
          disabled={s.connected}
          className="button light"
          onClick={() => s.setConnection(true)}
        >
          Restore simulated connection
        </button>
      </div>
      <div className="button-row wear-presets">
        <button
          className="text-button"
          onClick={() => s.observeWear(wearPreset(s.attachment, "likely_worn"))}
        >
          Simulate likely worn
        </button>
        <button
          className="text-button"
          onClick={() =>
            s.observeWear(wearPreset(s.attachment, "possibly_removed"))
          }
        >
          Simulate possibly removed
        </button>
        <button
          className="text-button"
          onClick={() => s.observeWear(wearPreset(s.attachment, "not_worn"))}
        >
          Simulate not worn
        </button>
        <button
          className="text-button"
          onClick={() => s.observeWear(wearPreset(s.attachment, "unknown"))}
        >
          Simulate unknown wear
        </button>
      </div>
      <p className="help-text">
        Last observation:{" "}
        {s.wearObservedAt
          ? new Date(s.wearObservedAt).toLocaleString()
          : "none for this attachment"}
        . Wear observations never resolve an incident or clear S5.
      </p>
    </section>
  );
}
