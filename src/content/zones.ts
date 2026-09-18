import type { Zone } from "./types";

/** Zonas na ordem em que a jornada acontece. */
export const zones = {
  arrival: { title: "O Além", playerSpawn: [0, 0, 0] },
  houses: { title: "As Casas Abandonadas", playerSpawn: [0, 0, 0] },
  labyrinth: { title: "O Labirinto", playerSpawn: [0, 0, 0] },
  hillside: { title: "A Colina", playerSpawn: [0, 0, 0] },
  refuge: { title: "O Refúgio", playerSpawn: [0, 0, 0] },
} as const satisfies Record<string, Zone>;

export type ZoneId = keyof typeof zones;

export const zoneOrder: readonly ZoneId[] = [
  "arrival",
  "houses",
  "labyrinth",
  "hillside",
  "refuge",
];
