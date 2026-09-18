import { fbm, smoothstep } from "./noise";

// Forma do mundo. Fonte única da altura do chão: terreno, grama, árvore e o
// movimento da Aysha usam a mesma função, sem física.
//
// Composição vista do despertar (olhando para -Z):
//   campo de grama → crista baixa (~330 m, esconde a base) → vale → a colina (~720 m)

export const TERRAIN_HALF_SIZE = 1250;

/** A colina: cume arredondado à direita, encosta longa e suave à esquerda. */
export const HILL = {
  x: 40,
  z: -720,
  height: 150,
  radiusLeft: 560,
  radiusRight: 300,
  radiusZ: 280,
} as const;

/** Ombro na encosta esquerda: um degrau que torna a silhueta reconhecível. */
const SHOULDER = { x: -380, z: -690, height: 58, radiusX: 150, radiusZ: 200 } as const;

/** Onde fica o topo (e a árvore solitária). */
export const SUMMIT = { x: HILL.x, z: HILL.z } as const;

/** Raio ao redor do despertar em que o campo é quase plano. */
const CALM_RADIUS = 10;

function hillHeight(x: number, z: number): number {
  const dx = (x - HILL.x) / (x < HILL.x ? HILL.radiusLeft : HILL.radiusRight);
  const dz = (z - HILL.z) / HILL.radiusZ;
  const main = HILL.height * Math.exp(-Math.pow(dx * dx + dz * dz, 1.15) * 2.6);

  const sx = (x - SHOULDER.x) / SHOULDER.radiusX;
  const sz = (z - SHOULDER.z) / SHOULDER.radiusZ;
  const shoulder = SHOULDER.height * Math.exp(-(sx * sx + sz * sz) * 2);

  return main + shoulder;
}

export function terrainHeight(x: number, z: number): number {
  const hill = hillHeight(x, z);

  // Ondulação natural, contida perto do despertar e sobre a colina (silhueta limpa).
  const rolling = (fbm(x * 0.006, z * 0.006) - 0.5) * 14 + (fbm(x * 0.03 + 100, z * 0.03) - 0.5) * 2.5;
  const calm = 0.2 + 0.8 * smoothstep(CALM_RADIUS, 80, Math.hypot(x, z));
  const onHill = Math.min(1, hill / 60);

  // Crista intermediária: baixa no centro, mais alta nas laterais (moldura em V).
  const ridgeHeight = (9 + 16 * smoothstep(80, 420, Math.abs(x - HILL.x))) * (0.8 + 0.4 * fbm(x * 0.004 + 7, 3.1, 3));
  const ridge = ridgeHeight * Math.exp(-(((z + 330) / 70) ** 2));

  // Vale entre a crista e a colina: o que existe ali fica escondido.
  const valley = -10 * Math.exp(-(((z + 500) / 110) ** 2));

  return rolling * calm * (1 - 0.7 * onHill) + ridge + valley + hill;
}

/** Trilha de grama pisada que serpenteia do despertar na direção da colina. */
export function trailCenterX(z: number): number {
  return -z * (SUMMIT.x / -SUMMIT.z) + 3 * Math.sin(z * 0.045) + 1.6 * Math.sin(z * 0.12 + 1.3);
}

/** Distância horizontal aproximada até o centro da trilha (a trilha corre quase ao longo de Z). */
export function distanceToTrail(x: number, z: number): number {
  return Math.abs(x - trailCenterX(z));
}
