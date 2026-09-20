import type { Zone } from "./types";

// Valores provisórios nas zonas ainda não construídas.
const placeholder = {
  playerSpawn: [0, 0, 0],
  spawnLookAt: [0, 0, -10],
  bounds: [{ center: [0, 0], radius: 30 }],
} as const;

/** Zonas na ordem em que a jornada acontece. */
export const zones = {
  arrival: {
    title: "O Além",
    playerSpawn: [0, 0, 0],
    // Olhar voltado para a colina: horizonte no terço inferior, cume um pouco à direita.
    spawnLookAt: [-10, 95, -720],
    // O campo + a área da casa abandonada (à esquerda, atrás das flores).
    bounds: [
      { center: [0, 4], radius: 38 },
      { center: [-44, 12], radius: 12 },
    ],
  },
  houses: { title: "As Casas Abandonadas", ...placeholder },
  // Um quadrado de pedra plantado no campo, no caminho da colina. A planta
  // fica em game/world/labyrinth.ts; aqui só o que a zona precisa saber.
  labyrinth: {
    title: "O Labirinto",
    // Do lado de fora da entrada, no lado sul: a muralha inteira à vista.
    playerSpawn: [2, 0, -55],
    // Olhando para a entrada e, por cima das paredes, para a colina.
    spawnLookAt: [2, 60, -700],
    bounds: [{ center: [2, -78], radius: 23 }],
  },
  hillside: { title: "A Colina", ...placeholder },
  refuge: { title: "O Refúgio", ...placeholder },
} as const satisfies Record<string, Zone>;

export type ZoneId = keyof typeof zones;

export const zoneOrder: readonly ZoneId[] = [
  "arrival",
  "houses",
  "labyrinth",
  "hillside",
  "refuge",
];
