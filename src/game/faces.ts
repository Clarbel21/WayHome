import type { FamilyContact } from "../store";
import type { PhotoQuizCard, PhotoQuizDeck } from "./PhotoQuiz";
import type { GameTranslator } from "./translator";

/**
 * G2 family faces. The names come from the same family list the Call lane
 * uses (src/store.ts → initialFamily), so the wearer practises the people
 * they can call. Until caregivers upload real photos, each contact gets a
 * simple illustrated face; nothing here touches Bluetooth or firmware.
 */
const FACE_ART: Record<string, string> = {
  jamie: "/images/quiz-face-jamie.svg",
  sam: "/images/quiz-face-sam.svg",
  mei: "/images/quiz-face-mei.svg",
};

// One short line about each person, shown after the answer (like G3).
const FACE_MEMORY: Record<string, Parameters<GameTranslator>[0]> = {
  jamie: "gameMemoryJamie",
  sam: "gameMemorySam",
  mei: "gameMemoryMei",
};

export function familyQuizDeck(
  t: GameTranslator,
  contacts: readonly FamilyContact[],
): PhotoQuizDeck | null {
  const people = contacts.filter((c) => FACE_ART[c.id]).slice(0, 3);
  if (people.length < 2) return null;

  const cards: PhotoQuizCard[] = Array.from({ length: 4 }, (_, i) => {
    const person = people[i % people.length];
    // With three people the fourth round repeats Jamie against Mei, so the
    // same pairing never appears twice. The correct side alternates.
    const lap = Math.floor(i / people.length);
    const distractor =
      people[(i + 1 + (people.length === 3 ? lap : 0)) % people.length];
    const answer = person.name;
    const other = distractor.name;
    return {
      id: `${person.id}-${i}`,
      photo: FACE_ART[person.id],
      photoId: person.photoId,
      answer,
      choices: i % 2 === 0 ? [answer, other] : [other, answer],
      memory:
        person.memoryLine ||
        (FACE_MEMORY[person.id] ? t(FACE_MEMORY[person.id]) : undefined),
    };
  });

  return {
    id: "faces",
    cards,
    prompt: t("gameWhichPerson"),
    photoAlt: t("gameFaceAlt"),
    round: (n, total) => t("gameRound", { n, total }),
    right: (name) => t("gameYesPerson", { name }),
    learn: (name) => t("gameLearnPerson", { name }),
    next: t("gameNext"),
    finished: t("gameWellDone"),
    back: t("gameBackHome"),
  };
}
