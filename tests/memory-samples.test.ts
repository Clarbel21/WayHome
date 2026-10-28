import { beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { useStore } from "../src/store";
import {
  sampleEntries,
  sampleEntriesV2,
  sampleEntriesV3,
  useMemory,
} from "../src/memory/store";
import { parseBackup } from "../src/memory/backup";

const all = [...sampleEntries, ...sampleEntriesV2, ...sampleEntriesV3];

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  useMemory.setState({
    entries: all,
    session: null,
    stage: "invite",
    growth: [],
    history: [],
  });
});

describe("Familiar Faces and Music Memories samples", () => {
  it("ships at least 10 realistic faces, each with a portrait and a relationship", () => {
    const faces = sampleEntriesV3.filter((e) => e.kind === "faces");
    expect(faces.length).toBeGreaterThanOrEqual(10);
    for (const f of faces) {
      expect(f.relationship).toBeTruthy();
      expect(f.description.length).toBeGreaterThan(40);
      expect(existsSync(`public${f.image}`)).toBe(true);
    }
    expect(new Set(faces.map((f) => f.title)).size).toBe(faces.length);
  });

  it("ships at least 10 real songs with an artist, without audio or lyrics", () => {
    const songs = sampleEntriesV3.filter((e) => e.kind === "music");
    expect(songs.length).toBeGreaterThanOrEqual(10);
    for (const s of songs) {
      expect(s.artist).toBeTruthy();
      expect(s.artist).not.toMatch(/sample suggestion/i);
      expect(s.audio).toBeFalsy();
    }
  });

  it("offers the realistic samples before the early placeholders", () => {
    expect(useMemory.getState().start("faces")).toBe(true);
    expect(useMemory.getState().session?.entryId).toBe("sample-jamie");
    useMemory.getState().exit();
    expect(useMemory.getState().start("music")).toBe(true);
    expect(useMemory.getState().session?.entryId).toBe("sample-song-moon");
  });

  it("every sample survives a backup round trip (images are whitelisted)", () => {
    const parsed = parseBackup({
      format: "wayhome-memory-library",
      version: 1,
      entries: all,
      media: {},
    });
    expect(parsed.entries).toHaveLength(all.length);
  });
});
