import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { talkMomoState } from "../src/components/Momo";

describe("Momo Talk face", () => {
  it("shows the speaking face while Momo has the floor", () => {
    expect(talkMomoState(false, true)).toBe("speaking");
    expect(talkMomoState(true, true)).toBe("speaking");
  });

  it("shows the listening face when the mic is on", () => {
    expect(talkMomoState(true, false)).toBe("listening");
  });

  it("rests at idle when neither is active", () => {
    expect(talkMomoState(false, false)).toBe("idle");
  });
});

describe("Momo SVG states", () => {
  const states = [
    "idle",
    "listening",
    "speaking",
    "happy",
    "concerned",
  ] as const;
  const palette = [
    "#28483b",
    "#7d9f72",
    "#a8bfa0",
    "#557b51",
    "#b9d0a2",
    "#e8b7a4",
  ];

  for (const state of states) {
    it(`${state}.svg matches the sprout canvas and palette`, () => {
      const svg = readFileSync(
        resolve(
          process.cwd(),
          "public",
          "images",
          `momo-${state}.svg`,
        ),
        "utf8",
      );
      expect(svg).toContain('viewBox="0 0 240 230"');
      expect(svg).not.toContain("<text");
      for (const colour of palette)
        expect(svg.toLowerCase()).toContain(colour.toLowerCase());
      // A small round mouth/eye/brow stays legible at 80px; no hairline detail.
      expect(svg).not.toContain('stroke-width="1"');
    });
  }

  it("only uses the five drawn states", () => {
    expect(states).toEqual([
      "idle",
      "listening",
      "speaking",
      "happy",
      "concerned",
    ]);
  });
});
