import type { ZoneBounds } from "../../content/types.ts";
import { CLIMB_PATH, HOLLOW, SUMMIT, terrainHeight, type ClimbPoint } from "./terrain.ts";

// A encosta: a última caminhada. Tudo aqui é derivado de uma coisa só — a
// linha do caminho em `terrain.ts`, que é ao mesmo tempo o que cava a rampa no
// morro, o que define até onde se pode andar e o que abre a trilha na grama.
// Mexer na linha move as três coisas juntas.
//
//   crista (−330) → vale → pé da subida (−468) → encosta (~27°) → cume (−718)
//   → a brecha no anel → a concha (−792)

/** Altura em que a subida começa e em que ela acaba (m). */
const CLIMB_FROM_Y = 14;
const CLIMB_TO_Y = 146;

/**
 * O quanto da subida já foi vencido, de 0 (no vale) a 1 (no cume). Vem só da
 * altura, não da posição: é o que move a luz, o vento, o som e a interface —
 * e por ser altura, funciona mesmo se o jogador subir por fora da trilha.
 */
export function ascentAt(y: number): number {
  const t = (y - CLIMB_FROM_Y) / (CLIMB_TO_Y - CLIMB_FROM_Y);
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * O quanto a Aysha está abrigada dentro da concha, de 0 (na borda ou fora) a
 * 1 (no fundo). O vento cai com isto — é assim que o lugar se anuncia como
 * refúgio antes de qualquer palavra.
 */
export function shelterAt(x: number, z: number): number {
  const distance = Math.hypot(x - HOLLOW.x, z - HOLLOW.z);
  const t = Math.min(1, Math.max(0, 1 - distance / HOLLOW.radius));
  return t * t * (3 - 2 * t);
}

/** O ponto mais alto do caminho: dali em diante já é descida para a concha. */
const summitIndex = CLIMB_PATH.reduce(
  (best, point, index) => ((point.y ?? -Infinity) > (CLIMB_PATH[best].y ?? -Infinity) ? index : best),
  0,
);

/**
 * Largura da área explorável em cada trecho: o vale é campo aberto, a encosta
 * é um corredor (fora da trilha a colina passa dos 35° e não se sobe), e a
 * concha volta a abrir.
 */
function radiusAt(segment: number): number {
  if (CLIMB_PATH[segment].y === undefined) return 44;
  return segment >= summitIndex ? 34 : 30;
}

/** Passo entre os círculos da área explorável (m): bem menor que o raio. */
const BOUNDS_STEP = 24;

/**
 * Área explorável da encosta: uma corrente de círculos ao longo do caminho.
 * O passo é muito menor que o raio de propósito — onde dois círculos se
 * encostam de raspão, o limite suave freia a caminhada, e esta é justamente a
 * sequência que não pode emperrar.
 */
export function hillsideBounds(): ZoneBounds[] {
  const bounds: ZoneBounds[] = [];
  forEachPathPoint(BOUNDS_STEP, (x, z, segment) => bounds.push({ center: [x, z], radius: radiusAt(segment) }));
  return bounds;
}

/** Passo e raio das clareiras que desenham a trilha na grama alta (m). */
const TRAIL_STEP = 5;
const TRAIL_RADIUS = 2.6;

/**
 * A trilha aberta na grama. O terreno é grosso demais aqui para pintar uma
 * faixa de terra batida (os vértices ficam a metros de distância), então quem
 * desenha o caminho é a própria grama, que se abaixa por onde se anda.
 */
export function hillsideTrailClearings() {
  const clearings: { x: number; z: number; radius: number; floor: number }[] = [];
  forEachPathPoint(TRAIL_STEP, (x, z) => clearings.push({ x, z, radius: TRAIL_RADIUS, floor: 0.2 }));
  return clearings;
}

export interface GrassPatch {
  x: number;
  z: number;
  radius: number;
  /** Fração da densidade normal: a grama rareia com a altura e volta na concha. */
  density: number;
  seed: number;
}

const PATCH_STEP = 64;
const PATCH_RADIUS = 44;

/**
 * Manchas de grama ao longo do caminho. Não dá para cobrir meio quilômetro com
 * um campo só, então são vários — e cada um vem mais ralo conforme sobe: em
 * cima sobra pedra e vento. Dentro da concha a grama volta, porque ali não
 * venta.
 */
export function hillsideGrassPatches(): GrassPatch[] {
  const patches: GrassPatch[] = [];
  forEachPathPoint(PATCH_STEP, (x, z, _segment, index) => {
    const climbed = ascentAt(terrainHeight(x, z));
    const sheltered = shelterAt(x, z);
    patches.push({
      x,
      z,
      radius: PATCH_RADIUS,
      density: Math.max(1 - climbed * 0.7, sheltered * 0.85),
      seed: 101 + index * 13,
    });
  });
  return patches;
}

/** A árvore do cume, e o fundo da concha: os dois pontos que a zona precisa citar. */
export const HILLSIDE = {
  zone: "hillside",
  summit: SUMMIT,
  hollow: { x: HOLLOW.x, z: HOLLOW.z },
} as const;

/**
 * Percorre o caminho inteiro a passos regulares de `step`, medidos ao longo
 * dele e não por trecho: trechos curtos não reiniciam a contagem nem somem.
 * O último vértice entra sempre, para a corrente não parar antes do fim.
 */
function forEachPathPoint(
  step: number,
  visit: (x: number, z: number, segment: number, index: number) => void,
): void {
  let index = 0;
  let next = 0;
  let travelled = 0;
  for (let segment = 0; segment < CLIMB_PATH.length - 1; segment++) {
    const from: ClimbPoint = CLIMB_PATH[segment];
    const to: ClimbPoint = CLIMB_PATH[segment + 1];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    while (next < travelled + length) {
      const t = (next - travelled) / length;
      visit(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, segment, index++);
      next += step;
    }
    travelled += length;
  }
  const last = CLIMB_PATH[CLIMB_PATH.length - 1];
  visit(last.x, last.z, CLIMB_PATH.length - 2, index);
}
