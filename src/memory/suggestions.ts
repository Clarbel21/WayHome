import {
  type ActivityKind,
  type Preferences,
  type MemoryEntry,
  type Engagement,
  activityNames,
  kinds,
} from "./store";
export function suggestActivity(
  entries: MemoryEntry[],
  preferences: Preferences,
  history: Engagement[],
) {
  const allowed = preferences.preferred.length ? preferences.preferred : kinds;
  const candidates = allowed.filter(
    (kind) =>
      kind === "garden" || entries.some((e) => e.kind === kind && e.approved),
  );
  if (!candidates.length) return null;
  const recent = history.find((h) =>
    ["selected", "completed", "skipped"].includes(h.action),
  );
  const words = preferences.music
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2);
  const song = entries.find(
    (e) =>
      e.kind === "music" &&
      e.approved &&
      words.some((w) =>
        `${e.title} ${e.artist} ${e.description}`
          .toLocaleLowerCase()
          .includes(w),
      ),
  );
  if (song && candidates.includes("music") && recent?.kind !== "music")
    return {
      kind: "music" as ActivityKind,
      entryId: song.id,
      reason:
        "This approved song matches your caregiver’s music preferences. Only play it if you want to.",
    };
  const previous = history.find(
    (h) =>
      h.action === "completed" &&
      h.kind !== recent?.kind &&
      candidates.includes(h.kind),
  );
  const variety = candidates.filter((k) => k !== recent?.kind);
  const pool = variety.length ? variety : candidates;
  const kind =
    previous?.kind ??
    (preferences.duration === "short"
      ? pool.find((k) => ["faces", "places", "garden"].includes(k))
      : undefined) ??
    pool[0];
  const reason = previous
    ? "You have chosen this activity before. It is here if you would enjoy another moment."
    : recent?.action === "skipped"
      ? "Perhaps a different kind of memory would feel good. All activities remain optional."
      : preferences.duration === "short"
        ? "Your caregiver prefers a brief moment. Try one gentle interaction, with no timer."
        : `An optional ${activityNames[kind].toLocaleLowerCase()} moment from your caregiver’s activity choices.`;
  return { kind, entryId: undefined, reason };
}
