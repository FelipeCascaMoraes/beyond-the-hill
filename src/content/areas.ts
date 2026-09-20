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
  // De volta ao labirinto depois da verdade: a saída norte está aberta.
  "labyrinth-open": {
    zone: "labyrinth",
    center: [2, -92],
    radius: 7,
    dialogue: "labyrinth-open",
    requires: { flags: ["they-lied"] },
  },

  // ── A encosta ────────────────────────────────────────────────────────────
  // Seis paradas na última caminhada. As quatro primeiras não travam o
  // movimento: são pensamentos de quem anda. As duas últimas param a Aysha —
  // o cume e o que existe atrás dele merecem que ela fique parada.
  "hillside-arrive": {
    zone: "hillside",
    center: [15, -330],
    radius: 14,
    dialogue: "hillside-arrive",
  },
  "hillside-valley": {
    zone: "hillside",
    center: [22, -408],
    radius: 16,
    dialogue: "hillside-valley",
  },
  "hillside-climb": {
    zone: "hillside",
    center: [25, -472],
    radius: 14,
    dialogue: "hillside-climb",
  },
  // Na curva do caminho, no ponto mais a oeste: a primeira vez que ela olha
  // para baixo e o Além inteiro cabe embaixo dela.
  "hillside-halfway": {
    zone: "hillside",
    center: [-10, -575],
    radius: 18,
    dialogue: "hillside-halfway",
  },
  "hillside-summit": {
    zone: "hillside",
    center: [39, -714],
    radius: 12,
    dialogue: "hillside-summit",
  },
  // Na brecha do anel, alguns passos depois da árvore: a concha aparece.
  "hillside-hollow": {
    zone: "hillside",
    center: [44, -754],
    radius: 12,
    dialogue: "hillside-hollow",
  },
} as const satisfies Record<string, AreaTrigger>;

export type AreaTriggerId = keyof typeof areaTriggers;
