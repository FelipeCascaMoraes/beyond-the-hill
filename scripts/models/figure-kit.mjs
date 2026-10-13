// Ferramentas de modelagem dos personagens: o que build-figure.mjs (Cassandra,
// Victor) e build-aysha.mjs têm em comum.
//
// A técnica é uma só: cada parte do corpo é uma sequência de anéis (elipses)
// ao longo de um caminho, e a pele entre os anéis é a superfície. Um tronco
// são oito anéis do quadril ao pescoço; um braço, sete do ombro ao pulso; a
// cabeça, dez do queixo ao alto do crânio. Entre os anéis escritos à mão a
// curva é interpolada, então a silhueta sai contínua. O rosto é feito de
// pequenos volumes pousados nessa cabeça: nariz, olhos, sobrancelhas, boca,
// orelhas.
//
// Tudo fica em Y para cima, rosto para +Z, pés no chão — o contrato do jogo
// (public/models/characters/README.md). Sem dependências: o GLB é escrito na
// mão. Um script modela um personagem e chama `writeFigure` uma vez.

import { writeFileSync } from "node:fs";

// --------------------------------------------------------------- vetores --

export const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const normalize = (v) => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

// ---------------------------------------------------------------- as peças --

/** Tudo que foi modelado: { material, positions, indices, skin }. */
const pieces = [];

/** O osso (ou a regra de ossos) que as peças modeladas agora seguem. */
let binding;

const keep = (part) => {
  part.skin = binding;
  pieces.push(part);
  return part;
};

/**
 * Tudo que `make` modelar segue este osso. `skin` é o nome de um osso (a peça
 * inteira vai com ele) ou uma regra `(posição) => [[osso, peso], ...]`, para
 * superfícies que atravessam uma junta e dobram com ela (ver `along`).
 */
export function bind(skin, make) {
  const before = binding;
  binding = skin;
  make();
  binding = before;
}

/**
 * Regra de ossos para uma superfície que atravessa juntas. `measure` diz onde
 * um ponto está ao longo do membro; `bones` são os ossos na ordem do caminho e
 * `cuts` as juntas entre eles: [onde, largura da faixa em que os dois dividem].
 */
export function along(measure, bones, cuts) {
  return (position) => {
    const at = measure(position);
    const weights = bones.map(() => 0);
    let share = 1;
    cuts.forEach(([where, width], index) => {
      const t = Math.min(1, Math.max(0, (at - where) / width + 0.5));
      const passed = t * t * (3 - 2 * t);
      weights[index] = share * (1 - passed);
      share *= passed;
    });
    weights[bones.length - 1] = share;
    return bones.map((bone, index) => [bone, weights[index]]);
  };
}

/** O osso do outro lado: L_ vira R_ e R_ vira L_. */
const otherSide = (bone) => bone.replace(/^([LR])_/, (_, side) => (side === "L" ? "R_" : "L_"));

/** A mesma regra de ossos, espelhada. */
function mirrorSkin(skin) {
  if (skin === undefined) return undefined;
  if (typeof skin === "string") return otherSide(skin);
  return ([x, y, z]) => skin([-x, y, z]).map(([bone, weight]) => [otherSide(bone), weight]);
}

/** Curva suave por quatro valores vizinhos (Catmull-Rom). */
const curve = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

const RING_FIELDS = ["x", "y", "z", "rx", "rzF", "rzB", "ripple", "gap"];

/** Anel escrito à mão → anel completo: [x, y, z], raio lateral, raio para a frente e para trás. */
function ring({ p, rx, rz, rzF = rz ?? rx, rzB = rz ?? rx, ripple = 0, gap = 0 }) {
  return { x: p[0], y: p[1], z: p[2], rx, rzF, rzB, ripple, gap };
}

/**
 * Uma superfície por anéis. `keys` são os anéis escritos à mão, na ordem do
 * caminho; entre eles entram `detail` anéis interpolados.
 *
 *   axis     direção fixa do caminho (os anéis ficam todos perpendiculares a
 *            ela); sem isto, cada anel fica perpendicular ao caminho ali.
 *   square   quanto a elipse se aproxima de um retângulo (2 = elipse).
 *   ripples  número de pregas em volta; a fundura de cada anel é `ripple`.
 *   open     a superfície não fecha em volta: sobra uma fenda na frente, de
 *            meia-largura `gap` (rad) em cada anel. É o casaco aberto.
 */
export function loft(material, keys, { around = 28, detail = 4, axis, square = 2, ripples = 0, open = false, caps = true } = {}) {
  const hand = keys.map(ring);
  const rings = [];
  for (let index = 0; index < hand.length - 1; index++) {
    const [a, b, c, d] = [hand[Math.max(0, index - 1)], hand[index], hand[index + 1], hand[Math.min(hand.length - 1, index + 2)]];
    for (let step = 0; step < detail; step++) {
      const t = step / detail;
      rings.push(Object.fromEntries(RING_FIELDS.map((field) => [field, curve(a[field], b[field], c[field], d[field], t)])));
    }
  }
  rings.push(hand[hand.length - 1]);

  const positions = [];
  const indices = [];
  const columns = open ? around + 1 : around;
  const exponent = 2 / square;
  const shaped = (value) => Math.sign(value) * Math.abs(value) ** exponent;
  rings.forEach((current, index) => {
    const center = [current.x, current.y, current.z];
    const before = rings[Math.max(0, index - 1)];
    const after = rings[Math.min(rings.length - 1, index + 1)];
    const tangent = axis ?? normalize([after.x - before.x, after.y - before.y, after.z - before.z]);
    // O lado do anel é o X do mundo, deitado no plano dele; a frente é o que sobra.
    const side = normalize(subtract([1, 0, 0], scale(tangent, tangent[0])));
    const front = cross(side, tangent);
    for (let column = 0; column < columns; column++) {
      const turn = column / around;
      // A volta começa na frente (+Z), para a fenda do casaco cair ali.
      const angle = Math.PI / 2 + (open ? current.gap + turn * (2 * Math.PI - 2 * current.gap) : turn * 2 * Math.PI);
      const cosine = shaped(Math.cos(angle));
      const sine = shaped(Math.sin(angle));
      const fold = 1 + current.ripple * Math.cos(ripples * angle);
      const outX = Math.max(1e-5, current.rx) * cosine * fold;
      const outZ = Math.max(1e-5, sine >= 0 ? current.rzF : current.rzB) * sine * fold;
      positions.push(add(center, add(scale(side, outX), scale(front, outZ))));
    }
  });

  const at = (row, column) => row * columns + (open ? column : column % around);
  for (let row = 0; row < rings.length - 1; row++) {
    for (let column = 0; column < around; column++) {
      const [a, b, c, d] = [at(row, column), at(row, column + 1), at(row + 1, column), at(row + 1, column + 1)];
      indices.push(a, b, d, a, d, c);
    }
  }
  if (caps && !open) {
    const last = rings.length - 1;
    positions.push([rings[0].x, rings[0].y, rings[0].z], [rings[last].x, rings[last].y, rings[last].z]);
    const bottom = positions.length - 2;
    for (let column = 0; column < around; column++) {
      indices.push(at(0, column + 1), at(0, column), bottom);
      indices.push(at(last, column), at(last, column + 1), bottom + 1);
    }
  }
  return keep({ material, positions, indices });
}

/** Um volume arredondado: centro, três raios e, se for preciso, um giro em torno de Z (rad). */
export function blob(material, center, [rx, ry, rz], { around = 16, tilt = 0 } = {}) {
  const keys = [];
  const rows = 8;
  for (let row = 0; row <= rows; row++) {
    const angle = (row / rows) * Math.PI;
    const width = Math.sin(angle);
    keys.push({ p: [0, -Math.cos(angle) * ry, 0], rx: rx * width, rz: rz * width });
  }
  const part = loft(material, keys, { around, detail: 1, axis: [0, 1, 0] });
  const [cosine, sine] = [Math.cos(tilt), Math.sin(tilt)];
  part.positions = part.positions.map(([x, y, z]) => [center[0] + x * cosine - y * sine, center[1] + x * sine + y * cosine, center[2] + z]);
  return part;
}

/**
 * Vira as faces da peça para fora. Em vez de confiar na ordem em que cada
 * superfície foi tecida, mede: se o volume em torno do meio da peça sai
 * negativo, as faces estão do avesso e todas são viradas.
 */
function faceOutward(part) {
  const middle = scale(part.positions.reduce(add, [0, 0, 0]), 1 / part.positions.length);
  let volume = 0;
  for (let at = 0; at < part.indices.length; at += 3) {
    const [a, b, c] = [0, 1, 2].map((corner) => subtract(part.positions[part.indices[at + corner]], middle));
    volume += dot(a, cross(b, c));
  }
  if (volume >= 0) return;
  for (let at = 0; at < part.indices.length; at += 3) {
    [part.indices[at + 1], part.indices[at + 2]] = [part.indices[at + 2], part.indices[at + 1]];
  }
}

/** Faz dos dois lados: o que `make` modelar vale para a esquerda e é espelhado. */
export function bothSides(make) {
  const from = pieces.length;
  make();
  for (const part of pieces.slice(from)) {
    const mirrored = keep({ material: part.material, positions: part.positions.map(([x, y, z]) => [-x, y, z]), indices: [...part.indices] });
    mirrored.skin = mirrorSkin(part.skin);
  }
}

// ---------------------------------------------------------------- o corpo --

/**
 * A cabeça: dez anéis do queixo ao alto do crânio, e o rosto pousado nela.
 * `chin` é a altura do queixo; `jaw` alarga a mandíbula (1 = a dela).
 * Devolve o perfil, para a barba seguir a mesma mandíbula.
 */
export function head({ chin, jaw = 1, skin, lips, brows, iris, lashes }) {
  // [altura acima do queixo, meia-largura, frente, trás, avanço do centro]
  const profile = [
    [0.0, 0.02 * jaw, 0.016, 0.022, 0.044],
    [0.011, 0.038 * jaw, 0.03, 0.04, 0.034],
    [0.03, 0.055 * jaw, 0.05, 0.06, 0.022],
    [0.055, 0.065 * jaw, 0.066, 0.076, 0.012],
    [0.085, 0.07, 0.077, 0.088, 0.006],
    [0.115, 0.073, 0.081, 0.096, 0.002],
    [0.15, 0.075, 0.083, 0.1, 0],
    [0.185, 0.071, 0.077, 0.097, -0.002],
    [0.214, 0.056, 0.058, 0.079, -0.006],
    [0.232, 0.018, 0.018, 0.028, -0.008],
  ];
  loft(skin, profile.map(([up, rx, rzF, rzB, forward]) => ({ p: [0, chin + up, forward], rx, rzF, rzB })), { axis: [0, 1, 0], around: 32 });

  const eyes = chin + 0.118;
  const y = (up) => chin + up;
  // Nariz: uma peça só, estreita entre os olhos e larga na ponta, que avança.
  loft(
    skin,
    [
      { p: [0, y(0.132), 0.079], rx: 0.006, rz: 0.004 },
      { p: [0, y(0.108), 0.0835], rx: 0.0075, rz: 0.0075 },
      { p: [0, y(0.088), 0.0895], rx: 0.0115, rz: 0.011 },
      { p: [0, y(0.078), 0.089], rx: 0.0125, rz: 0.0095 },
      { p: [0, y(0.072), 0.081], rx: 0.0095, rz: 0.004 },
    ],
    { around: 14 },
  );
  bothSides(() => {
    // Olho: o branco quase todo dentro do rosto, a íris na frente, a linha dos cílios e a sobrancelha em cima.
    // O rosto recua para os lados e enterra o canto de dentro do olho: a íris
    // fica no meio do que sobra à vista, e não no meio do volume.
    blob("eye", [0.032, eyes, 0.0672], [0.0138, 0.0084, 0.012]);
    blob(iris, [0.0338, eyes, 0.0735], [0.0056, 0.0058, 0.0064]);
    blob(lashes, [0.0325, eyes + 0.0076, 0.0732], [0.0148, 0.0015, 0.0062], { tilt: -0.07 });
    blob(brows, [0.0325, eyes + 0.022, 0.0745], [0.0175, 0.0032, 0.007], { tilt: -0.1 });
    // Orelha.
    blob(skin, [0.0735, y(0.108), -0.004], [0.008, 0.027, 0.016]);
  });
  // Boca: o lábio de cima mais fino que o de baixo.
  blob(lips, [0, y(0.052), 0.0745], [0.021 * jaw, 0.0048, 0.008]);
  blob(lips, [0, y(0.0445), 0.0735], [0.018 * jaw, 0.0056, 0.008]);
  return profile;
}

/**
 * A mão, na direção do antebraço: palma e dedos numa peça só, e o polegar.
 * Com `glove`, a palma é desse material e só os dedos ficam de pele.
 */
export function hand(skin, wrist, direction, size = 1, glove) {
  if (glove) return glovedHand(skin, glove, wrist, direction, size);
  const along = (distance) => add(wrist, scale(direction, distance * size));
  loft(
    skin,
    [
      { p: along(-0.01), rx: 0.024 * size, rz: 0.028 * size },
      { p: along(0.035), rx: 0.021 * size, rz: 0.04 * size },
      { p: along(0.08), rx: 0.018 * size, rz: 0.042 * size },
      { p: along(0.125), rx: 0.014 * size, rz: 0.035 * size },
      { p: along(0.162), rx: 0.008 * size, rz: 0.022 * size },
    ],
    { around: 16 },
  );
  loft(
    skin,
    [
      { p: add(along(0.025), [0, 0, 0.03 * size]), rx: 0.012 * size },
      { p: add(along(0.07), [0, 0, 0.052 * size]), rx: 0.011 * size },
      { p: add(along(0.108), [0, 0, 0.056 * size]), rx: 0.007 * size },
    ],
    { around: 10 },
  );
}

/** A mão de luva sem dedos: a luva cobre o pulso, a palma e o começo do polegar. */
function glovedHand(skin, glove, wrist, direction, size) {
  const along = (distance) => add(wrist, scale(direction, distance * size));
  loft(
    glove,
    [
      { p: along(-0.035), rx: 0.029 * size, rz: 0.031 * size },
      { p: along(0.0), rx: 0.027 * size, rz: 0.033 * size },
      { p: along(0.04), rx: 0.0235 * size, rz: 0.043 * size },
      { p: along(0.088), rx: 0.0205 * size, rz: 0.0445 * size },
    ],
    { around: 16 },
  );
  loft(
    skin,
    [
      { p: along(0.08), rx: 0.0175 * size, rz: 0.041 * size },
      { p: along(0.125), rx: 0.014 * size, rz: 0.035 * size },
      { p: along(0.162), rx: 0.008 * size, rz: 0.022 * size },
    ],
    { around: 16 },
  );
  loft(glove, [{ p: add(along(0.022), [0, 0, 0.03 * size]), rx: 0.0145 * size }, { p: add(along(0.062), [0, 0, 0.05 * size]), rx: 0.0135 * size }], { around: 10 });
  loft(skin, [{ p: add(along(0.058), [0, 0, 0.049 * size]), rx: 0.011 * size }, { p: add(along(0.108), [0, 0, 0.056 * size]), rx: 0.007 * size }], { around: 10 });
}

/** Um braço: os anéis da manga, do ombro ao pulso, e a mão na ponta. */
export function arm(sleeve, skin, keys, handSize) {
  loft(sleeve, keys, { around: 20 });
  const wrist = keys[keys.length - 1].p;
  hand(skin, wrist, normalize(subtract(wrist, keys[keys.length - 2].p)), handSize);
}

// ---------------------------------------------------------------- normais --

/** Faces vizinhas com menos que este ângulo entre si formam uma superfície só (rad). */
const SMOOTH_ANGLE = (55 * Math.PI) / 180;

/**
 * Normais de uma peça: em cada canto de triângulo, a média (pesada pela área)
 * das faces vizinhas que dobram menos que SMOOTH_ANGLE. Cantos que ficam com
 * a mesma normal voltam a dividir o vértice.
 */
function smooth(piece) {
  // Vértices no mesmo lugar contam como um só (os polos de um volume, a emenda de um anel).
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
    if (Math.hypot(...area) < 1e-13) continue;
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

const srgbToLinear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const color = (hex) => [...[1, 3, 5].map((at) => srgbToLinear(parseInt(hex.slice(at, at + 2), 16) / 255)), 1];

const WIDTHS = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 };
const FLOAT = 5126;
const VERTEX_DATA = 34962;
const INDEX_DATA = 34963;

/**
 * Escreve tudo que foi modelado num GLB.
 *
 *   materials  { nome: { hex, roughness, doubleSided? } }: a cor de base (sRGB)
 *              e a aspereza de cada material usado pelas peças.
 *   rig        opcional: o esqueleto e as animações.
 *              bones: [{ name, parent, joint: [x, y, z] }], pais antes dos filhos;
 *              prefix: o que vem antes do nome de cada osso no arquivo;
 *              clips: [{ name, times: Float32Array, tracks: { osso: Float32Array de quaternions } }].
 *              Com esqueleto, toda peça precisa ter sido modelada dentro de um `bind`.
 */
export function writeFigure({ title, target, generator, materials, rig }) {
  pieces.forEach(faceOutward);
  const unknown = pieces.find((piece) => !(piece.material in materials));
  if (unknown) throw new Error(`Material "${unknown.material}" não está na lista de materiais.`);

  const chunks = [];
  let binLength = 0;
  const output = {
    asset: { version: "2.0", generator },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: title, children: [] }],
    meshes: [],
    materials: [],
    ...(rig ? { skins: [], animations: [] } : {}),
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

  // Os ossos: sem giro em repouso, cada um na sua junta.
  const boneNode = {};
  const boneIndex = {};
  if (rig) {
    const jointOf = Object.fromEntries(rig.bones.map((bone) => [bone.name, bone.joint]));
    rig.bones.forEach((bone, index) => {
      const origin = bone.parent ? jointOf[bone.parent] : [0, 0, 0];
      boneIndex[bone.name] = index;
      boneNode[bone.name] = output.nodes.length;
      output.nodes.push({ name: rig.prefix + bone.name, translation: subtract(bone.joint, origin) });
      const parentNode = output.nodes[bone.parent ? boneNode[bone.parent] : 0];
      (parentNode.children ??= []).push(boneNode[bone.name]);
    });
    const inverseBind = new Float32Array(rig.bones.length * 16);
    rig.bones.forEach(({ joint }, index) => inverseBind.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -joint[0], -joint[1], -joint[2], 1], index * 16));
    output.skins.push({
      name: `${title}_Humanoid_Rig`,
      joints: rig.bones.map((bone) => boneNode[bone.name]),
      skeleton: boneNode[rig.bones[0].name],
      inverseBindMatrices: addAccessor(inverseBind, "MAT4", FLOAT),
    });
  }

  /** Os ossos de um vértice: até quatro, com os pesos somando 255. */
  function weightsAt(piece, position) {
    if (piece.skin === undefined) throw new Error(`Uma peça de "${piece.material}" foi modelada fora de um bind: não segue osso nenhum.`);
    const list = (typeof piece.skin === "string" ? [[piece.skin, 1]] : piece.skin(position)).filter(([, weight]) => weight > 1e-4);
    list.sort((a, b) => b[1] - a[1]);
    const kept = list.slice(0, 4);
    const total = kept.reduce((sum, [, weight]) => sum + weight, 0);
    const bytes = kept.map(([, weight]) => Math.round((weight / total) * 255));
    bytes[0] += 255 - bytes.reduce((sum, value) => sum + value, 0);
    return kept.map(([bone], index) => {
      if (!(bone in boneIndex)) throw new Error(`Osso "${bone}" não existe no esqueleto.`);
      return [boneIndex[bone], bytes[index]];
    });
  }

  // As malhas: uma por material, com todas as peças daquele material dentro.
  let triangles = 0;
  for (const [name, material] of Object.entries(materials)) {
    const own = pieces.filter((piece) => piece.material === name).map((piece) => ({ piece, ...smooth(piece) }));
    if (own.length === 0) continue;
    const vertexCount = own.reduce((sum, part) => sum + part.positions.length, 0);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const skinIndex = new Uint8Array(vertexCount * 4);
    const skinWeight = new Uint8Array(vertexCount * 4);
    const indices = [];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let vertex = 0;
    for (const part of own) {
      for (const index of part.indices) indices.push(vertex + index);
      part.positions.forEach((position, at) => {
        positions.set(position, vertex * 3);
        normals.set(part.normals[at], vertex * 3);
        if (rig) {
          weightsAt(part.piece, position).forEach(([bone, weight], slot) => {
            skinIndex[vertex * 4 + slot] = bone;
            skinWeight[vertex * 4 + slot] = weight;
          });
        }
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
    output.materials.push({
      name: `${title}_${name}`,
      pbrMetallicRoughness: { baseColorFactor: color(material.hex), metallicFactor: 0, roughnessFactor: material.roughness },
      ...(material.doubleSided ? { doubleSided: true } : {}),
    });
    const attributes = {
      POSITION: addAccessor(positions, "VEC3", FLOAT, { min, max }, VERTEX_DATA),
      NORMAL: addAccessor(normals, "VEC3", FLOAT, {}, VERTEX_DATA),
    };
    if (rig) {
      attributes.JOINTS_0 = addAccessor(skinIndex, "VEC4", 5121, {}, VERTEX_DATA);
      attributes.WEIGHTS_0 = addAccessor(skinWeight, "VEC4", 5121, { normalized: true }, VERTEX_DATA);
    }
    output.meshes.push({
      name: `${title}_${name}`,
      primitives: [
        {
          attributes,
          indices: addAccessor(wide ? new Uint32Array(indices) : new Uint16Array(indices), "SCALAR", wide ? 5125 : 5123, {}, INDEX_DATA),
          material: output.materials.length - 1,
        },
      ],
    });
    output.nodes[0].children.push(output.nodes.length);
    output.nodes.push({ name: `${title}_${name}`, mesh: output.meshes.length - 1, ...(rig ? { skin: 0 } : {}) });
  }

  // Os clipes: um giro por osso, já amostrado por quem chamou.
  for (const clip of rig?.clips ?? []) {
    const input = addAccessor(clip.times, "SCALAR", FLOAT, { min: [0], max: [clip.times[clip.times.length - 1]] });
    const animation = { name: clip.name, samplers: [], channels: [] };
    for (const [bone, values] of Object.entries(clip.tracks)) {
      animation.channels.push({ sampler: animation.samplers.length, target: { node: boneNode[bone], path: "rotation" } });
      animation.samplers.push({ input, output: addAccessor(values, "VEC4", FLOAT), interpolation: "LINEAR" });
    }
    output.animations.push(animation);
  }

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
  writeFileSync(target, glb);

  const rigged = rig ? `, ${rig.bones.length} ossos, clipes ${rig.clips.map((clip) => clip.name).join(", ")}` : "";
  console.log(`${target}\n  ${pieces.length} peças em ${output.meshes.length} malhas, ${triangles} triângulos${rigged} — ${(glb.length / 1024).toFixed(0)} kB`);
}
