import type { BoxObstacle } from "../player/playerController.ts";
import type { KeepOut } from "../machine/machineLogic.ts";

// O labirinto: um quadrado de pedra plantado no campo, no caminho da colina.
// Fonte única da planta — o que é desenhado é exatamente o que bloqueia.
//
// A planta é lida como um mapa: cada letra é uma célula de `cell` metros.
//   #  parede      .  passagem
//   E  entrada (sul, de onde a Aysha chega)
//   X  saída (norte, para a colina — ainda tomada por ferro retorcido)
//   M  a câmara do meio, onde uma lembrança está guardada
//
// A forma é deliberadamente simples: um corredor em anel colado à muralha e,
// dentro dele, anéis concêntricos com uma câmara no centro. Ninguém se perde,
// e as paredes são baixas de propósito: a colina continua aparecendo por cima
// delas, de qualquer ponto.
//
// O anel externo é o território da máquina. O miolo é abrigo: entre as paredes
// ela perde a Aysha de vista (ver game/machine/machineEnvironment.ts).

/** Onde o labirinto está e de que tamanho é cada célula. */
export const LABYRINTH = {
  zone: "labyrinth",
  x: 2,
  z: -78,
  /** Lado de cada célula (m): também a largura dos corredores. */
  cell: 2.6,
  /**
   * Baixas de propósito: acima dos olhos da Aysha (1,62 m), então a planta
   * continua invisível de dentro, mas ainda abaixo do ângulo em que o cume da
   * colina aparece — é o que segura a orientação do jogador (ver o teste).
   */
  wallHeight: 1.8,
} as const;

const LAYOUT = [
  "#######X#######",
  "#.............#",
  "#.#####.#####.#",
  "#.#.........#.#",
  "#.#.###.###.#.#",
  "#.#.#.....#.#.#",
  "#.#.#.#.#.#.#.#",
  "#.#...#M#...#.#",
  "#.#.#.###.#.#.#",
  "#.#.#.....#.#.#",
  "#.#.###.###.#.#",
  "#.#.........#.#",
  "#.#####.#####.#",
  "#.............#",
  "#######E#######",
] as const;

export type LabyrinthMark = "#" | "." | "E" | "X" | "M";

/** Lado da planta, em células. */
export const LABYRINTH_SIZE = LAYOUT.length;

/** Meia-largura do labirinto (m), da muralha ao centro. */
export const LABYRINTH_HALF = (LABYRINTH_SIZE * LABYRINTH.cell) / 2;

/** Primeira e última linha/coluna livres: o corredor em anel colado à muralha. */
const RING = 1;
/** Folga (m) entre a máquina e as paredes: ela é larga e não encosta. */
const MACHINE_CLEARANCE = 0.9;

export interface LabyrinthCell {
  row: number;
  col: number;
}

export const markAt = (row: number, col: number): LabyrinthMark =>
  (LAYOUT[row]?.[col] ?? "#") as LabyrinthMark;

/** A célula é passagem (qualquer coisa que não seja parede)? */
export const isOpenCell = (row: number, col: number): boolean => markAt(row, col) !== "#";

/** Centro da célula no mundo (x, z). */
export function cellCenter(row: number, col: number): readonly [number, number] {
  const half = (LABYRINTH_SIZE - 1) / 2;
  return [LABYRINTH.x + (col - half) * LABYRINTH.cell, LABYRINTH.z + (row - half) * LABYRINTH.cell];
}

/** Célula que contém um ponto do mundo (pode cair fora da planta). */
export function cellAt(x: number, z: number): LabyrinthCell {
  const half = (LABYRINTH_SIZE - 1) / 2;
  // `|| 0` só para trocar o -0 que Math.round devolve na borda por 0.
  return {
    row: Math.round((z - LABYRINTH.z) / LABYRINTH.cell + half) || 0,
    col: Math.round((x - LABYRINTH.x) / LABYRINTH.cell + half) || 0,
  };
}

/** Onde está uma marca única da planta (entrada, saída, câmara). */
export function findMark(mark: LabyrinthMark): LabyrinthCell {
  for (let row = 0; row < LABYRINTH_SIZE; row++) {
    const col = LAYOUT[row].indexOf(mark);
    if (col >= 0) return { row, col };
  }
  throw new Error(`Marca "${mark}" não existe na planta do labirinto.`);
}

/** Todas as células com esta marca. */
export function findAll(mark: LabyrinthMark): LabyrinthCell[] {
  const cells: LabyrinthCell[] = [];
  for (let row = 0; row < LABYRINTH_SIZE; row++) {
    for (let col = 0; col < LABYRINTH_SIZE; col++) {
      if (markAt(row, col) === mark) cells.push({ row, col });
    }
  }
  return cells;
}

/** Um trecho de parede já unido: várias células seguidas viram um bloco só. */
export interface WallRun {
  /** Centro no mundo. */
  x: number;
  z: number;
  sizeX: number;
  sizeZ: number;
}

/**
 * Paredes unidas por linha: em vez de 120 cubos, cerca de 40 blocos.
 * Serve para desenhar (uma geometria só) e para colidir (poucas caixas).
 */
export function wallRuns(): WallRun[] {
  const runs: WallRun[] = [];
  for (let row = 0; row < LABYRINTH_SIZE; row++) {
    let start = -1;
    for (let col = 0; col <= LABYRINTH_SIZE; col++) {
      const wall = col < LABYRINTH_SIZE && markAt(row, col) === "#";
      if (wall && start < 0) start = col;
      if (!wall && start >= 0) {
        const [fromX, z] = cellCenter(row, start);
        const [toX] = cellCenter(row, col - 1);
        runs.push({
          x: (fromX + toX) / 2,
          z,
          sizeX: toX - fromX + LABYRINTH.cell,
          sizeZ: LABYRINTH.cell,
        });
        start = -1;
      }
    }
  }
  return runs;
}

/** As mesmas paredes, como caixas de colisão do jogador. */
export function labyrinthWallBoxes(): BoxObstacle[] {
  return wallRuns().map((run) => ({
    minX: run.x - run.sizeX / 2,
    maxX: run.x + run.sizeX / 2,
    minZ: run.z - run.sizeZ / 2,
    maxZ: run.z + run.sizeZ / 2,
  }));
}

/** O bloco do miolo, em coordenadas do mundo (a parte cercada pelo anel). */
function interiorBox() {
  const [minX, minZ] = cellCenter(RING + 1, RING + 1);
  const [maxX, maxZ] = cellCenter(LABYRINTH_SIZE - RING - 2, LABYRINTH_SIZE - RING - 2);
  const half = LABYRINTH.cell / 2;
  return { minX: minX - half, maxX: maxX + half, minZ: minZ - half, maxZ: maxZ + half };
}

/** O ponto está no miolo do labirinto (entre as paredes, fora do anel)? */
export function isInsideLabyrinth(x: number, z: number): boolean {
  const box = interiorBox();
  return x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ;
}

/**
 * Onde a máquina não entra: o miolo (ela é larga demais para as passagens) e
 * a própria muralha. Sobra exatamente o corredor em anel.
 */
export function labyrinthKeepOut(): KeepOut[] {
  const interior = interiorBox();
  const outer = LABYRINTH_HALF - LABYRINTH.cell * RING;
  const clearance = MACHINE_CLEARANCE;
  const far = 1000;
  return [
    // O miolo, engordado pela largura da máquina.
    {
      minX: interior.minX - clearance,
      maxX: interior.maxX + clearance,
      minZ: interior.minZ - clearance,
      maxZ: interior.maxZ + clearance,
    },
    // A muralha, por dentro: quatro faixas que a empurram de volta ao anel.
    { minX: LABYRINTH.x - far, maxX: LABYRINTH.x - outer + clearance, minZ: LABYRINTH.z - far, maxZ: LABYRINTH.z + far },
    { minX: LABYRINTH.x + outer - clearance, maxX: LABYRINTH.x + far, minZ: LABYRINTH.z - far, maxZ: LABYRINTH.z + far },
    { minX: LABYRINTH.x - far, maxX: LABYRINTH.x + far, minZ: LABYRINTH.z - far, maxZ: LABYRINTH.z - outer + clearance },
    { minX: LABYRINTH.x - far, maxX: LABYRINTH.x + far, minZ: LABYRINTH.z + outer - clearance, maxZ: LABYRINTH.z + far },
  ];
}

/** Os quatro cantos do corredor em anel: a ronda da máquina. */
export function ringRoute(): readonly (readonly [number, number])[] {
  const last = LABYRINTH_SIZE - 1 - RING;
  return [cellCenter(RING, RING), cellCenter(RING, last), cellCenter(last, last), cellCenter(last, RING)];
}

/** Células alcançáveis a pé a partir de uma delas (usado pelos testes da planta). */
export function reachableFrom(start: LabyrinthCell): Set<string> {
  const seen = new Set<string>([`${start.row},${start.col}`]);
  const queue: LabyrinthCell[] = [start];
  while (queue.length) {
    const { row, col } = queue.shift()!;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const next = { row: row + dr, col: col + dc };
      const key = `${next.row},${next.col}`;
      if (seen.has(key) || !isOpenCell(next.row, next.col)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}
