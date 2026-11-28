import { describe, expect, it } from "vitest";
import { translate } from "../src/i18n";
import { initialFamily } from "../src/store";
import { landmarkQuizDeck, type GameTranslator } from "../src/game/landmarks";
import { familyQuizDeck } from "../src/game/faces";
import { happyPlacesQuizDeck } from "../src/game/happyPlaces";

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
    expect(deck.learn("library")).toBe("That's the library.");
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
    expect(faces.learn("Sam")).toBe("That's Sam.");
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

describe("Game lane G3 — happy places", () => {
  const happy = happyPlacesQuizDeck(t);

  it("uses four illustrated places with one family memory each", () => {
    expect(happy.id).toBe("happy-places");
    expect(happy.cards.map((card) => card.id)).toEqual([
      "beach",
      "bench",
      "market",
      "kitchen",
    ]);
    expect(happy.cards.map((card) => card.photo)).toEqual([
      "/images/quiz-place-beach.svg",
      "/images/quiz-place-bench.svg",
      "/images/quiz-place-market.svg",
      "/images/quiz-place-kitchen.svg",
    ]);
    expect(happy.cards.map((card) => card.memory)).toEqual([
      "We swam here every summer.",
      "We watched ducks here.",
      "We bought fresh fruit here.",
      "We cooked together every Sunday.",
    ]);
    for (const card of happy.cards)
      expect(card.memory!.trim().split(/\s+/).length).toBeLessThanOrEqual(5);
  });

  it("offers two big choices per round and alternates the right side", () => {
    expect(happy.cards.map((card) => card.answer)).toEqual([
      "beach",
      "park bench",
      "old market",
      "family kitchen",
    ]);
    for (const card of happy.cards) {
      expect(card.choices).toHaveLength(2);
      expect(new Set(card.choices).size).toBe(2);
      expect(card.choices).toContain(card.answer);
    }
    expect(happy.cards.map((card) => card.choices[0] === card.answer)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("keeps the same gentle replies and never says wrong", () => {
    expect(happy.prompt).toBe("Which happy place?");
    expect(happy.photoAlt).toBe("A happy place");
    expect(happy.round(1, 4)).toBe("Round 1 of 4");
    expect(happy.right("beach")).toBe("Yes! That's the beach.");
    expect(happy.learn("old market")).toBe("That's the old market.");
    expect(happy.next).toBe("Next");
    expect(happy.finished).toBe("Well done!");
    expect(happy.back).toBe("Back to home");
    const visible = [
      happy.prompt,
      happy.finished,
      happy.back,
      ...happy.cards.flatMap((card) => [
        card.answer,
        ...card.choices,
        card.memory ?? "",
      ]),
    ].join(" ");
    expect(visible).not.toMatch(/wrong/i);
  });

  it("keeps Indonesian memories short too", () => {
    const id: GameTranslator = (key, vars) =>
      translate("id", key as Parameters<typeof translate>[1], vars);
    for (const card of happyPlacesQuizDeck(id).cards)
      expect(card.memory!.trim().split(/\s+/).length).toBeLessThanOrEqual(5);
  });
});

describe("Game lane G4 — caregiver edits", () => {
  it("uses edited names, lines and uploaded photos on the watch", () => {
    const people = initialFamily.map((c) =>
      c.id === "jamie"
        ? {
            ...c,
            name: "Jules",
            memoryLine: "We bake together.",
            photoId: "jamie-photo",
          }
        : c,
    );
    const faces = familyQuizDeck(t, people)!;
    expect(faces.cards[0].answer).toBe("Jules");
    expect(faces.cards[0].photoId).toBe("jamie-photo");
    expect(faces.cards[0].memory).toBe("We bake together.");

    const places = landmarkQuizDeck(t, {
      bakery: { memoryLine: "Muffins on Fridays.", photoId: "bakery-photo" },
    });
    expect(places.cards[1].memory).toBe("Muffins on Fridays.");
    expect(places.cards[1].photoId).toBe("bakery-photo");

    const happy = happyPlacesQuizDeck(t, {
      beach: { memoryLine: "Sunset swims.", photoId: "beach-photo" },
    });
    expect(happy.cards[0].memory).toBe("Sunset swims.");
    expect(happy.cards[0].photoId).toBe("beach-photo");
  });

  it("falls back to built-in art and lines when an edit is empty", () => {
    const faces = familyQuizDeck(t, initialFamily)!;
    expect(faces.cards[0].answer).toBe("Jamie");
    expect(faces.cards[0].photoId).toBeUndefined();
    expect(faces.cards[0].memory).toBe("My daughter visits on Sundays.");

    const places = landmarkQuizDeck(t, {
      bakery: { memoryLine: "", photoId: undefined },
    });
    expect(places.cards[1].memory).toBe("I love their muffins.");
    expect(places.cards[1].photoId).toBeUndefined();

    const happy = happyPlacesQuizDeck(t, {
      beach: { memoryLine: "", photoId: undefined },
    });
    expect(happy.cards[0].memory).toBe("We swam here every summer.");
    expect(happy.cards[0].photoId).toBeUndefined();
  });
});
