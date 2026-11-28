import type { GameCardEdit } from "../store";
import type { PhotoQuizCard, PhotoQuizDeck } from "./PhotoQuiz";
import type { GameTranslator } from "./translator";

// Kept here as a re-export so existing G1 tests and callers keep working.
export type { GameTranslator } from "./translator";

const IDS = ["garden", "bakery", "library", "home"] as const;
type LandmarkId = (typeof IDS)[number];

// The Home lane's four built-in drawings, copied without their baked-in
// name plaques so the quiz asks the wearer instead of giving the answer away.
// Same artwork, no firmware/photo pipeline changes; order matches the walk.
const BUILT_IN: Record<LandmarkId, string> = {
  garden: "/images/quiz-garden.svg",
  bakery: "/images/quiz-bakery.svg",
  library: "/images/quiz-library.svg",
  home: "/images/quiz-home.svg",
};

const MEMORY_KEY: Record<LandmarkId, Parameters<GameTranslator>[0]> = {
  garden: "gameMemoryGarden",
  bakery: "gameMemoryBakery",
  library: "gameMemoryLibrary",
  home: "gameMemoryHome",
};

const NAME_KEY: Record<LandmarkId, Parameters<GameTranslator>[0]> = {
  garden: "gameNameGarden",
  bakery: "gameNameBakery",
  library: "gameNameLibrary",
  home: "gameNameHome",
};

/**
 * G1 cards: every round shows one built-in landmark photo and two big names.
 * The distractor cycles to the next familiar place, and the correct side
 * alternates so the wearer cannot answer by position.
 */
export function landmarkQuizDeck(
  t: GameTranslator,
  edits: Record<string, GameCardEdit> = {},
): PhotoQuizDeck {
  const cards: PhotoQuizCard[] = IDS.map((id, i) => {
    const next = IDS[(i + 1) % IDS.length];
    const answer = t(NAME_KEY[id]);
    const distractor = t(NAME_KEY[next]);
    const edit = edits[id] ?? {};
    return {
      id,
      photo: BUILT_IN[id],
      photoId: edit.photoId,
      answer,
      choices: i % 2 === 0 ? [answer, distractor] : [distractor, answer],
      // G4 caregiver line first; the built-in line remains the fallback.
      memory: edit.memoryLine || t(MEMORY_KEY[id]),
    };
  });

  return {
    id: "landmarks",
    cards,
    prompt: t("gameWhichPlace"),
    photoAlt: t("gamePhotoAlt"),
    round: (n, total) => t("gameRound", { n, total }),
    right: (name) => t("gameYes", { name }),
    learn: (name) => t("gameLearn", { name }),
    next: t("gameNext"),
    finished: t("gameWellDone"),
    back: t("gameBackHome"),
  };
}
