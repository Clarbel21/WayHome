import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStore } from "../store";
export const points: L.LatLngTuple[] = [
  [1.3015, 103.819],
  [1.3024, 103.8198],
  [1.3034, 103.8202],
  [1.304, 103.8213],
  [1.3035, 103.8225],
  [1.3025, 103.8231],
  [1.3018, 103.8236],
];
export function RouteMap() {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const s = useStore();
  const [fallback, setFallback] = useState(false);
  const approved = s.landmarks.filter((l) => l.approved);
  useEffect(() => {
    if (!ref.current || fallback) return;
    let live = true;
    const m = L.map(ref.current, { scrollWheelZoom: false }).setView(
      points[3],
      16,
    );
    map.current = m;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    })
      .on("tileerror", () => {
        if (live) setFallback(true);
      })
      .addTo(m);
    L.polyline(points, { color: "#63846a", weight: 5, dashArray: "8 8" }).addTo(
      m,
    );
    const icon = (text: string, kind: string) =>
      L.divIcon({
        className: `map-pin ${kind}`,
        html: text,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
    L.marker(points[6], { icon: icon("⌂", "home-pin") })
      .addTo(m)
      .bindPopup("Home · sample location");
    approved.forEach((l, i) =>
      L.marker(points[Math.min(5, i + 1)], { icon: icon("•", "landmark-pin") })
        .addTo(m)
        .bindPopup(
          Object.assign(document.createElement("span"), {
            textContent: l.name,
          }),
        ),
    );
    marker.current = L.marker(points[Math.round(s.position)], {
      icon: icon("A", "wearer-pin"),
    })
      .addTo(m)
      .bindPopup("Simulated wearer location");
    m.fitBounds(L.latLngBounds(points), { padding: [45, 45] });
    return () => {
      live = false;
      m.remove();
      map.current = null;
    };
  }, [fallback, s.landmarks]);
  useEffect(() => {
    marker.current?.setLatLng(points[Math.round(s.position)]);
  }, [s.position]);
  return (
    <>
      <div className="map-wrap">
        {fallback ? (
          <div className="fallback-map">
            <svg
              viewBox="0 0 600 280"
              role="img"
              aria-label="Offline sample route"
            >
              <path
                d="M30 200L120 130L220 160L310 60L400 100L470 170L560 110"
                fill="none"
                stroke="#7a967b"
                strokeWidth="8"
                strokeDasharray="12 8"
              />
              {[
                [30, 200],
                [120, 130],
                [220, 160],
                [310, 60],
                [400, 100],
                [470, 170],
                [560, 110],
              ].map(([x, y], i) => (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={i === s.position ? 18 : 10}
                    fill={i === s.position ? "#28483b" : "#a8bfa0"}
                  />
                  {i === s.position && (
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize="14"
                    >
                      A
                    </text>
                  )}
                </g>
              ))}
              <text x="530" y="80" fill="#28483b">
                Home
              </text>
            </svg>
            <span>Offline route · simulated neighborhood</span>
            <div className="offline-landmarks">
              {approved.map((l) => (
                <span key={l.id}>• {l.name}</span>
              ))}
            </div>
          </div>
        ) : (
          <div ref={ref} className="leaflet-map" />
        )}
        <div className="map-caption">
          <span className="live-dot" /> Sample route ·{" "}
          {Math.round(s.signals.gpsConfidence * 100)}% GPS confidence · no real
          GPS
        </div>
      </div>
      <div className="route-bottom">
        <div>
          <strong>
            {s.position === 6
              ? "Arrived home"
              : `${6 - s.position} steps from home`}
          </strong>
          <p>
            {Math.round((s.position / 6) * 100)}% of simulated route complete
          </p>
        </div>
        <div className="button-row">
          <button
            className="button small-button"
            disabled={
              s.position === 6 ||
              !s.connected ||
              !s.worn ||
              s.mode === "EMERGENCY_SIMULATED" ||
              s.signals.gpsConfidence < 0.6
            }
            onClick={s.move}
          >
            Move one step
          </button>
          <button
            className="icon-button"
            aria-label="Reset route"
            disabled={s.mode === "EMERGENCY_SIMULATED"}
            title={
              s.mode === "EMERGENCY_SIMULATED"
                ? "Resolve SOS before resetting the route"
                : "Reset simulated route"
            }
            onClick={s.resetRoute}
          >
            ↺
          </button>
          <button
            className="text-button"
            onClick={() => setFallback(!fallback)}
          >
            {fallback ? "Try map" : "Offline view"}
          </button>
        </div>
      </div>
      <div className="progress-track">
        <div style={{ width: `${(s.position / 6) * 100}%` }} />
      </div>
    </>
  );
}
