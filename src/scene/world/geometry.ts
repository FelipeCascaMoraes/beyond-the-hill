import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { atmosphere } from "@/game/config/render";
import { createRandom, fbm, smoothstep } from "@/game/world/noise";
import { HOUSE, isInsideHouse } from "@/game/world/house";
import { HILL, TERRAIN_HALF_SIZE, distanceToTrail, terrainHeight } from "@/game/world/terrain";

// Geração procedural das geometrias do mundo (executa uma vez por montagem).

const TERRAIN_SEGMENTS = 320;
/** Distribuição da malha: ~1 m entre vértices perto do jogador, ~10 m na colina. */
const TERRAIN_LINEAR_SHARE = 0.15;
const TERRAIN_WARP_POWER = 1.8;

function warpGrid(u: number): number {
  const curved = Math.sign(u) * Math.pow(Math.abs(u), TERRAIN_WARP_POWER);
  return TERRAIN_HALF_SIZE * (TERRAIN_LINEAR_SHARE * u + (1 - TERRAIN_LINEAR_SHARE) * curved);
}

/**
 * Terreno + colina em um único mesh. A grade é mais densa perto do jogador e
 * mais esparsa ao longe: cobre 2,5 km com o mesmo número de vértices.
 */
export function createTerrainGeometry(): BufferGeometry {
  const geometry = new PlaneGeometry(2, 2, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const ground = new Color(atmosphere.groundColor);
  const groundAlt = new Color(atmosphere.groundColorAlt);
  const trailColor = new Color(atmosphere.trailColor);
  const color = new Color();

  for (let i = 0; i < position.count; i++) {
    const x = warpGrid(position.getX(i));
    const z = warpGrid(position.getZ(i));
    const y = terrainHeight(x, z);
    position.setXYZ(i, x, y, z);

    // Manchas mais secas no campo e na encosta da colina.
    const patches = fbm(x * 0.025 + 50, z * 0.025);
    const onHill = smoothstep(20, HILL.height * 0.8, y);
    color.lerpColors(ground, groundAlt, Math.min(1, smoothstep(0.45, 0.75, patches) * 0.7 + onHill * 0.5));
    color.multiplyScalar(0.85 + fbm(x * 0.2, z * 0.2, 2) * 0.3);

    // Quintal de terra batida em volta da casa abandonada.
    const fromHouse = Math.hypot(x - HOUSE.x, z - HOUSE.z);
    if (fromHouse < 10) color.lerp(trailColor, (1 - smoothstep(4, 10, fromHouse)) * 0.6);

    // Terra batida da trilha, só perto do campo.
    if (Math.abs(z) < 120) {
      const trail = 1 - smoothstep(0.4, 1.4, distanceToTrail(x, z));
      color.lerp(trailColor, trail * 0.55);
    }
    color.toArray(colors, i * 3);
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const BLADE_SEGMENTS = 4;

interface GrassOptions {
  count: number;
  radius: number;
  centerX: number;
  centerZ: number;
  seed: number;
  /** Áreas de grama baixa (em volta de pontos de interesse), para que se destaquem. */
  clearings?: readonly GrassClearing[];
}

export interface GrassClearing {
  x: number;
  z: number;
  radius: number;
  /** Altura relativa da grama no centro (padrão 0.15; 0 = sem grama, ex.: dentro da casa). */
  floor?: number;
}

/** 1 fora das clareiras; cai suavemente até `floor` no centro delas. */
function clearingFactor(x: number, z: number, clearings: readonly GrassClearing[]): number {
  let factor = 1;
  for (const clearing of clearings) {
    if (clearing.radius <= 0) continue;
    const floor = clearing.floor ?? 0.15;
    const distance = Math.hypot(x - clearing.x, z - clearing.z);
    factor = Math.min(factor, floor + (1 - floor) * smoothstep(clearing.radius * 0.4, clearing.radius, distance));
  }
  return factor;
}

/** Uma folha (9 vértices, 7 triângulos) instanciada `count` vezes. */
export function createGrassGeometry({
  count,
  radius,
  centerX,
  centerZ,
  seed,
  clearings = [],
}: GrassOptions): InstancedBufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < BLADE_SEGMENTS; i++) {
    const t = i / BLADE_SEGMENTS;
    const halfWidth = 0.5 * Math.pow(1 - t, 0.7);
    positions.push(-halfWidth, t, 0, halfWidth, t, 0);
  }
  positions.push(0, 1, 0);
  const tip = BLADE_SEGMENTS * 2;
  for (let i = 0; i < BLADE_SEGMENTS; i++) {
    const a = i * 2;
    const b = a + 1;
    if (i < BLADE_SEGMENTS - 1) {
      indices.push(a, b, a + 2, b, b + 2, a + 2);
    } else {
      indices.push(a, b, tip);
    }
  }

  const random = createRandom(seed);
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    // Expoente > 0.5: um pouco mais denso perto do centro.
    const r = radius * Math.pow(random(), 0.6);
    const angle = random() * Math.PI * 2;
    const x = centerX + Math.cos(angle) * r;
    const z = centerZ + Math.sin(angle) * r;

    offsets[i * 3] = x;
    offsets[i * 3 + 1] = terrainHeight(x, z) - 0.04;
    offsets[i * 3 + 2] = z;

    const edge = 1 - smoothstep(radius * 0.7, radius, r);
    const clumps = 0.55 + 0.9 * fbm(x * 0.07, z * 0.07, 3);
    const distanceFactor = r / radius;
    // Grama baixa e pisada na trilha: uma linha natural que conduz o olhar à colina.
    const trodden = 0.2 + 0.8 * smoothstep(0.3, 1.5, distanceToTrail(x, z));

    params[i * 4] = random() * Math.PI * 2;
    params[i * 4 + 1] =
      (0.3 + random() * 0.5) * clumps * (0.25 + 0.75 * edge) * trodden * clearingFactor(x, z, clearings) *
      (isInsideHouse(x, z) ? 0 : 1);
    // Folhas distantes mais largas para cobrir o chão com menos instâncias.
    params[i * 4 + 2] = (0.05 + random() * 0.05) * (1 + distanceFactor * 1.8);
    params[i * 4 + 3] = random();
  }

  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aParams", new InstancedBufferAttribute(params, 4));
  geometry.instanceCount = count;
  return geometry;
}

interface MotesOptions {
  count: number;
  /** Meia-largura do volume quadrado (o shader o repete em volta da câmera). */
  range: number;
  height: number;
  seed: number;
}

export function createMotesGeometry({ count, range, height, seed }: MotesOptions): BufferGeometry {
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() * 2 - 1) * range;
    positions[i * 3 + 1] = random() * height;
    positions[i * 3 + 2] = (random() * 2 - 1) * range;
    seeds[i] = random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  return geometry;
}

/**
 * Árvore solitária low-poly: tronco inclinado e copa larga em "guarda-chuva".
 * Peças unidas em uma única geometria (1 draw call). Altura ~1 unidade = 1 m.
 */
export function createTreeGeometry(seed: number): BufferGeometry {
  const random = createRandom(seed);
  const parts: BufferGeometry[] = [];

  const trunk = new CylinderGeometry(0.35, 0.75, 9, 7, 2);
  trunk.translate(0, 4.5, 0);
  trunk.rotateZ(0.07);
  parts.push(trunk.toNonIndexed());
  trunk.dispose();

  // Dois galhos principais abrindo a copa.
  for (const side of [-1, 1]) {
    const branch = new CylinderGeometry(0.18, 0.32, 5, 5);
    branch.translate(0, 2.5, 0);
    branch.rotateZ(side * 0.75);
    branch.translate(0.3 * side, 7.5, 0);
    parts.push(branch.toNonIndexed());
    branch.dispose();
  }

  // Copa: blocos achatados formando uma silhueta larga e assimétrica.
  const canopy = [
    [0, 11.5, 0, 4.6],
    [-4.8, 10.6, 0.6, 3.6],
    [4.2, 10.9, -0.5, 3.9],
    [-1.8, 12.6, -1.8, 3.4],
    [2, 12.4, 1.6, 3.3],
    [-7.2, 9.9, -0.4, 2.4],
    [6.6, 10.2, 0.8, 2.5],
  ] as const;
  for (const [x, y, z, radius] of canopy) {
    const blob = new IcosahedronGeometry(radius * (0.9 + random() * 0.2), 1);
    blob.scale(1, 0.58, 0.9);
    blob.rotateY(random() * Math.PI);
    blob.translate(x, y, z);
    parts.push(blob);
  }

  const tree = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return tree;
}
