import { Check, House } from "lucide-react";
import { navigable, useStore } from "../store";
import { useT } from "../i18n";
import { RADIUS_MAX, RADIUS_MIN, legTarget, useZone } from "./store";

const CX = 150;
const CY = 82;
const SPAN = 66; // px from home to the edge of the drawn area

/** Top-down safe-zone map: home, radius, wearer and (while guiding) landmarks. */
export function ZoneMap({ withSlider = true }: { withSlider?: boolean }) {
  const z = useZone();
  const s = useStore();
  const t = useT();
  const approved = s.landmarks.filter(navigable);
  const scale =
    SPAN /
    Math.max(z.radiusM * 1.3, z.distanceM * 1.12, z.guideStartM ?? 0, 200);
  const rad = (z.bearingDeg * Math.PI) / 180;
  const at = (m: number) => ({
    x: CX + Math.sin(rad) * m * scale,
    y: CY - Math.cos(rad) * m * scale,
  });
  const me = at(z.distanceM);
  const start = z.guideStartM;
  const pins =
    start !== null && s.mode === "GUIDED_RETURN"
      ? approved.map((l, i) => ({
          id: l.id,
          name: l.name,
          done: i < s.guideIndex,
          now: i === s.guideIndex,
          ...at(legTarget(start, i, approved.length)),
        }))
      : [];
  const outside = z.distanceM > z.radiusM;
  return (
    <div className="zone-map">
      <svg
        viewBox="0 0 300 164"
        role="img"
        aria-label={`Safe zone map: radius ${z.radiusM} m, wearer ${Math.round(z.distanceM)} m from home (simulated)`}
      >
        <rect width="300" height="164" fill="#e4eadb" />
        <path
          d="M-10 40H310M-10 122H310M70 -10V174M228 -10V174"
          stroke="#faf9f2"
          strokeWidth="9"
        />
        <circle
          cx={CX}
          cy={CY}
          r={z.radiusM * scale}
          fill={outside ? "#f6ebd355" : "#3b6b4c1a"}
          stroke={outside ? "#c08a1e" : "#3b6b4c"}
          strokeWidth="1.6"
          strokeDasharray="5 4"
        />
        {start !== null && s.mode === "GUIDED_RETURN" && (
          <line
            x1={at(start).x}
            y1={at(start).y}
            x2={CX}
            y2={CY}
            stroke="#3b6b4c"
            strokeWidth="2"
            strokeDasharray="2 4"
          />
        )}
        {pins.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.now ? 6 : 4.5}
              fill={p.done ? "#8fb197" : p.now ? "#28483b" : "#fff"}
              stroke="#28483b"
              strokeWidth="1.5"
            />
          </g>
        ))}
        <g transform={`translate(${CX} ${CY})`}>
          <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#28483b" />
          <path d="M-11 -5 L0 -15 L11 -5Z" fill="#28483b" />
        </g>
        <circle
          cx={me.x}
          cy={me.y}
          r={outside ? 16 : 11}
          fill={outside ? "#c08a1e33" : "#375c4030"}
        />
        <circle
          cx={me.x}
          cy={me.y}
          r="6.5"
          fill={outside ? "#9a6a12" : "#375c40"}
          stroke="#fff"
          strokeWidth="2.5"
        />
      </svg>
      <span className="zone-map-tag">
        {outside ? t("zoneOutside") : t("zoneInside")} ·{" "}
        {Math.round(z.distanceM)} m
      </span>
      {withSlider && (
        <label className="zone-radius">
          <span>
            {t("safeRadius")} <b>{z.radiusM} m</b>
          </span>
          <input
            type="range"
            min={RADIUS_MIN}
            max={RADIUS_MAX}
            step={50}
            value={z.radiusM}
            onChange={(e) => z.setRadius(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}

/** The escalation ladder, as the caregiver sees it while the wearer is outside. */
export function ZoneLadder() {
  const z = useZone();
  const s = useStore();
  const t = useT();
  if (!z.active) return null;
  const guiding = s.mode === "GUIDED_RETURN" && z.guideStartM !== null;
  const steps = [
    { level: 1, label: t("zl1"), when: t("zoneNow") },
    {
      level: 2,
      label: t("zl2", { name: s.settings.caregiver.split(" ")[0] }),
      when: `+${z.notifyPrimaryMin} min`,
    },
    {
      level: 3,
      label: t("zl3", { name: s.settings.emergency.split(" ")[0] }),
      when: `+${z.callSecondaryMin} min`,
    },
    { level: 4, label: t("zl4"), when: `+${z.emergencyMin} min` },
  ];
  return (
    <section
      className={`phone-action-card zone-ladder ${z.level >= 3 ? "urgent" : ""}`}
      aria-label={t("zoneLadder")}
    >
      <h3>{t("zoneLadder")}</h3>
      <p className="zone-ladder-sub">
        {guiding
          ? t("zoneGuiding")
          : t("zoneFor", {
              min: Math.floor(z.vmin),
              km: (z.distanceM / 1000).toFixed(2),
            })}
      </p>
      <ol>
        {steps.map((step) => (
          <li
            key={step.level}
            className={
              z.level >= step.level
                ? "done"
                : z.level + 1 === step.level
                  ? "next"
                  : ""
            }
          >
            <i>{z.level >= step.level ? <Check size={13} /> : step.level}</i>
            <span>{step.label}</span>
            <small>{step.when}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Caregiver settings card: radius and ladder timing. */
export function SafeZoneSettings() {
  const z = useZone();
  const s = useStore();
  return (
    <section className="card settings-card safe-zone-settings">
      <h2>
        <House size={18} /> Safe zone around home
      </h2>
      <p>
        When the wearer goes beyond this radius the watch vibrates and offers to
        guide them home. If they don't come back, the ladder below runs in
        simulated minutes. It pauses while they are being guided. Simulation
        only: no real GPS, calls or dispatch.
      </p>
      <ZoneMap />
      <div className="zone-fields">
        <label>
          Notify {s.settings.caregiver} after (simulated minutes)
          <input
            type="number"
            min={1}
            value={z.notifyPrimaryMin}
            onChange={(e) =>
              z.setSettings({ notifyPrimaryMin: Number(e.target.value) })
            }
          />
        </label>
        <label>
          SMS and call {s.settings.emergency} after
          <input
            type="number"
            min={2}
            value={z.callSecondaryMin}
            onChange={(e) =>
              z.setSettings({ callSecondaryMin: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Simulated emergency step after
          <input
            type="number"
            min={3}
            value={z.emergencyMin}
            onChange={(e) =>
              z.setSettings({ emergencyMin: Number(e.target.value) })
            }
          />
        </label>
      </div>
    </section>
  );
}
