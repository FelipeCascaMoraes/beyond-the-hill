// Prepara o modelo de um personagem parado (Cassandra, Victor) para o jogo:
//
//   node scripts/models/build-figure.mjs cassandra
//   node scripts/models/build-figure.mjs victor
//
// Lê scripts/models/<nome>.source.glb e escreve
// public/models/characters/<nome>.glb no contrato que o jogo espera
// (public/models/characters/README.md). O arquivo de origem vem:
//
//   • deitado para o glTF: Z para cima e o rosto para -Y. Aqui vira Y para
//     cima, rosto para +Z;
//   • em 25 malhas, uma por peça: aqui viram uma por material;
//   • sem normais: o jogo desenharia cada triângulo como uma faceta. Aqui as
//     superfícies curvas ganham normais suaves, e as quinas continuam quinas;
//   • com algumas peças menores do que o personagem pede (ver FIGURES).
//
// Sem esqueleto e sem animação: os dois esperam de pé. Sem dependências: lê e
// escreve o GLB na mão, como build-aysha.mjs.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NAME = process.argv[2];

/**
 * O que cada arquivo precisa para chegar ao personagem descrito no jogo.
 * `stretchDown`: estica a peça para baixo até a altura dada (m, no arquivo),
 * segurando o topo. `widen`: alarga a peça em volta do próprio eixo.
 * `colors`: cor de base das peças cujo nome casa, em sRGB.
 */
const FIGURES = {
  cassandra: {
    title: "Cassandra",
    adjust: [
      // O vestido do arquivo para no joelho; o dela vai até os pés, e cai mais reto.
      { piece: /^DressSkirt/, stretchDown: 0.06, widen: 0.8 },
    ],
    // Vinho escuro, no lugar do vinho aberto do arquivo.
    colors: [
      { piece: /^(DressSkirt|Torso|UpperArm)/, color: "#4a1226" },
      // E o cabelo dela é preto.
      { piece: /^Hair/, color: "#17120f" },
    ],
  },
  victor: {
    title: "Victor",
    adjust: [
      // Chapéu de aba larga: a aba do arquivo mal passa da cabeça.
      { piece: /^HatBrim/, widen: 1.8 },
      { piece: /^HatCrown/, widen: 1.2 },
      // O casaco comprido desce até a canela.
      { piece: /^LongCoat/, stretchDown: 0.3 },
    ],
    // Couro marrom-escuro, no lugar do azul quase preto do arquivo.
    colors: [{ piece: /^(LongCoat|Sleeve|Elbow)/, color: "#3a2a1e" }],
  },
};

const figure = FIGURES[NAME];
if (!figure) throw new Error(`Uso: node scripts/models/build-figure.mjs <${Object.keys(FIGURES).join("|")}>`);

const SOURCE = fileURLToPath(new URL(`./${NAME}.source.glb`, import.meta.url));
const TARGET = process.argv[3] ?? fileURLToPath(new URL(`../../public/models/characters/${NAME}.glb`, import.meta.url));

/** Faces vizinhas com menos que este ângulo entre si formam uma superfície só (rad). */
const SMOOTH_ANGLE = (50 * Math.PI) / 180;

// ---------------------------------------------------------------- leitura --

const COMPONENTS = {
  5120: ["readInt8", 1],
  5121: ["readUInt8", 1],
  5122: ["readInt16LE", 2],
  5123: ["readUInt16LE", 2],
  5125: ["readUInt32LE", 4],
  5126: ["readFloatLE", 4],
};
const WIDTHS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

const file = readFileSync(SOURCE);
if (file.readUInt32LE(0) !== 0x46546c67) throw new Error(`${SOURCE} não é um GLB.`);
const jsonLength = file.readUInt32LE(12);
const source = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
const binStart = 20 + jsonLength + 8;

/** Um accessor como lista de linhas (uma por vértice ou índice). */
function readAccessor(index) {
  const accessor = source.accessors[index];
  const view = source.bufferViews[accessor.bufferView];
  const [read, bytes] = COMPONENTS[accessor.componentType];
  const width = WIDTHS[accessor.type];
  const stride = view.byteStride ?? bytes * width;
  const start = binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const rows = [];
  for (let row = 0; row < accessor.count; row++) {
    const values = [];
    for (let column = 0; column < width; column++) values.push(file[read](start + row * stride + column * bytes));
    rows.push(values);
  }
  return rows;
}

const srgbToLinear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const hexToLinear = (hex) => [1, 3, 5].map((at) => srgbToLinear(parseInt(hex.slice(at, at + 2), 16) / 255));

/** Os materiais do arquivo final: os de origem, mais os das cores trocadas. */
const materials = source.materials.map((material, index) => ({ ...material, name: material.name ?? `${figure.title}_${index}` }));

/** As peças do arquivo, já de pé (Y para cima, rosto para +Z) e ajustadas. */
const pieces = [];
for (const node of source.nodes) {
  if (node.mesh === undefined) continue;
  if (node.translation || node.rotation || node.scale || node.matrix) {
    throw new Error(`A peça "${node.name}" tem transformação própria; o script espera todas na origem.`);
  }
  const mesh = source.meshes[node.mesh];
  for (const primitive of mesh.primitives) {
    const positions = readAccessor(primitive.attributes.POSITION).map(([x, y, z]) => [x, z, -y]);
    const indices =
      primitive.indices === undefined ? positions.map((_, index) => index) : readAccessor(primitive.indices).map(([index]) => index);

    for (const { piece, stretchDown, widen } of figure.adjust) {
      if (!piece.test(mesh.name)) continue;
      const ys = positions.map((position) => position[1]);
      const top = Math.max(...ys);
      const bottom = Math.min(...ys);
      if (stretchDown !== undefined) {
        const factor = (top - stretchDown) / (top - bottom);
        for (const position of positions) position[1] = top - (top - position[1]) * factor;
      }
      if (widen !== undefined) {
        const xs = positions.map((position) => position[0]);
        const zs = positions.map((position) => position[2]);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
        for (const position of positions) {
          position[0] = centerX + (position[0] - centerX) * widen;
          position[2] = centerZ + (position[2] - centerZ) * widen;
        }
      }
    }

    let material = primitive.material;
    const recolor = figure.colors.find(({ piece }) => piece.test(mesh.name));
    if (recolor) {
      const name = `${figure.title}_${recolor.color}`;
      material = materials.findIndex((candidate) => candidate.name === name);
      if (material < 0) {
        const base = source.materials[primitive.material];
        materials.push({ ...base, name, pbrMetallicRoughness: { ...base.pbrMetallicRoughness, baseColorFactor: [...hexToLinear(recolor.color), 1] } });
        material = materials.length - 1;
      }
    }

    pieces.push({ name: mesh.name, material, positions, indices });
  }
}

// ---------------------------------------------------------------- normais --

const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v) => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

/**
 * Normais de uma peça: em cada canto de triângulo, a média (pesada pela área)
 * das faces vizinhas que dobram menos que SMOOTH_ANGLE. Cantos que ficam com
 * a mesma normal voltam a dividir o vértice.
 */
function smooth(piece) {
  // Vértices no mesmo lugar contam como um só, mesmo se o arquivo os duplicou.
  const welded = new Map();
  const weldOf = piece.positions.map((position) => {
    const key = position.map((value) => Math.round(value * 1e5)).join(",");
    if (!welded.has(key)) welded.set(key, welded.size);
    return welded.get(key);
  });

  const faces = [];
  const facesAt = new Map();
  for (let at = 0; at < piece.indices.length; at += 3) {
    const corners = [piece.indices[at], piece.indices[at + 1], piece.indices[at + 2]];
    const [a, b, c] = corners.map((index) => piece.positions[index]);
    const area = cross(subtract(b, a), subtract(c, a));
    if (Math.hypot(...area) < 1e-12) continue;
    faces.push({ corners, area, normal: normalize(area) });
    for (const corner of corners) {
      const list = facesAt.get(weldOf[corner]) ?? [];
      list.push(faces.length - 1);
      facesAt.set(weldOf[corner], list);
    }
  }

  const limit = Math.cos(SMOOTH_ANGLE);
  const positions = [];
  const normals = [];
  const indices = [];
  const emitted = new Map();
  for (const face of faces) {
    for (const corner of face.corners) {
      const sum = [0, 0, 0];
      for (const other of facesAt.get(weldOf[corner])) {
        if (dot(faces[other].normal, face.normal) < limit) continue;
        for (let axis = 0; axis < 3; axis++) sum[axis] += faces[other].area[axis];
      }
      const normal = normalize(sum);
      const key = `${weldOf[corner]}|${normal.map((value) => Math.round(value * 1e3)).join(",")}`;
      if (!emitted.has(key)) {
        emitted.set(key, positions.length);
        positions.push(piece.positions[corner]);
        normals.push(normal);
      }
      indices.push(emitted.get(key));
    }
  }
  return { positions, normals, indices };
}

// ---------------------------------------------------------------- escrita --

const chunks = [];
let binLength = 0;
const output = {
  asset: { version: "2.0", generator: "beyond-the-hill/scripts/models/build-figure.mjs" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: figure.title, children: [] }],
  meshes: [],
  materials: [],
  accessors: [],
  bufferViews: [],
  buffers: [],
};

/** Guarda um bloco de dados e devolve o índice do accessor que o descreve. */
function addAccessor(array, type, componentType, extra, target) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const padding = (4 - (bytes.length % 4)) % 4;
  output.bufferViews.push({ buffer: 0, byteOffset: binLength, byteLength: bytes.length, target });
  chunks.push(bytes, Buffer.alloc(padding));
  binLength += bytes.length + padding;
  output.accessors.push({ bufferView: output.bufferViews.length - 1, componentType, count: array.length / WIDTHS[type], type, ...extra });
  return output.accessors.length - 1;
}

const FLOAT = 5126;
const VERTEX_DATA = 34962;
const INDEX_DATA = 34963;

// As malhas: uma por material, com todas as peças daquele material dentro.
let triangles = 0;
materials.forEach((material, materialIndex) => {
  const own = pieces.filter((piece) => piece.material === materialIndex).map(smooth);
  if (own.length === 0) return;
  const vertexCount = own.reduce((sum, piece) => sum + piece.positions.length, 0);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let vertex = 0;
  for (const piece of own) {
    for (const index of piece.indices) indices.push(vertex + index);
    piece.positions.forEach((position, at) => {
      positions.set(position, vertex * 3);
      normals.set(piece.normals[at], vertex * 3);
      for (let axis = 0; axis < 3; axis++) {
        // Os limites são conferidos contra o que foi gravado, em 32 bits.
        const stored = positions[vertex * 3 + axis];
        min[axis] = Math.min(min[axis], stored);
        max[axis] = Math.max(max[axis], stored);
      }
      vertex++;
    });
  }
  triangles += indices.length / 3;

  const wide = vertexCount > 65535;
  output.materials.push(material);
  output.meshes.push({
    name: material.name,
    primitives: [
      {
        attributes: {
          POSITION: addAccessor(positions, "VEC3", FLOAT, { min, max }, VERTEX_DATA),
          NORMAL: addAccessor(normals, "VEC3", FLOAT, {}, VERTEX_DATA),
        },
        indices: addAccessor(wide ? new Uint32Array(indices) : new Uint16Array(indices), "SCALAR", wide ? 5125 : 5123, {}, INDEX_DATA),
        material: output.materials.length - 1,
      },
    ],
  });
  output.nodes[0].children.push(output.nodes.length);
  output.nodes.push({ name: material.name, mesh: output.meshes.length - 1 });
});

output.buffers.push({ byteLength: binLength });
let json = Buffer.from(JSON.stringify(output), "utf8");
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, " ")]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + binLength, 8);
const chunkHeader = (length, type) => {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32LE(length, 0);
  buffer.writeUInt32LE(type, 4);
  return buffer;
};
const glb = Buffer.concat([header, chunkHeader(json.length, 0x4e4f534a), json, chunkHeader(binLength, 0x004e4942), ...chunks]);
writeFileSync(TARGET, glb);

console.log(`${TARGET}\n  ${pieces.length} peças em ${output.meshes.length} malhas, ${triangles} triângulos — ${(glb.length / 1024).toFixed(0)} kB`);
