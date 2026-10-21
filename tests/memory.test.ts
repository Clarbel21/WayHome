import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../src/store";
import { sampleEntries, useMemory } from "../src/memory/store";
import { parseBackup } from "../src/memory/backup";
beforeEach(() => {
  useStore.getState().reset();
  useMemory.setState({
    entries: sampleEntries,
    session: null,
    stage: "invite",
    growth: [],
    history: [],
    preferences: useMemory.getInitialState().preferences,
  });
});
describe("Memory Garden is optional and safety-gated", () => {
  it("never selects or reveals unapproved or deleted content", () => {
    const m = useMemory.getState();
    m.saveEntry({ ...sampleEntries[0], approved: false });
    expect(m.start("faces")).toBe(false);
    expect(useMemory.getState().session).toBeNull();
    m.saveEntry(sampleEntries[0]);
    expect(m.start("faces")).toBe(true);
    m.deleteEntry(sampleEntries[0].id);
    m.respond("Tell me more");
    expect(useMemory.getState().growth).toHaveLength(0);
    expect(useMemory.getState().session?.revealed).toBe(false);
  });
  it("grows once per interaction and never removes growth on skips or exit", () => {
    const m = useMemory.getState();
    m.start("faces");
    expect(useMemory.getState().session?.revealed).toBe(false);
    m.respond("Not sure");
    m.respond("Tell me more");
    expect(useMemory.getState().growth).toEqual(["flower"]);
    m.home();
    m.start("places");
    m.skip();
    m.start("garden");
    m.complete("tree");
    m.exit();
    expect(useMemory.getState().growth).toEqual(["flower", "tree"]);
    expect(
      useMemory.getState().history.some((h) => h.action === "skipped"),
    ).toBe(true);
  });
  it("allows a personally familiar routine order with no scoring", () => {
    const m = useMemory.getState();
    m.start("routine");
    m.selectStep(2);
    m.selectStep(2);
    m.complete();
    expect(useMemory.getState().growth).toHaveLength(0);
    m.selectStep(0);
    m.selectStep(1);
    m.complete();
    expect(useMemory.getState().session?.order).toEqual([2, 0, 1]);
    expect(useMemory.getState().session?.completed).toBe(true);
  });
  it("pauses on every non-normal state and cannot complete or resume during S5", () => {
    const m = useMemory.getState();
    const s = useStore.getState();
    m.start("routine");
    m.selectStep(1);
    s.event("GUIDE");
    expect(useMemory.getState().session?.paused).toBe(true);
    expect(useMemory.getState().session?.order).toEqual([1]);
    s.event("SOS");
    m.complete();
    m.respond("Yes");
    m.resume();
    expect(useStore.getState().mode).toBe("EMERGENCY_SIMULATED");
    expect(useMemory.getState().growth).toHaveLength(0);
    expect(m.start("faces")).toBe(false);
    s.resetEmergency();
    m.resume();
    expect(useMemory.getState().session?.order).toEqual([1]);
    expect(useMemory.getState().session?.paused).toBe(false);
  });
  it("rotates through approved content and saves preferences without changing safety", () => {
    const m = useMemory.getState();
    m.saveEntry({
      ...sampleEntries[0],
      id: "another",
      title: "Another person",
    });
    m.start("faces");
    expect(useMemory.getState().session?.entryId).toBe("sample-mei");
    m.home();
    m.start("faces");
    expect(useMemory.getState().session?.entryId).toBe("another");
    m.setPreferences({ sound: true, preferred: ["music"], duration: "short" });
    expect(useMemory.getState().preferences.preferred).toEqual(["music"]);
    expect(useStore.getState().mode).toBe("NORMAL");
  });
  it("validates backup schema and rejects remote image URLs or arbitrary media", () => {
    const backup = {
      format: "wayhome-memory-library",
      version: 1,
      entries: sampleEntries,
      media: {},
    };
    expect(parseBackup(backup).entries).toHaveLength(4);
    expect(() => parseBackup({ entries: [] })).toThrow();
    expect(() =>
      parseBackup({
        ...backup,
        entries: [{ ...sampleEntries[3], steps: ["One"] }],
      }),
    ).toThrow();
    expect(() =>
      parseBackup({
        ...backup,
        media: { bad: "data:text/html;base64,PHNjcmlwdD4=" },
      }),
    ).toThrow();
    expect(
      parseBackup({
        ...backup,
        entries: [
          { ...sampleEntries[0], image: "https://example.com/tracker.jpg" },
        ],
      }).entries[0].image,
    ).toBeUndefined();
  });
});
