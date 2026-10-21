import { motion } from "framer-motion";
import { useStore } from "../store";
export function Sprout({ small = false }: { small?: boolean }) {
  const mode = useStore((s) => s.mode);
  const reduced = useStore((s) => s.settings.reducedMotion);
  const worried = ["CHECK_IN", "REORIENTATION", "EMERGENCY_SIMULATED"].includes(
    mode,
  );
  return (
    <motion.svg
      role="img"
      aria-label={`Sprout looks ${worried ? "concerned and reassuring" : "happy"}`}
      className={small ? "sprout small" : "sprout"}
      viewBox="0 0 240 230"
      animate={reduced ? {} : { y: [0, -7, 0], rotate: [-2, 2, -2] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    >
      <ellipse cx="120" cy="211" rx="62" ry="9" fill="#28483b" opacity=".08" />
      <path d="M121 85C80 90 63 63 64 38C97 31 123 46 121 85Z" fill="#7d9f72" />
      <path
        d="M119 91C111 53 140 25 177 29C180 63 154 88 119 91Z"
        fill="#a8bfa0"
      />
      <path
        d="M120 102V65"
        stroke="#557b51"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M48 152C48 100 77 80 120 80S192 101 192 152C192 192 159 207 120 207S48 192 48 152Z"
        fill="#b9d0a2"
      />
      <ellipse cx="77" cy="160" rx="15" ry="9" fill="#e8b7a4" opacity=".75" />
      <ellipse cx="163" cy="160" rx="15" ry="9" fill="#e8b7a4" opacity=".75" />
      <g className={reduced ? "" : "eyes"} fill="#28483b">
        <ellipse cx="92" cy="140" rx="5" ry="8" />
        <ellipse cx="148" cy="140" rx="5" ry="8" />
      </g>
      <path
        d={worried ? "M108 169Q120 160 132 169" : "M105 164Q120 181 135 164"}
        fill="none"
        stroke="#28483b"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {worried && (
        <path
          d="M83 120L97 124M143 124L157 120"
          stroke="#28483b"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </motion.svg>
  );
}
