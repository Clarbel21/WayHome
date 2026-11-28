import type { PhotoQuizCard, PhotoQuizDeck } from "./PhotoQuiz";

/** Text keys the quiz decks need; the shared i18n hook satisfies this shape. */
export type GameTranslator = (
  key:
    | "gameWhichPlace"
    | "gameRound"
    | "gameYes"
    | "gameLearn"
    | "gameNext"
    | "gameWellDone"
    | "gameBackHome"
    | "gamePhotoAlt"
    | "gameNameGarden"
    | "gameNameBakery"
    | "gameNameLibrary"
    | "gameNameHome",
  vars?: Record<string, string | number>,
) => string;

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
export function landmarkQuizDeck(t: GameTranslator): PhotoQuizDeck {
  const cards: PhotoQuizCard[] = IDS.map((id, i) => {
    const next = IDS[(i + 1) % IDS.length];
    const answer = t(NAME_KEY[id]);
    const distractor = t(NAME_KEY[next]);
    return {
      id,
      photo: BUILT_IN[id],
      answer,
      choices: i % 2 === 0 ? [answer, distractor] : [distractor, answer],
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
