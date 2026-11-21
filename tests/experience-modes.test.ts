import { describe, expect, it } from "vitest";
import { EXPERIENCE_MODES, experienceModeOption } from "../src/experienceModes";

describe("experience mode vocabulary", () => {
  it("keeps one stable emoji for each wearer mode", () => {
    expect(EXPERIENCE_MODES).toEqual([
      { id: "normal", emoji: "🌿", name: "Normal" },
      { id: "focus", emoji: "🏠", name: "Focus" },
      { id: "dialogue", emoji: "💬", name: "Dialogue" },
    ]);
  });

  it("resolves the active mode for device interfaces", () => {
    expect(experienceModeOption("focus")).toMatchObject({ emoji: "🏠" });
  });
});
