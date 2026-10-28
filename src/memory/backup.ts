import { type MemoryEntry } from "./store";
import { blobData, getMedia, putMedia, removeMedia, validMedia } from "./media";
const images = [
  "/images/memory-family.svg",
  "/images/home.svg",
  "/images/garden.svg",
  "/images/bakery.svg",
  "/images/library.svg",
  "/images/memory-grandson.svg",
  "/images/memory-neighbour.svg",
  "/images/market.svg",
  "/images/kopi.svg",
  "/images/pharmacy.svg",
  "/images/busstop.svg",
  "/images/playground.svg",
  "/images/postoffice.svg",
  "/images/school.svg",
  "/images/fountain.svg",
  "/images/memory-jamie.svg",
  "/images/memory-morgan.svg",
  "/images/memory-lily.svg",
  "/images/memory-sarah.svg",
  "/images/memory-ahseng.svg",
  "/images/memory-siti.svg",
  "/images/memory-lim.svg",
  "/images/memory-kumar.svg",
  "/images/memory-priya.svg",
  "/images/memory-wong.svg",
];
export async function createBackup(
  entries: MemoryEntry[],
  includeMedia: boolean,
) {
  const media: Record<string, string> = {};
  if (includeMedia) {
    for (const entry of entries) {
      for (const id of [entry.imageId, entry.audioId])
        if (id && !media[id]) {
          const blob = await getMedia(id);
          if (!blob)
            throw Error(
              "A saved file is missing. Restore it before creating a complete media backup, or export metadata only.",
            );
          media[id] = await blobData(blob);
        }
    }
  }
  return {
    format: "wayhome-memory-library",
    version: 1,
    entries,
    media,
    includesMedia: includeMedia,
  };
}
function text(value: unknown, max: number, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw Error("The backup contains an invalid or missing text field.");
  return value.trim();
}
export function parseBackup(value: unknown): {
  entries: MemoryEntry[];
  media: Record<string, string>;
} {
  if (!value || typeof value !== "object")
    throw Error("Choose a WayHome memory backup.");
  const data = value as Record<string, unknown>;
  if (
    data.format !== "wayhome-memory-library" ||
    data.version !== 1 ||
    !Array.isArray(data.entries) ||
    data.entries.length > 200
  )
    throw Error(
      "This is not a supported WayHome backup (maximum 200 entries).",
    );
  const entries = data.entries.map((raw: unknown): MemoryEntry => {
    if (!raw || typeof raw !== "object") throw Error("Invalid memory entry.");
    const e = raw as Record<string, unknown>;
    if (
      !["faces", "places", "music", "routine"].includes(String(e.kind)) ||
      typeof e.approved !== "boolean" ||
      !Array.isArray(e.steps)
    )
      throw Error("Invalid memory type or approval.");
    const steps =
      e.kind === "routine" ? e.steps.map((step) => text(step, 80, true)) : [];
    if (e.kind === "routine" && steps.length !== 3)
      throw Error("Routines need exactly three steps.");
    return {
      id: text(e.id, 100, true),
      kind: e.kind as MemoryEntry["kind"],
      title: text(e.title, 80, true),
      relationship: text(e.relationship, 80),
      description: text(e.description, 500),
      artist: text(e.artist, 120),
      steps,
      approved: e.approved,
      sample: e.sample === true,
      image:
        typeof e.image === "string" && images.includes(e.image)
          ? e.image
          : undefined,
      imageId: e.imageId === undefined ? undefined : text(e.imageId, 100, true),
      audioId: e.audioId === undefined ? undefined : text(e.audioId, 100, true),
    };
  });
  const media: Record<string, string> = {};
  if (data.media !== undefined) {
    if (
      !data.media ||
      typeof data.media !== "object" ||
      Array.isArray(data.media)
    )
      throw Error("Invalid media backup.");
    for (const [key, val] of Object.entries(data.media)) {
      if (
        typeof val !== "string" ||
        val.length > 30 * 1024 * 1024 ||
        !/^data:(image\/(png|jpeg|webp|gif)|audio\/(mpeg|wav|x-wav|ogg|mp4|webm|flac|x-m4a));base64,/.test(
          val,
        )
      )
        throw Error("Unsupported media in backup.");
      media[key] = val;
    }
  }
  return { entries, media };
}
export async function restoreBackup(value: unknown) {
  const parsed = parseBackup(value);
  const created: string[] = [];
  try {
    const result: MemoryEntry[] = [];
    for (const entry of parsed.entries) {
      const restored = { ...entry, id: crypto.randomUUID() };
      for (const kind of ["image", "audio"] as const) {
        const old = kind === "image" ? entry.imageId : entry.audioId;
        if (!old) continue;
        const encoded = parsed.media[old];
        if (encoded) {
          const [header, body] = encoded.split(",");
          const binary = atob(body);
          const blob = new Blob(
            [Uint8Array.from(binary, (c) => c.charCodeAt(0))],
            { type: header.slice(5, -7) },
          );
          validMedia(blob, kind);
          const id = crypto.randomUUID();
          await putMedia(id, blob);
          created.push(id);
          if (kind === "image") restored.imageId = id;
          else restored.audioId = id;
        } else {
          if (kind === "image") restored.imageId = undefined;
          else restored.audioId = undefined;
        }
      }
      result.push(restored);
    }
    return result;
  } catch (error) {
    await Promise.allSettled(created.map((id) => removeMedia(id)));
    throw error;
  }
}
