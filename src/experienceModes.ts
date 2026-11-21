import type { ExperienceMode } from "./store";

export type ExperienceModeOption = {
  id: ExperienceMode;
  emoji: string;
  name: "Normal" | "Focus" | "Dialogue";
};

// One shared vocabulary for the watch, caregiver phone, tests and ESP32
// integration. UI agents may style these options, but should not invent a
// second set of mode names or symbols.
export const EXPERIENCE_MODES: readonly ExperienceModeOption[] = [
  { id: "normal", emoji: "🌿", name: "Normal" },
  { id: "focus", emoji: "🏠", name: "Focus" },
  { id: "dialogue", emoji: "💬", name: "Dialogue" },
];

export function experienceModeOption(mode: ExperienceMode) {
  return EXPERIENCE_MODES.find((option) => option.id === mode)!;
}
