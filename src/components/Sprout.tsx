import { useStore } from "../store";

/** A scalable CSS character. Its slow breathing stops with reduced motion. */
export function Sprout({ small = false }: { small?: boolean }) {
  const name = useStore((s) => s.settings.companionName);
  const mode = useStore((s) => s.mode);
  const reduced = useStore((s) => s.settings.reducedMotion);
  const reassuring = mode !== "NORMAL" && mode !== "GUIDED_RETURN";
  return (
    <span
      role="img"
      aria-label={
        name + " looks " + (reassuring ? "calm and reassuring" : "happy")
      }
      className={[
        "sprout sprout-css",
        small ? "small" : "",
        reduced ? "is-still" : "",
        reassuring ? "is-reassuring" : "",
      ].join(" ")}
    >
      <span className="sprout-shadow" />
      <span className="sprout-figure" aria-hidden="true">
        <span className="sprout-stem" />
        <span className="sprout-leaf sprout-leaf-left" />
        <span className="sprout-leaf sprout-leaf-right" />
        <span className="sprout-body" />
        <span className="sprout-arm sprout-arm-left" />
        <span className="sprout-arm sprout-arm-right" />
        <span className="sprout-face">
          <span className="sprout-eye left" />
          <span className="sprout-eye right" />
          <span className="sprout-cheek left" />
          <span className="sprout-cheek right" />
          <span className="sprout-smile" />
        </span>
      </span>
      <span className="sprout-love" aria-hidden="true">
        ♥
      </span>
    </span>
  );
}
