import type { BoxObstacle } from "./playerController.ts";

// A câmera em 3ª pessoa: só a geometria, sem Three.js. A Aysha continua
// andando pela mesma lógica (playerController.ts) — o que muda é de onde se
// olha. A câmera fica atrás e um pouco ao lado dela, olhando na mesma direção
// do olhar, de modo que a mira no centro da tela continua valendo.

export const thirdPersonConfig = {
  /** Distância atrás da Aysha (m). */
  distance: 3.4,
  /** Quanto a câmera sobe acima dos olhos dela (m): ela fica no terço de baixo do quadro. */
  rise: 0.18,
  /** Quanto a câmera vai para o lado (m): por cima do ombro direito, sem tapar o caminho. */
  shoulder: 0.45,
  /** Folga mínima entre a câmera e o chão, e entre a câmera e uma parede (m). */
  groundClearance: 0.3,
  wallMargin: 0.25,
  /** Com a câmera mais perto do que isto, o corpo dela some: estaria dentro da lente (m). */
  hideBodyWithin: 0.9,
} as const;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Para onde a câmera iria, em relação aos olhos da Aysha, se nada a barrasse.
 * A câmera olha para -Z com yaw 0, como no resto do jogo.
 */
export function boomOffset(yaw: number, pitch: number, into: Vec3): Vec3 {
  const { distance, rise, shoulder } = thirdPersonConfig;
  const cosPitch = Math.cos(pitch);
  // Para trás do olhar…
  into.x = Math.sin(yaw) * cosPitch * distance;
  into.y = -Math.sin(pitch) * distance + rise;
  into.z = Math.cos(yaw) * cosPitch * distance;
  // …e para a direita dele.
  into.x += Math.cos(yaw) * shoulder;
  into.z -= Math.sin(yaw) * shoulder;
  return into;
}

/** Em quantos pontos o caminho dos olhos até a câmera é conferido. */
const SAMPLES = 12;

/**
 * Até onde a câmera pode ir sem atravessar uma parede, de 0 (nos olhos da
 * Aysha) a 1 (o lugar inteiro). Num corredor estreito ou dentro da casa a
 * câmera encosta nela em vez de ir parar do outro lado da parede.
 */
export function boomReach(x: number, z: number, offset: Vec3, walls: readonly BoxObstacle[]): number {
  if (walls.length === 0) return 1;
  const margin = thirdPersonConfig.wallMargin;
  for (let i = 1; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const px = x + offset.x * t;
    const pz = z + offset.z * t;
    for (const wall of walls) {
      if (px > wall.minX - margin && px < wall.maxX + margin && pz > wall.minZ - margin && pz < wall.maxZ + margin) {
        return (i - 1) / SAMPLES;
      }
    }
  }
  return 1;
}

/**
 * A posição final da câmera: os olhos mais a fração permitida do caminho, e
 * nunca abaixo do chão — olhando para cima, ela desliza rente à grama.
 */
export function boomPosition(eye: Vec3, offset: Vec3, reach: number, heightAt: (x: number, z: number) => number, into: Vec3): Vec3 {
  into.x = eye.x + offset.x * reach;
  into.z = eye.z + offset.z * reach;
  into.y = Math.max(eye.y + offset.y * reach, heightAt(into.x, into.z) + thirdPersonConfig.groundClearance * Math.min(1, reach * 4));
  return into;
}
