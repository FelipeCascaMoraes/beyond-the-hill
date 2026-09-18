import { BufferAttribute, Color, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, BufferGeometry } from "three";
import { atmosphere } from "@/game/config/render";
import { createRandom, fbm, smoothstep } from "@/game/world/noise";
import { HILL, TERRAIN_SIZE, terrainHeight } from "@/game/world/terrain";

// Geração procedural das geometrias do mundo (executa uma vez por montagem).

const TERRAIN_SEGMENTS = 320;

/** Terreno + colina em um único mesh, com variação de cor por vértice. */
export function createTerrainGeometry(): BufferGeometry {
  const geometry = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const ground = new Color(atmosphere.groundColor);
  const groundAlt = new Color(atmosphere.groundColorAlt);
  const color = new Color();

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = terrainHeight(x, z);
    position.setY(i, y);

    // Manchas mais secas no campo e na encosta da colina.
    const patches = fbm(x * 0.025 + 50, z * 0.025);
    const onHill = smoothstep(10, HILL.height * 0.8, y);
    color.lerpColors(ground, groundAlt, Math.min(1, smoothstep(0.45, 0.75, patches) * 0.7 + onHill * 0.5));
    color.multiplyScalar(0.85 + fbm(x * 0.2, z * 0.2, 2) * 0.3);
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
}

/** Uma folha (9 vértices, 7 triângulos) instanciada `count` vezes. */
export function createGrassGeometry({ count, radius, centerX, centerZ, seed }: GrassOptions): InstancedBufferGeometry {
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

    params[i * 4] = random() * Math.PI * 2;
    params[i * 4 + 1] = (0.3 + random() * 0.5) * clumps * (0.25 + 0.75 * edge);
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
  radius: number;
  height: number;
  centerX: number;
  centerZ: number;
  seed: number;
}

export function createMotesGeometry({ count, radius, height, centerX, centerZ, seed }: MotesOptions): BufferGeometry {
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt(random());
    const angle = random() * Math.PI * 2;
    positions[i * 3] = centerX + Math.cos(angle) * r;
    positions[i * 3 + 1] = random() * height;
    positions[i * 3 + 2] = centerZ + Math.sin(angle) * r;
    seeds[i] = random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  return geometry;
}
