/** The five static faces of Momo, drawn to match the animated sprout. */
export type MomoState =
  | "idle"
  | "listening"
  | "speaking"
  | "happy"
  | "concerned";

/** Talk has no extra buttons: her face follows the mic and her own voice. */
export function talkMomoState(
  listening: boolean,
  speaking: boolean,
): MomoState {
  if (speaking) return "speaking";
  if (listening) return "listening";
  return "idle";
}

export function Momo({
  state,
  className = "",
}: {
  state: MomoState;
  className?: string;
}) {
  return (
    <img
      className={`sprout momo momo-${state}${className ? ` ${className}` : ""}`}
      src={`${import.meta.env.BASE_URL}images/momo-${state}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
