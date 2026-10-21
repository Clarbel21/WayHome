import { useMemory } from "./store";
const shapes = { flower: "✿", leaf: "❧", butterfly: "ʚɞ", tree: "♧" };
export function GardenVisualization() {
  const growth = useMemory((s) => s.growth);
  return (
    <div
      className="memory-garden-art"
      role="img"
      aria-label={`Your memory garden has ${growth.length} keepsakes. Progress is never lost for skipping.`}
    >
      <div className="garden-sun" />
      <div className="garden-hill back" />
      <div className="garden-hill" />
      <div className="garden-path" />
      <div className="garden-plants">
        {growth.slice(-24).map((plant, i) => (
          <span
            key={i}
            className={`garden-plant ${plant}`}
            style={{
              left: `${7 + ((i * 19) % 86)}%`,
              bottom: `${12 + ((i * 11) % 40)}%`,
              animationDelay: `${(i % 4) * 0.1}s`,
            }}
          >
            {shapes[plant]}
          </span>
        ))}
        {!growth.length && <span className="garden-seedling">☘</span>}
      </div>
      <span className="garden-caption">
        {growth.length
          ? "A little joy, growing gently."
          : "A quiet place for new memories."}
      </span>
    </div>
  );
}
