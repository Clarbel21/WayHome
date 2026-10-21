import { useEffect, useState } from "react";
import { DEFAULT_COMPANION_NAME, useStore } from "../store";
export function CompanionPersonalization() {
  const name = useStore((s) => s.settings.companionName);
  const save = useStore((s) => s.saveCompanionName);
  const [draft, setDraft] = useState(name);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(name);
  }, [name]);
  return (
    <section className="card settings-card">
      <h2>Companion Personalization</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!save(draft)) {
            setError(
              "Please enter a name of 1–24 characters, without control characters.",
            );
            setFeedback("");
            return;
          }
          setError("");
          setFeedback("Companion name saved.");
        }}
        noValidate
      >
        <label htmlFor="companion-name">Avatar name</label>
        <input
          id="companion-name"
          className="personalization-input"
          value={draft}
          aria-invalid={!!error}
          aria-describedby="name-help name-error"
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
            setFeedback("");
          }}
        />
        <p id="name-help" className="help-text">
          Choose up to 24 characters. Names in any language are welcome.{" "}
          {Array.from(draft.trim()).length}/24
        </p>
        <p id="name-error" className="form-error" role="alert">
          {error}
        </p>
        <div className="button-row">
          <button className="button" type="submit">
            Save companion name
          </button>
          <button
            className="button light"
            type="button"
            onClick={() => {
              save(DEFAULT_COMPANION_NAME);
              setDraft(DEFAULT_COMPANION_NAME);
              setError("");
              setFeedback("Default companion name restored.");
            }}
          >
            Reset to Default
          </button>
        </div>
        <p className="help-text" role="status">
          {feedback}
        </p>
      </form>
    </section>
  );
}
