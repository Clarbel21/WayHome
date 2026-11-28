// Fictional stations on a local demo grid, in metres. Each simulated route
// point is 80 m farther along the grid. These are straight-line distances.
const stations = [
  { name: "Garden District Police Station", along: 40, offset: 90 },
  { name: "Library District Police Station", along: 240, offset: 110 },
  { name: "Riverside Police Station", along: 460, offset: 75 },
];

export function nearestDemoPoliceStation(position: number) {
  const along = Math.min(6, Math.max(0, position)) * 80;
  return stations
    .map((station) => ({
      name: station.name,
      distance: Math.hypot(along - station.along, station.offset),
    }))
    .reduce((nearest, station) =>
      station.distance < nearest.distance ? station : nearest,
    );
}
