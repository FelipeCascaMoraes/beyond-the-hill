import type { AreaTrigger } from "./types";

// Lugares que falam por si ao chegar. Cada gatilho acontece uma vez.

export const areaTriggers = {
  // Ao se aproximar da casa abandonada.
  "house-approach": {
    zone: "arrival",
    center: [-44, 12],
    radius: 11,
    dialogue: "house-approach",
  },
} as const satisfies Record<string, AreaTrigger>;

export type AreaTriggerId = keyof typeof areaTriggers;
