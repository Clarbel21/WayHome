import { useStore } from "../store";
import { useLang } from "../i18n";
import "../design/sprout.css";

/** One SVG family; reassurance is authored and never changes request state. */
export function Sprout({ small = false }: { small?: boolean }) {
  const name = useStore((s) => s.settings.companionName);
  const mode = useStore((s) => s.mode);
  const reduced = useStore((s) => s.settings.reducedMotion);
  const id = useLang((s) => s.lang) === "id";
  const expression =
    mode === "NORMAL"
      ? "calm"
      : mode === "GUIDED_RETURN"
        ? "attentive"
        : "reassuring";
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label={id ? `${name} tampak tenang` : `${name} looks ${expression}`}
      className={`sprout sprout-svg ${small ? "small" : ""} ${reduced ? "is-still" : ""}`}
      data-expression={expression}
    >
      <g className="sprout-figure">
        <path
          d="M48 30V17"
          fill="none"
          stroke="#245D4B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M47 23C32 25 25 17 24 8c13-1 24 5 23 15Z" fill="#83AA80" />
        <path d="M49 21C49 10 59 5 71 7c-2 11-9 17-22 14Z" fill="#245D4B" />
        <path
          d="M29 71c-10 0-15-7-15-13 10-1 17 3 20 10m33 3c10 0 15-7 15-13-10-1-17 3-20 10"
          fill="#83AA80"
        />
        <path d="M29 66h38v16c0 7-38 7-38 0Z" fill="#245D4B" />
        <rect
          x="20"
          y="27"
          width="56"
          height="48"
          rx="23"
          fill="#F2DDC1"
          stroke="#245D4B"
          strokeWidth="2"
        />
        <g fill="#1D2A25">
          <circle cx="37" cy="49" r="3" />
          <circle cx="59" cy="49" r="3" />
        </g>
        <path
          d={expression === "attentive" ? "M43 60h10" : "M41 58q7 8 14 0"}
          fill="none"
          stroke="#245D4B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <g
          className="sprout-response"
          fill="none"
          stroke="#245D4B"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="m79 33 5-5m-1 13h6" />
        </g>
      </g>
    </svg>
  );
}
