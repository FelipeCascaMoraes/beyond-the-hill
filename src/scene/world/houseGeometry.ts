import { BoxGeometry, BufferAttribute, Color, ExtrudeGeometry, Shape, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HOUSE, HOUSE_DOOR, HOUSE_WALLS, HOUSE_WINDOW } from "@/game/world/house";
import { createRandom } from "@/game/world/noise";

// Casa abandonada em uma única geometria (1 draw call), com cor por vértice.
// Coordenadas locais: origem no chão, no centro da casa (ver game/world/house.ts).

// Madeira velha: marrons acinzentados, desbotados pelo tempo.
const COLORS = {
  floor: "#46392c",
  wall: "#6b6154",
  gable: "#62584b",
  roof: "#3b352e",
  frame: "#4e4236",
  door: "#595045",
  debris: "#51473b",
} as const;

/** Altura de cada tábua das paredes (m). */
const PLANK = 0.24;
/** Chance de uma tábua ter caído (deixa frestas de luz). */
const MISSING_PLANK = 0.05;

const W = HOUSE.width;
const D = HOUSE.depth;
const H = HOUSE.wallHeight;
const T = HOUSE.wallThickness;
const RIDGE = HOUSE.ridgeHeight;
const EAVE = 0.35;

/** Converte para não indexada e pinta com a cor (com leve variação: madeira gasta). */
function painted(geometry: BufferGeometry, hex: string, random: () => number): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const color = new Color(hex).multiplyScalar(0.82 + random() * 0.3);
  const count = flat.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  flat.setAttribute("color", new BufferAttribute(colors, 3));
  // Só posição, normal e cor: as partes precisam dos mesmos atributos para unir.
  flat.deleteAttribute("uv");
  return flat;
}

function box(sizeX: number, sizeY: number, sizeZ: number, x: number, y: number, z: number, rotX = 0, rotY = 0, rotZ = 0) {
  const geometry = new BoxGeometry(sizeX, sizeY, sizeZ);
  if (rotX) geometry.rotateX(rotX);
  if (rotY) geometry.rotateY(rotY);
  if (rotZ) geometry.rotateZ(rotZ);
  geometry.translate(x, y, z);
  return geometry;
}

/** Empena triangular (leste/oeste) acima das paredes. */
function gable(x: number) {
  const shape = new Shape();
  shape.moveTo(-D / 2, H);
  shape.lineTo(D / 2, H);
  shape.lineTo(0, RIDGE);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
  // Forma no plano XY → plano ZY, espessura ao longo de X.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(x + T / 2, 0, 0);
  return geometry;
}

export function createHouseGeometry(): BufferGeometry {
  const random = createRandom(53);
  const parts: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, hex: string) => parts.push(painted(geometry, hex, random));

  // Piso de tábuas.
  add(box(W - T, HOUSE.floorThickness, D - T, 0, HOUSE.floorThickness / 2, 0), COLORS.floor);

  // Paredes: os blocos da planta (os mesmos da colisão), feitos de tábuas
  // horizontais com tons diferentes, leve relevo e algumas faltando.
  for (const wall of HOUSE_WALLS) {
    const rows = Math.max(1, Math.round(wall.height / PLANK));
    const plankHeight = wall.height / rows;
    // A parede oeste segura o desenho: fica inteira.
    const holdsDrawing = wall.x < 0 && wall.sizeZ > wall.sizeX;
    for (let row = 0; row < rows; row++) {
      // Nunca some a primeira nem a última tábua: a parede continua de pé.
      const inner = row > 0 && row < rows - 1;
      const missing = random() < MISSING_PLANK;
      if (inner && missing && !holdsDrawing) continue;
      const relief = (random() - 0.5) * 0.02;
      const y = wall.y0 + plankHeight * (row + 0.5);
      add(
        box(
          wall.sizeX + (wall.sizeX > wall.sizeZ ? 0 : relief),
          plankHeight * 0.96,
          wall.sizeZ + (wall.sizeX > wall.sizeZ ? relief : 0),
          wall.x,
          y,
          wall.z,
        ),
        COLORS.wall,
      );
    }
  }

  // Empenas.
  add(gable(-W / 2), COLORS.gable);
  add(gable(W / 2), COLORS.gable);

  // Telhado: água norte inteira; água sul pela metade (o resto desabou).
  const run = D / 2 + EAVE;
  const rise = RIDGE - H + 0.1;
  const slope = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, run);
  const roofY = H - 0.05 + rise / 2;
  add(box(W + 0.4, 0.08, slope, 0, roofY, -run / 2, -pitch), COLORS.roof);
  add(box((W + 0.4) * 0.55, 0.08, slope, -(W + 0.4) * 0.225, roofY, run / 2, pitch), COLORS.roof);
  // Pedaço do telhado caído dentro da casa, apoiado na parede sul.
  add(box(1.3, 0.07, 2.1, 1.7, 0.75, 1.55, 0.72, 0.25, 0.08), COLORS.roof);

  // Moldura da janela (virada para a colina).
  const winHalf = HOUSE_WINDOW.width / 2;
  const winMidY = (HOUSE_WINDOW.sill + HOUSE_WINDOW.top) / 2;
  const winHeight = HOUSE_WINDOW.top - HOUSE_WINDOW.sill;
  add(box(HOUSE_WINDOW.width + 0.1, 0.07, T + 0.08, HOUSE_WINDOW.x, HOUSE_WINDOW.sill, -D / 2), COLORS.frame);
  add(box(HOUSE_WINDOW.width + 0.1, 0.07, T + 0.04, HOUSE_WINDOW.x, HOUSE_WINDOW.top, -D / 2), COLORS.frame);
  add(box(0.07, winHeight, T + 0.04, HOUSE_WINDOW.x - winHalf, winMidY, -D / 2), COLORS.frame);
  add(box(0.07, winHeight, T + 0.04, HOUSE_WINDOW.x + winHalf, winMidY, -D / 2), COLORS.frame);

  // Porta: escancarada para dentro, quase encostada na parede leste (não bloqueia a passagem).
  // Fechada, a folha vai da dobradiça (norte do vão) para +Z; aberta, gira para -Z.
  const doorAngle = (170 * Math.PI) / 180;
  const hingeZ = HOUSE_DOOR.z - HOUSE_DOOR.width / 2;
  add(box(0.05, HOUSE_DOOR.height - 0.05, HOUSE_DOOR.width - 0.05, 0, 0, 0, 0, -doorAngle), COLORS.door);
  const door = parts[parts.length - 1];
  door.translate(W / 2 - T - Math.sin(doorAngle) * 0.52, HOUSE_DOOR.height / 2, hingeZ + Math.cos(doorAngle) * 0.52);

  // Entulho do rombo na parede sul, do lado de fora.
  add(box(1.1, 0.08, 0.2, -1.7, 0.1, D / 2 + 0.5, 0, 0.4, 0.15), COLORS.debris);
  add(box(0.9, 0.08, 0.18, -1.35, 0.06, D / 2 + 0.85, 0, -0.3, 0), COLORS.debris);

  const house = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  house.computeBoundingSphere();
  return house;
}
