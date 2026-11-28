import { describe, expect, it } from "vitest";
import { translate } from "../src/i18n";
import { landmarkQuizDeck, type GameTranslator } from "../src/game/landmarks";

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
