import { useState } from "react";
import { Photo } from "../components/Photo";

/**
 * Reusable watch quiz shell (Game lane). G1 feeds it landmark photos; G2
 * family faces and G3 happy places reuse it without changing this component.
 * One card is on screen at a time: photo, two name buttons, calm feedback,
 * then a short finish. The shell owns no safety or store logic.
 */
export interface PhotoQuizCard {
  id: string;
  /** Built-in photo path or a caregiver-supplied media URL. */
  photo: string;
  /** The name the wearer should learn; shown in the gentle feedback line. */
  answer: string;
  /** Exactly two big name choices, answer included. */
  choices: readonly [string, string];
  /** Optional short family memory, shown under the reply after answering. */
  memory?: string;
}

export interface PhotoQuizDeck {
  id: string;
  cards: readonly PhotoQuizCard[];
  prompt: string;
  photoAlt: string;
  round: (n: number, total: number) => string;
  right: (name: string) => string;
  learn: (name: string) => string;
  next: string;
  finished: string;
  back: string;
}

export function PhotoQuiz({
  deck,
  onExit,
}: {
  deck: PhotoQuizDeck;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const done = index >= deck.cards.length;
  const card = deck.cards[index];
  const correct = picked !== null && picked === card?.answer;
  // Game answers are practice, not care actions: don't notify the caregiver.
  const quiet = { "data-caregiver-skip-notification": "true" } as const;

  const advance = () => {
    setPicked(null);
    setIndex((n) => n + 1);
  };

  if (done)
    return (
      <div className="wos-game wos-game-done" data-phase="done">
        <span className="wos-game-badge" aria-hidden="true">
          🌟
        </span>
        <strong className="wos-game-done-text" role="status">
          {deck.finished}
        </strong>
        <button
          type="button"
          className="wos-game-back wos-game-back-main"
          onClick={onExit}
          {...quiet}
        >
          {deck.back}
        </button>
      </div>
    );

  if (picked !== null)
    return (
      <div
        className="wos-game wos-game-feedback"
        data-phase="feedback"
        data-result={correct ? "right" : "gentle"}
      >
        <span className="wos-game-round">
          {deck.round(index + 1, deck.cards.length)}
        </span>
        <div className="wos-game-photo">
          <Photo src={card.photo} alt={deck.photoAlt} />
        </div>
        <p
          className={`wos-game-result${
            card.memory ? " wos-game-result-with-memory" : ""
          }`}
          role="status"
        >
          <span className="wos-game-reply">
            {correct ? deck.right(card.answer) : deck.learn(card.answer)}
          </span>
          {card.memory && (
            <span className="wos-game-memory">{card.memory}</span>
          )}
        </p>
        <button
          type="button"
          className="wos-game-next"
          onClick={advance}
          {...quiet}
        >
          {deck.next}
        </button>
        <button
          type="button"
          className="wos-game-back"
          onClick={onExit}
          {...quiet}
        >
          {deck.back}
        </button>
      </div>
    );

  return (
    <div className="wos-game wos-game-question" data-phase="question">
      <span className="wos-game-round">
        {deck.round(index + 1, deck.cards.length)}
      </span>
      <div className="wos-game-photo">
        <Photo src={card.photo} alt={deck.photoAlt} />
      </div>
      <p className="wos-game-prompt">{deck.prompt}</p>
      <div className="wos-game-choices">
        {card.choices.map((choice) => (
          <button
            type="button"
            className="wos-game-choice"
            key={choice}
            onClick={() => setPicked(choice)}
            {...quiet}
          >
            {choice}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="wos-game-back"
        onClick={onExit}
        {...quiet}
      >
        {deck.back}
      </button>
    </div>
  );
}
