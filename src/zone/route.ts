// One shared, simulated route home used by BOTH the watch (turn directions) and the
// caregiver phone (map). Each leg ends at an approved landmark; legs alternate east /
// south on a street grid so every landmark sits on a corner where the wearer turns.
// Screen coordinates (y grows downward), viewBox 300 x 190.

export type Turn = "straight" | "right" | "left";
export interface Pt {
  x: number;
  y: number;
}
export interface RoutePlan {
  points: Pt[]; // points[0] = start, points[i + 1] = end of leg i (landmark i)
  turns: Turn[]; // turn the wearer makes at the START of leg i
}

export const MAP_W = 300;
export const MAP_H = 190;

export function planRoute(legs: number): RoutePlan {
  const n = Math.max(1, legs);
  const east = Math.ceil(n / 2);
  const south = Math.floor(n / 2);
  const L = Math.min(220 / east, south ? 118 / south : 220, 96);
  const raw: Pt[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < n; i++) {
    const last = raw[i];
    raw.push(
      i % 2 === 0 ? { x: last.x + L, y: last.y } : { x: last.x, y: last.y + L },
    );
  }
  // Centre the route in the map.
  const w = east * L;
  const h = south * L;
  const ox = (MAP_W - w) / 2;
  const oy = (MAP_H - h) / 2 + 4;
  const points = raw.map((p) => ({ x: p.x + ox, y: p.y + oy }));
  // East then south = right turn; south then east = left turn.
  const turns: Turn[] = Array.from({ length: n }, (_, i) =>
    i === 0 ? "straight" : i % 2 === 1 ? "right" : "left",
  );
  return { points, turns };
}

/** Position along the route for progress t in [0, 1] (0 = start, 1 = home). */
export function pointAt(plan: RoutePlan, t: number): Pt {
  const n = plan.points.length - 1;
  const clamped = Math.min(1, Math.max(0, t));
  const seg = Math.min(n - 1, Math.floor(clamped * n));
  const f = clamped * n - seg;
  const a = plan.points[seg];
  const b = plan.points[seg + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Polyline points string for the walked part of the route. */
export function walkedPath(plan: RoutePlan, t: number) {
  const n = plan.points.length - 1;
  const clamped = Math.min(1, Math.max(0, t));
  const seg = Math.min(n - 1, Math.floor(clamped * n));
  const pts = plan.points.slice(0, seg + 1);
  pts.push(pointAt(plan, clamped));
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function fullPath(plan: RoutePlan) {
  return plan.points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}
