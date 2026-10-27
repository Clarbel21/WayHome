import { describe, expect, it } from "vitest";
import { messages, type Mode } from "../src/store";
import { modeMessage, noteText, translate, timeAgo } from "../src/i18n";

const modes: Mode[] = [
  "NORMAL",
  "CHECK_IN",
  "GUIDED_RETURN",
  "REORIENTATION",
  "CAREGIVER_HANDOVER",
  "EMERGENCY_SIMULATED",
];

describe("language layer", () => {
  it("English companion speech is identical to the store's messages", () => {
    for (const mode of modes)
      expect(modeMessage("en", mode, "Buddy")).toBe(messages("Buddy")[mode]);
  });
  it("Indonesian speech exists for every mode and keeps the companion name", () => {
    for (const mode of modes) {
      const text = modeMessage("id", mode, "Buddy");
      expect(text).toBeTruthy();
      expect(text).not.toBe(messages("Buddy")[mode]);
    }
    expect(modeMessage("id", "NORMAL", "Buddy")).toContain("Buddy");
  });
  it("fills placeholders and falls back to English for unknown notes", () => {
    expect(translate("en", "stopOf", { n: 2, total: 4 })).toBe("Stop 2 of 4");
    expect(translate("id", "stopOf", { n: 2, total: 4 })).toBe(
      "Tempat 2 dari 4",
    );
    expect(noteText("id", "An unknown caregiver note")).toBe(
      "An unknown caregiver note",
    );
    expect(noteText("en", "Let's take one step together.")).toBe(
      "Let's take one step together.",
    );
    expect(noteText("id", "Let's take one step together.")).toBe(
      "Ayo satu langkah bersama.",
    );
  });
  it("formats relative update times", () => {
    const now = 1_000_000_000;
    expect(timeAgo("en", now - 10_000, now)).toBe("just now");
    expect(timeAgo("en", now - 5 * 60_000, now)).toBe("5 min ago");
    expect(timeAgo("id", now - 5 * 60_000, now)).toBe("5 mnt lalu");
  });
});
