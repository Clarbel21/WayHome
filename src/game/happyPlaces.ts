import type { PhotoQuizCard, PhotoQuizDeck } from "./PhotoQuiz";
import type { GameTranslator } from "./translator";

type NameKey =
  | "gameNameBeach"
  | "gameNameBench"
  | "gameNameMarket"
  | "gameNameKitchen";
type MemoryKey =
  | "gameMemoryBeach"
  | "gameMemoryBench"
  | "gameMemoryMarket"
  | "gameMemoryKitchen";

interface Place {
  id: string;
  photo: string;
  name: NameKey;
  memory: MemoryKey;
}

/**
 * G3 — happy places with family memories. Four built-in illustrations, no
 * baked-in labels, four rounds and two big choices. The gentle reply stays
 * the same as G1/G2; the short family line appears only after answering.
 * Web watch only: nothing here touches BLE or firmware.
 */
const PLACES: readonly Place[] = [
  {
    id: "beach",
    photo: "/images/quiz-place-beach.svg",
    name: "gameNameBeach",
    memory: "gameMemoryBeach",
  },
  {
    id: "bench",
    photo: "/images/quiz-place-bench.svg",
    name: "gameNameBench",
    memory: "gameMemoryBench",
  },
  {
    id: "market",
    photo: "/images/quiz-place-market.svg",
    name: "gameNameMarket",
    memory: "gameMemoryMarket",
  },
  {
    id: "kitchen",
    photo: "/images/quiz-place-kitchen.svg",
    name: "gameNameKitchen",
    memory: "gameMemoryKitchen",
  },
];

export function happyPlacesQuizDeck(t: GameTranslator): PhotoQuizDeck {
  const cards: PhotoQuizCard[] = PLACES.map((place, i) => {
    const next = PLACES[(i + 1) % PLACES.length];
    const answer = t(place.name);
    const distractor = t(next.name);
    return {
      id: place.id,
      photo: place.photo,
      answer,
      choices: i % 2 === 0 ? [answer, distractor] : [distractor, answer],
      memory: t(place.memory),
    };
  });

  return {
    id: "happy-places",
    cards,
    prompt: t("gameWhichHappyPlace"),
    photoAlt: t("gameHappyPhotoAlt"),
    round: (n, total) => t("gameRound", { n, total }),
    right: (name) => t("gameYes", { name }),
    learn: (name) => t("gameLearn", { name }),
    next: t("gameNext"),
    finished: t("gameWellDone"),
    back: t("gameBackHome"),
  };
}
