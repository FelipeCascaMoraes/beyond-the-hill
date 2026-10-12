import type { CircleObstacle } from "../player/playerController.ts";
import { createRandom } from "./noise.ts";
import { shelterAt } from "./hillside.ts";

// O refúgio: o patamar plano no fundo da concha, onde o caminho termina. Um
// lugar pequeno — uma árvore baixa, flores, grama alta e uma cerca viva que
// fecha o lado norte, onde a colina volta a cair. Nada de casa: é o bastante
// para caber três pessoas e parar de andar.
//
//   borda da concha (−760) → pedra (−789) → [patamar] → árvore (−813) → cerca viva
//
// Lógica pura: posições que a cena desenha, a colisão respeita e a cena do
// reencontro enquadra. Mexer aqui move as três coisas juntas.

export const REFUGE = {
  zone: "hillside",
  /** Meio do patamar, onde o chão para de descer. */
  center: { x: 44, z: -805 },
  /** A árvore pequena: é debaixo dela que os dois esperam. */
  tree: { x: 44.8, z: -813.5 },
  /** Onde cada um está, lado a lado, de frente para quem chega. */
  father: [43.1, -809.4],
  mother: [46.2, -809.1],
  /** Para onde os dois olham antes dela chegar: a brecha por onde se entra. */
  facing: [44, -760],
  /**
   * Onde Cassandra e Victor aparecem no fim: na beira do patamar, dos dois
   * lados da pedra, entre a Aysha e a saída. É o último lugar em que a luz
   * morna ainda chega — um passo atrás deles, já é a colina de novo.
   */
  cassandra: [41.2, -790.6],
  victor: [47.7, -791.2],
} as const;

/** Raio do arco da cerca viva a partir do centro, e o trecho que ela cobre (rad). */
const HEDGE_RADIUS = 14.5;
const HEDGE_FROM = (-165 * Math.PI) / 180;
const HEDGE_TO = (-15 * Math.PI) / 180;
/** Distância entre os arbustos (m): menor que dois raios de colisão, para não haver fresta. */
const HEDGE_STEP = 2.2;
/** Raio de colisão de cada arbusto (m). */
const BUSH_RADIUS = 1.2;

export interface Bush {
  x: number;
  z: number;
  /** Tamanho do arbusto (m). */
  size: number;
  seed: number;
}

/**
 * A cerca viva: arbustos em arco do lado norte do patamar. É o que faz do
 * patamar um lugar, e não um mirante — atrás dela a colina despenca, e daqui
 * de dentro ninguém precisa ver isso.
 */
export function refugeHedge(): Bush[] {
  const random = createRandom(83);
  const count = Math.ceil(((HEDGE_TO - HEDGE_FROM) * HEDGE_RADIUS) / HEDGE_STEP);
  const bushes: Bush[] = [];
  for (let i = 0; i <= count; i++) {
    const angle = HEDGE_FROM + ((HEDGE_TO - HEDGE_FROM) * i) / count;
    const radius = HEDGE_RADIUS + (random() - 0.5) * 1.2;
    bushes.push({
      x: REFUGE.center.x + Math.cos(angle) * radius,
      z: REFUGE.center.z + Math.sin(angle) * radius,
      size: 1.3 + random() * 0.7,
      seed: i,
    });
  }
  return bushes;
}

/** O que barra o passo no refúgio: a cerca viva e o tronco da árvore. */
export function refugeObstacles(): CircleObstacle[] {
  return [
    ...refugeHedge().map((bush) => ({ x: bush.x, z: bush.z, radius: BUSH_RADIUS })),
    { x: REFUGE.tree.x, z: REFUGE.tree.z, radius: 0.5 },
  ];
}

/** Quanto sobra do passo no fundo da concha: ninguém chega correndo aqui. */
const REFUGE_PACE = 0.6;

/**
 * O passo encurta conforme a Aysha desce para dentro da concha, até 60% no
 * fundo. É a primeira coisa que o lugar faz com ela — antes da cena do
 * reencontro tirar o controle de vez, o próprio chão já pede calma.
 */
export function refugePaceAt(x: number, z: number): number {
  return 1 - (1 - REFUGE_PACE) * shelterAt(x, z);
}
