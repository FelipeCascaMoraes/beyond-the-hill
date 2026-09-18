import { fbm, smoothstep } from "./noise";

// Forma do mundo. Fonte única da altura do chão: terreno, grama e (no futuro)
// o movimento da Aysha usam a mesma função, sem física.

export const TERRAIN_SIZE = 1400;

/** A colina: domo largo no horizonte, levemente deslocado à direita. */
export const HILL = {
  x: 20,
  z: -380,
  radiusX: 280,
  radiusZ: 170,
  height: 100,
} as const;

/** Raio ao redor do despertar em que o campo é quase plano. */
const CALM_RADIUS = 10;

export function terrainHeight(x: number, z: number): number {
  const rolling = (fbm(x * 0.009, z * 0.009) - 0.5) * 16 + (fbm(x * 0.045 + 100, z * 0.045) - 0.5) * 2.2;
  const calm = 0.2 + 0.8 * smoothstep(CALM_RADIUS, 70, Math.hypot(x, z));

  const dx = (x - HILL.x) / HILL.radiusX;
  const dz = (z - HILL.z) / HILL.radiusZ;
  const hill = HILL.height * Math.exp(-(dx * dx + dz * dz) * 1.8);

  return rolling * calm + hill;
}
