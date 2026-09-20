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
  // De volta ao campo depois do labirinto, ao chegar perto dos dois. Só então:
  // é preciso ter lido o papel para o que ela vê aqui significar alguma coisa.
  "guides-again": {
    zone: "arrival",
    center: [-1.5, -13.8],
    radius: 8,
    dialogue: "guides-again",
    requires: { flags: ["hunt-began"] },
  },
  // Ao chegar diante da muralha do labirinto.
  "labyrinth-arrive": {
    zone: "labyrinth",
    center: [2, -55],
    radius: 9,
    dialogue: "labyrinth-arrive",
  },
} as const satisfies Record<string, AreaTrigger>;

export type AreaTriggerId = keyof typeof areaTriggers;
