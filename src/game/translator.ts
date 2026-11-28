/** Text keys the reusable quiz decks need; the i18n hook satisfies this shape. */
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
    | "gameNameHome"
    | "gamePickTitle"
    | "gamePickPlaces"
    | "gamePickFaces"
    | "gameWhichPerson"
    | "gameFaceAlt"
    | "gameYesPerson"
    | "gameLearnPerson",
  vars?: Record<string, string | number>,
) => string;
