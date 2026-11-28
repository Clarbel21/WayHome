import { describe, expect, it } from "vitest";
import { translate } from "../src/i18n";
import { initialFamily } from "../src/store";
import { landmarkQuizDeck, type GameTranslator } from "../src/game/landmarks";
import { familyQuizDeck } from "../src/game/faces";

const t: GameTranslator = (key, vars) =>
  translate("en", key as Parameters<typeof translate>[1], vars);

const deck = landmarkQuizDeck(t);

describe("Game lane G1 — familiar landmarks", () => {
  it("uses the four built-in landmark photos in walk order", () => {
    expect(deck.id).toBe("landmarks");
    expect(deck.cards.map((card) => card.id)).toEqual([
      "garden",
      "bakery",
      "library",
      "home",
    ]);
    expect(deck.cards.map((card) => card.photo)).toEqual([
      "/images/quiz-garden.svg",
      "/images/quiz-bakery.svg",
      "/images/quiz-library.svg",
      "/images/quiz-home.svg",
    ]);
  });

  it("offers exactly two big name choices per round, answer included", () => {
    for (const card of deck.cards) {
      expect(card.choices).toHaveLength(2);
      expect(new Set(card.choices).size).toBe(2);
      expect(card.choices).toContain(card.answer);
    }
    // The correct side alternates; the wearer cannot answer by position.
    expect(deck.cards.map((card) => card.choices[0] === card.answer)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("keeps feedback gentle and finishes in four rounds", () => {
    expect(deck.round(1, 4)).toBe("Round 1 of 4");
    expect(deck.right("bakery")).toBe("Yes! That's the bakery.");
    expect(deck.learn("library")).toBe("That's the library. Next one?");
    expect(deck.next).toBe("Next");
    expect(deck.finished).toBe("Well done!");
    expect(deck.back).toBe("Back to home");
    const visible = [
      deck.prompt,
      deck.finished,
      deck.back,
      ...deck.cards.flatMap((card) => [card.answer, ...card.choices]),
    ].join(" ");
    expect(visible).not.toMatch(/wrong/i);
  });
});

describe("Game lane G2 — familiar faces", () => {
  const faces = familyQuizDeck(t, initialFamily)!;

  it("uses the family list and illustrated faces, not real photos", () => {
    expect(faces.id).toBe("faces");
    expect(faces.cards.map((card) => card.answer)).toEqual([
      "Jamie",
      "Sam",
      "Mei",
      "Jamie",
    ]);
    expect(faces.cards.map((card) => card.photo)).toEqual([
      "/images/quiz-face-jamie.svg",
      "/images/quiz-face-sam.svg",
      "/images/quiz-face-mei.svg",
      "/images/quiz-face-jamie.svg",
    ]);
    // The repeat round pairs Jamie with a different person.
    expect(faces.cards[3].choices).toEqual(["Mei", "Jamie"]);
  });

  it("offers two big name choices and alternates the correct side", () => {
    for (const card of faces.cards) {
      expect(card.choices).toHaveLength(2);
      expect(new Set(card.choices).size).toBe(2);
      expect(card.choices).toContain(card.answer);
    }
    expect(faces.cards.map((card) => card.choices[0] === card.answer)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("keeps feedback gentle and skips a deck with too few people", () => {
    expect(faces.prompt).toBe("Who is this?");
    expect(faces.right("Jamie")).toBe("Yes! That's Jamie.");
    expect(faces.learn("Sam")).toBe("That's Sam. Next one?");
    expect(faces.finished).toBe("Well done!");
    expect(faces.back).toBe("Back to home");
    const visible = [
      faces.prompt,
      faces.finished,
      faces.back,
      ...faces.cards.flatMap((card) => [card.answer, ...card.choices]),
    ].join(" ");
    expect(visible).not.toMatch(/wrong|the (Jamie|Sam|Mei)/i);
    expect(familyQuizDeck(t, initialFamily.slice(0, 1))).toBeNull();
  });
});
