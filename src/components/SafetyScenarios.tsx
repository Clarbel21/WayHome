import { useStore } from "../store";
import {
  clearSignals,
  evaluateSignals,
  type Scenario,
} from "../services/safety";
export function SafetyScenarios() {
  const s = useStore();
  const scenarios: { key: Scenario; label: string }[] = [
    { key: "deviation", label: "Simulate route deviation" },
    { key: "inactivity", label: "Simulate prolonged inactivity" },
    { key: "missed", label: "Simulate missed check-ins" },
    { key: "gps", label: "Simulate low GPS confidence" },
  ];
  return (
    <section className="card settings-card safety-scenarios">
      <h2>Deterministic safety scenarios</h2>
      <p>
        Simulated thresholds: deviation ≥100 m with GPS confidence ≥60%;
        inactivity ≥15 minutes; ≥2 missed check-ins; GPS confidence &lt;60%.
        These request support, never automatic emergency dispatch.
      </p>
      <div className="button-row">
        {scenarios.map(({ key, label }) => (
          <button
            key={key}
            className="button light"
            onClick={() => s.simulateScenario(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        Sample readings: {s.signals.deviationMeters} m deviation ·{" "}
        {s.signals.inactiveMinutes} minutes inactive ·{" "}
        {s.signals.missedCheckIns} missed check-ins ·{" "}
        {Math.round(s.signals.gpsConfidence * 100)}% GPS confidence.
      </p>
      <ul className="safety-findings" aria-live="polite">
        {evaluateSignals(s.signals).map((f) => (
          <li key={f.key}>{f.reason}</li>
        ))}
      </ul>
      <div className="button-row">
        <button
          className="button light"
          onClick={() => s.setSignals({ ...clearSignals })}
        >
          Clear simulated scenario readings
        </button>
        <button className="button light" onClick={() => s.event("OKAY")}>
          Review check-in after observations
        </button>
      </div>
      <p className="help-text">
        Clearing readings does not confirm anyone's safety, restore
        wear/connection inputs or dismiss S5. There is no background clock or
        real GPS.
      </p>
    </section>
  );
}
