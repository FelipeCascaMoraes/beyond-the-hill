import { hillsideBounds } from "../game/world/hillside.ts";
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
  // A encosta: a caminhada final. Começa na crista que escondia o vale (onde
  // a saída norte do labirinto dá) e vai até o pé da subida. Aberta, longa e
  // sem nenhuma máquina — depois de tudo, a única coisa que resta é andar.
  hillside: {
    title: "A Colina",
    // Em cima da crista, na trilha, com o vale inteiro à vista.
    playerSpawn: [15, 0, -330],
    // Meia encosta: o cume e a árvore ficam no alto do quadro, o chão embaixo.
    spawnLookAt: [40, 70, -720],
    // A área explorável acompanha o caminho e sai da mesma linha que cava a
    // rampa na encosta: mexer na linha move as duas coisas juntas.
    bounds: hillsideBounds(),
    // O meio da subida: é ali que a malha do terreno precisa ser fina.
    terrainFocus: [4, -570],
  },
  refuge: { title: "O Refúgio", ...placeholder },
} as const satisfies Record<string, Zone>;

export type ZoneId = keyof typeof zones;

/**
 * Onde a malha do terreno deve ser mais densa: o que a zona pediu, ou, por
 * falta de pedido, o ponto de partida dela.
 */
export function terrainFocusOf(id: ZoneId): readonly [number, number] {
  const zone: Zone = zones[id];
  return zone.terrainFocus ?? [zone.playerSpawn[0], zone.playerSpawn[2]];
}

export const zoneOrder: readonly ZoneId[] = [
  "arrival",
  "houses",
  "labyrinth",
  "hillside",
  "refuge",
];
