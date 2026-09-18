import type { Zone } from "./types";

// Valores provisórios nas zonas ainda não construídas.
const placeholder = {
  playerSpawn: [0, 0, 0],
  spawnLookAt: [0, 0, -10],
  bounds: { center: [0, 0], radius: 30 },
} as const;

/** Zonas na ordem em que a jornada acontece. */
export const zones = {
  arrival: {
    title: "O Além",
    playerSpawn: [0, 0, 0],
    // Olhar voltado para a colina: horizonte no terço inferior, cume um pouco à direita.
    spawnLookAt: [-10, 95, -720],
    bounds: { center: [0, 4], radius: 38 },
  },
  houses: { title: "As Casas Abandonadas", ...placeholder },
  labyrinth: { title: "O Labirinto", ...placeholder },
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
