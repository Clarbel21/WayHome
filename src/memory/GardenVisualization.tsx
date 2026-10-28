import { useMemory } from "./store";

type Plant = "flower" | "leaf" | "butterfly" | "tree";
const petals = ["#f2a7b4", "#f6c86b", "#c9b3ef", "#f5f0e6", "#f19a7d"];

function PlantShape({ plant, i }: { plant: Plant; i: number }) {
  const c = petals[i % petals.length];
  if (plant === "tree")
    return (
      <g>
        <rect x="-3" y="-6" width="6" height="26" rx="2" fill="#7a6248" />
        <circle cx="0" cy="-16" r="17" fill="#5f8d5f" />
        <circle cx="-9" cy="-8" r="10" fill="#6f9e6a" />
        <circle cx="10" cy="-9" r="11" fill="#6f9e6a" />
      </g>
    );
  if (plant === "butterfly")
    return (
      <g>
        <ellipse cx="-7" cy="-4" rx="7" ry="9" fill="#e8a0c8" />
        <ellipse cx="7" cy="-4" rx="7" ry="9" fill="#9fc3ec" />
        <ellipse cx="-5" cy="7" rx="5" ry="6" fill="#f2c2dc" />
        <ellipse cx="5" cy="7" rx="5" ry="6" fill="#c3dcf4" />
        <rect x="-1.2" y="-9" width="2.4" height="20" rx="1.2" fill="#4a3a2a" />
      </g>
    );
  if (plant === "leaf")
    return (
      <g>
        <path d="M0 18V-2" stroke="#4f7a4d" strokeWidth="2.5" />
        <path d="M0 4C-14 0 -14 -14 0 -16C14 -14 14 0 0 4Z" fill="#7fae6f" />
      </g>
    );
  return (
    <g>
      <path d="M0 20V0" stroke="#4f7a4d" strokeWidth="2.5" />
      <path d="M0 12C-8 6 -10 14 0 14Z" fill="#7fae6f" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-7"
          rx="4.6"
          ry="7"
          fill={c}
          transform={`rotate(${a} 0 0) translate(0 -1)`}
        />
      ))}
      <circle cx="0" cy="0" r="3.6" fill="#f3b23d" />
    </g>
  );
}

export function GardenVisualization() {
  const growth = useMemory((s) => s.growth);
  const shown = growth.slice(-28);
  return (
    <div
      className="memory-garden-art"
      role="img"
      aria-label={`Your memory garden has ${growth.length} keepsakes. Progress is never lost for skipping.`}
    >
      <svg
        viewBox="0 0 400 150"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <rect width="400" height="150" fill="#eef2e3" />
        <circle cx="338" cy="30" r="18" fill="#f5dca1" />
        <path d="M0 98Q90 70 200 92T400 84V150H0Z" fill="#c5d6b3" />
        <path d="M0 116Q120 94 230 112T400 106V150H0Z" fill="#a8c094" />
        <path d="M170 150Q190 118 210 108Q232 118 246 150Z" fill="#e6dcc4" />
        {shown.map((plant, i) => {
          const x = 18 + ((i * 53) % 364);
          const y = 112 + ((i * 17) % 28) - (plant === "butterfly" ? 46 : 0);
          return (
            <g
              key={i}
              className={`garden-plant-svg ${plant}`}
              transform={`translate(${x} ${y})`}
              style={{ animationDelay: `${(i % 6) * 0.08}s` }}
            >
              <PlantShape plant={plant} i={i} />
            </g>
          );
        })}
        {!shown.length && (
          <g transform="translate(200 120)">
            <path d="M0 14V0" stroke="#4f7a4d" strokeWidth="2.5" />
            <path
              d="M0 2C-10 -2 -10 -12 0 -12C10 -12 10 -2 0 2Z"
              fill="#7fae6f"
            />
          </g>
        )}
      </svg>
      <span className="garden-caption">
        {growth.length
          ? `${growth.length} keepsake${growth.length === 1 ? "" : "s"} · a little joy, growing gently`
          : "A quiet place for new memories."}
      </span>
    </div>
  );
}
