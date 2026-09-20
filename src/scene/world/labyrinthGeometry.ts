import { BoxGeometry, BufferAttribute, Color, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LABYRINTH, wallRuns } from "@/game/world/labyrinth";
import { createRandom } from "@/game/world/noise";

// O labirinto inteiro em uma geometria só (1 draw call), com cor por vértice.
// Coordenadas locais: origem no chão, no centro do labirinto.
//
// As paredes são os mesmos blocos que bloqueiam a passagem (game/world/labyrinth.ts):
// aqui elas só ganham altura, uma coroa de pedra no topo e a cor gasta do lugar.

/** Pedra escura e úmida, com variação por bloco. */
const STONE = "#5d5a53";
/** A coroa do topo, mais clara: dá o recorte contra o céu. */
const CAP = "#736d62";
/** Altura da coroa (m) e o quanto ela avança para os lados. */
const CAP_HEIGHT = 0.12;
const CAP_OVERHANG = 0.06;

function painted(geometry: BufferGeometry, hex: string, shade: number): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const color = new Color(hex).multiplyScalar(shade);
  const count = flat.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  flat.setAttribute("color", new BufferAttribute(colors, 3));
  // Só posição, normal e cor: as partes precisam dos mesmos atributos para unir.
  flat.deleteAttribute("uv");
  return flat;
}

function block(sizeX: number, sizeY: number, sizeZ: number, x: number, y: number, z: number): BoxGeometry {
  const geometry = new BoxGeometry(sizeX, sizeY, sizeZ);
  geometry.translate(x, y + sizeY / 2, z);
  return geometry;
}

/** Geometria do labirinto, em coordenadas locais ao seu centro. */
export function createLabyrinthGeometry(): BufferGeometry {
  const random = createRandom(97);
  const height = LABYRINTH.wallHeight - CAP_HEIGHT;
  const parts: BufferGeometry[] = [];

  for (const run of wallRuns()) {
    const x = run.x - LABYRINTH.x;
    const z = run.z - LABYRINTH.z;
    // Cada bloco assenta um pouco diferente: a muralha não é de fábrica.
    const settle = (random() - 0.5) * 0.05;
    parts.push(painted(block(run.sizeX, height + settle, run.sizeZ, x, -0.05, z), STONE, 0.85 + random() * 0.3));
    parts.push(
      painted(
        block(run.sizeX + CAP_OVERHANG, CAP_HEIGHT, run.sizeZ + CAP_OVERHANG, x, height + settle - 0.05, z),
        CAP,
        0.85 + random() * 0.3,
      ),
    );
  }

  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  merged.computeVertexNormals();
  return merged;
}
