// Modela a Cassandra e o Victor para o jogo:
//
//   node scripts/models/build-figure.mjs cassandra
//   node scripts/models/build-figure.mjs victor
//
// Escreve public/models/characters/<nome>.glb no contrato que o jogo espera
// (public/models/characters/README.md): Y para cima, rosto para +Z, pés no
// chão. Não parte de arquivo nenhum — o corpo inteiro é desenhado aqui.
//
// A técnica é uma só: cada parte do corpo é uma sequência de anéis (elipses)
// ao longo de um caminho, e a pele entre os anéis é a superfície. Um tronco
// são oito anéis do quadril ao pescoço; um braço, sete do ombro ao pulso; a
// cabeça, dez do queixo ao alto do crânio. Entre os anéis escritos à mão a
// curva é interpolada, então a silhueta sai contínua. O rosto é feito de
// pequenos volumes pousados nessa cabeça: nariz, olhos, sobrancelhas, boca,
// orelhas.
//
// Sem esqueleto e sem animação: os dois esperam de pé. Sem dependências:
// escreve o GLB na mão, como build-aysha.mjs.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NAME = process.argv[2];
const TARGETS = ["cassandra", "victor"];
if (!TARGETS.includes(NAME)) throw new Error(`Uso: node scripts/models/build-figure.mjs <${TARGETS.join("|")}>`);
const TARGET = process.argv[3] ?? fileURLToPath(new URL(`../../public/models/characters/${NAME}.glb`, import.meta.url));

// --------------------------------------------------------------- vetores --

const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v) => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

// ---------------------------------------------------------------- as peças --

/** Tudo que foi modelado: { material, positions, indices }. */
const pieces = [];

const keep = (part) => {
  pieces.push(part);
  return part;
};

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
function loft(material, keys, { around = 28, detail = 4, axis, square = 2, ripples = 0, open = false, caps = true } = {}) {
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
function blob(material, center, [rx, ry, rz], { around = 16, tilt = 0 } = {}) {
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
function bothSides(make) {
  const from = pieces.length;
  make();
  for (const part of pieces.slice(from)) {
    keep({ material: part.material, positions: part.positions.map(([x, y, z]) => [-x, y, z]), indices: [...part.indices] });
  }
}

// ---------------------------------------------------------------- o corpo --

/**
 * A cabeça: dez anéis do queixo ao alto do crânio, e o rosto pousado nela.
 * `chin` é a altura do queixo; `jaw` alarga a mandíbula (1 = a dela).
 * Devolve o perfil, para a barba seguir a mesma mandíbula.
 */
function head({ chin, jaw = 1, skin, lips, brows, iris, lashes }) {
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

/** A mão, na direção do antebraço: palma e dedos numa peça só, e o polegar. */
function hand(skin, wrist, direction, size = 1) {
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

/** Um braço: os anéis da manga, do ombro ao pulso, e a mão na ponta. */
function arm(sleeve, skin, keys, handSize) {
  loft(sleeve, keys, { around: 20 });
  const wrist = keys[keys.length - 1].p;
  hand(skin, wrist, normalize(subtract(wrist, keys[keys.length - 2].p)), handSize);
}

// -------------------------------------------------------------- Cassandra --
//
// Vestido vinho até os pés, de mangas compridas com o ombro bufante e o decote
// largo; o cabelo preto preso num coque alto, com duas mechas soltas.

function cassandra() {
  const chin = 1.47;
  head({ chin, skin: "skin", lips: "lips", brows: "hair", iris: "iris", lashes: "hair" });

  // Pescoço e colo, de pele; o corpete começa abaixo deles.
  loft("skin", [{ p: [0, 1.4, -0.012], rx: 0.047 }, { p: [0, 1.44, -0.01], rx: 0.044 }, { p: [0, 1.5, -0.004], rx: 0.045 }], { axis: [0, 1, 0] });
  loft(
    "skin",
    [
      { p: [0, 1.33, 0], rx: 0.148, rzF: 0.105, rzB: 0.096 },
      { p: [0, 1.38, 0], rx: 0.152, rzF: 0.09, rzB: 0.096 },
      { p: [0, 1.415, -0.004], rx: 0.14, rzF: 0.074, rzB: 0.088 },
      { p: [0, 1.44, -0.008], rx: 0.085, rzF: 0.058, rzB: 0.07 },
      { p: [0, 1.46, -0.01], rx: 0.05, rzF: 0.046, rzB: 0.052 },
    ],
    { axis: [0, 1, 0], square: 2.3 },
  );
  // Gargantilha, com uma pedra na frente.
  loft("hair", [{ p: [0, 1.447, -0.009], rx: 0.0465 }, { p: [0, 1.462, -0.008], rx: 0.0465 }], { axis: [0, 1, 0], detail: 1 });
  blob("jewel", [0, 1.452, 0.038], [0.007, 0.008, 0.004]);

  // O vestido no tronco: quadril, cintura fina, busto, e a borda do decote.
  loft(
    "dress",
    [
      { p: [0, 0.96, 0], rx: 0.168, rzF: 0.108, rzB: 0.118 },
      { p: [0, 1.02, 0], rx: 0.15, rzF: 0.096, rzB: 0.102 },
      { p: [0, 1.085, 0], rx: 0.118, rzF: 0.083, rzB: 0.086 },
      { p: [0, 1.16, 0], rx: 0.128, rzF: 0.093, rzB: 0.09 },
      { p: [0, 1.235, 0], rx: 0.141, rzF: 0.104, rzB: 0.095 },
      { p: [0, 1.29, 0], rx: 0.151, rzF: 0.128, rzB: 0.099 },
      { p: [0, 1.335, 0], rx: 0.155, rzF: 0.118, rzB: 0.101 },
      { p: [0, 1.368, 0], rx: 0.157, rzF: 0.099, rzB: 0.101 },
    ],
    { axis: [0, 1, 0], square: 2.3, around: 32 },
  );
  // O corpete por cima, mais escuro: da cintura até abaixo do busto.
  loft(
    "corset",
    [
      { p: [0, 1.035, 0], rx: 0.146, rzF: 0.096, rzB: 0.101 },
      { p: [0, 1.085, 0], rx: 0.122, rzF: 0.087, rzB: 0.09 },
      { p: [0, 1.16, 0], rx: 0.132, rzF: 0.097, rzB: 0.094 },
      { p: [0, 1.225, 0], rx: 0.143, rzF: 0.106, rzB: 0.098 },
    ],
    { axis: [0, 1, 0], square: 2.3, around: 32, caps: false },
  );

  // A saia: cai da cintura até o chão, abrindo, com pregas que afundam para a barra.
  loft(
    "dress",
    [
      { p: [0, 1.045, 0], rx: 0.146, rzF: 0.097, rzB: 0.103, ripple: 0 },
      { p: [0, 0.95, 0], rx: 0.185, rzF: 0.135, rzB: 0.15, ripple: 0.012 },
      { p: [0, 0.8, 0], rx: 0.215, rzF: 0.175, rzB: 0.19, ripple: 0.03 },
      { p: [0, 0.5, 0], rx: 0.255, rzF: 0.225, rzB: 0.24, ripple: 0.045 },
      { p: [0, 0.2, 0], rx: 0.295, rzF: 0.27, rzB: 0.285, ripple: 0.055 },
      { p: [0, 0.02, 0], rx: 0.325, rzF: 0.3, rzB: 0.32, ripple: 0.065 },
    ],
    { axis: [0, 1, 0], around: 96, ripples: 16 },
  );

  // Os braços: manga comprida, bufante no ombro, justa no pulso.
  bothSides(() =>
    arm(
      "dress",
      "skin",
      [
        { p: [0.142, 1.44, -0.006], rx: 0.03 },
        { p: [0.172, 1.4, -0.006], rx: 0.063 },
        { p: [0.19, 1.33, -0.008], rx: 0.053 },
        { p: [0.207, 1.22, -0.01], rx: 0.043 },
        { p: [0.218, 1.13, -0.008], rx: 0.039 },
        { p: [0.228, 1.01, 0.01], rx: 0.034 },
        { p: [0.236, 0.905, 0.03], rx: 0.028 },
      ],
      0.92,
    ),
  );

  // O cabelo: a touca que deixa a testa de fora, o coque no alto, as mechas dos lados.
  blob("hair", [0, chin + 0.172, -0.02], [0.082, 0.08, 0.1], { around: 28 });
  blob("hair", [0, chin + 0.25, -0.066], [0.052, 0.047, 0.052], { around: 20 });
  blob("hair", [0, chin + 0.215, -0.062], [0.06, 0.02, 0.06], { around: 20 });
  bothSides(() =>
    loft("hair", [{ p: [0.07, chin + 0.17, 0.03], rx: 0.007 }, { p: [0.079, chin + 0.11, 0.034], rx: 0.006 }, { p: [0.075, chin + 0.045, 0.04], rx: 0.004 }], { around: 8 }),
  );
}

// ----------------------------------------------------------------- Victor --
//
// Chapéu preto de aba larga, casaco comprido de couro escuro aberto na frente,
// camisa e calça pretas, cinto e botas marrons; cabelo castanho e barba curta.

function victor() {
  const chin = 1.535;
  const profile = head({ chin, jaw: 1.09, skin: "skinVictor", lips: "lipsVictor", brows: "hairVictor", iris: "iris", lashes: "hairVictor" });

  // A barba curta: uma casca rente à mandíbula, do queixo até abaixo da boca, e o bigode.
  loft(
    "stubble",
    profile.slice(0, 4).map(([up, rx, rzF, rzB, forward]) => ({ p: [0, chin + up - 0.003, forward], rx: rx * 1.035 + 0.001, rzF: rzF * 1.03 + 0.001, rzB: rzB * 0.6 })),
    { axis: [0, 1, 0], around: 32, caps: false },
  );
  blob("stubble", [0, chin + 0.0625, 0.0745], [0.027, 0.0055, 0.009]);

  // Pescoço, e a pele que o colarinho aberto deixa ver.
  loft("skinVictor", [{ p: [0, 1.44, -0.014], rx: 0.058 }, { p: [0, 1.5, -0.01], rx: 0.054 }, { p: [0, 1.57, -0.004], rx: 0.055 }], { axis: [0, 1, 0] });
  blob("skinVictor", [0, 1.452, 0.056], [0.02, 0.042, 0.014]);

  // O tronco, de camisa preta: quadril, cintura, peito largo, ombros.
  loft(
    "shirt",
    [
      { p: [0, 0.88, 0], rx: 0.165, rzF: 0.105, rzB: 0.118 },
      { p: [0, 0.985, 0], rx: 0.156, rzF: 0.106, rzB: 0.108 },
      { p: [0, 1.1, 0], rx: 0.165, rzF: 0.112, rzB: 0.106 },
      { p: [0, 1.25, 0], rx: 0.186, rzF: 0.127, rzB: 0.116 },
      { p: [0, 1.36, 0], rx: 0.196, rzF: 0.122, rzB: 0.117 },
      { p: [0, 1.43, -0.004], rx: 0.182, rzF: 0.096, rzB: 0.102 },
      { p: [0, 1.468, -0.01], rx: 0.1, rzF: 0.07, rzB: 0.08 },
      { p: [0, 1.492, -0.012], rx: 0.062, rzF: 0.058, rzB: 0.062 },
    ],
    { axis: [0, 1, 0], square: 2.4, around: 32 },
  );
  // Cinto e fivela.
  loft("leather", [{ p: [0, 0.965, 0], rx: 0.162, rzF: 0.111, rzB: 0.114 }, { p: [0, 1.005, 0], rx: 0.161, rzF: 0.111, rzB: 0.113 }], { axis: [0, 1, 0], square: 2.4, detail: 1, around: 32 });
  blob("buckle", [0, 0.985, 0.111], [0.022, 0.018, 0.006]);

  bothSides(() => {
    // Perna: coxa, joelho, panturrilha, tornozelo.
    loft(
      "trousers",
      [
        { p: [0.085, 0.93, 0], rx: 0.082, rzF: 0.09, rzB: 0.098 },
        { p: [0.092, 0.78, 0.004], rx: 0.08, rzF: 0.084, rzB: 0.086 },
        { p: [0.096, 0.53, 0.008], rx: 0.058, rzF: 0.06, rzB: 0.058 },
        { p: [0.097, 0.36, -0.004], rx: 0.056, rzF: 0.05, rzB: 0.064 },
        { p: [0.097, 0.15, -0.002], rx: 0.046 },
      ],
      { around: 20 },
    );
    // Bota: o cano, e o pé do calcanhar ao bico.
    loft("leather", [{ p: [0.097, 0.27, -0.002], rx: 0.055 }, { p: [0.097, 0.16, -0.002], rx: 0.052 }, { p: [0.097, 0.06, -0.004], rx: 0.05 }], { around: 16 });
    loft(
      "leather",
      [
        { p: [0.098, 0.05, -0.075], rx: 0.036, rz: 0.04 },
        { p: [0.098, 0.052, -0.03], rx: 0.048, rz: 0.05 },
        { p: [0.1, 0.048, 0.06], rx: 0.05, rz: 0.046 },
        { p: [0.102, 0.04, 0.13], rx: 0.046, rz: 0.036 },
        { p: [0.103, 0.033, 0.178], rx: 0.03, rz: 0.026 },
      ],
      { axis: [0, 0, 1], around: 16 },
    );
    // Braço, com a manga do casaco.
    arm(
      "coat",
      "skinVictor",
      [
        { p: [0.186, 1.44, -0.006], rx: 0.04 },
        { p: [0.218, 1.4, -0.006], rx: 0.067 },
        { p: [0.236, 1.32, -0.008], rx: 0.064 },
        { p: [0.254, 1.21, -0.01], rx: 0.056 },
        { p: [0.266, 1.12, -0.008], rx: 0.051 },
        { p: [0.277, 1.0, 0.012], rx: 0.047 },
        { p: [0.286, 0.895, 0.032], rx: 0.042 },
      ],
      1.08,
    );
    // Lapela: uma tira do colarinho até o peito, em cada lado da abertura.
    loft(
      "coat",
      [
        { p: [0.062, 1.47, 0.066], rx: 0.02, rz: 0.008 },
        { p: [0.084, 1.4, 0.112], rx: 0.036, rz: 0.009 },
        { p: [0.082, 1.3, 0.137], rx: 0.03, rz: 0.008 },
        { p: [0.07, 1.2, 0.136], rx: 0.014, rz: 0.006 },
      ],
      { around: 10 },
    );
  });

  // O casaco: uma casca em volta do tronco, aberta na frente, até a canela.
  loft(
    "coat",
    [
      { p: [0, 1.485, -0.012], rx: 0.085, rzF: 0.07, rzB: 0.082, gap: 0.5 },
      { p: [0, 1.44, -0.006], rx: 0.2, rzF: 0.108, rzB: 0.118, gap: 0.42 },
      { p: [0, 1.36, 0], rx: 0.214, rzF: 0.14, rzB: 0.133, gap: 0.36 },
      { p: [0, 1.2, 0], rx: 0.204, rzF: 0.143, rzB: 0.13, gap: 0.34 },
      { p: [0, 1.0, 0], rx: 0.19, rzF: 0.132, rzB: 0.13, gap: 0.36 },
      { p: [0, 0.7, 0], rx: 0.21, rzF: 0.142, rzB: 0.152, gap: 0.42 },
      { p: [0, 0.34, 0], rx: 0.238, rzF: 0.152, rzB: 0.182, gap: 0.48 },
    ],
    { axis: [0, 1, 0], square: 2.4, around: 40, open: true },
  );

  // Cabelo castanho, até a nuca, e o chapéu por cima.
  blob("hairVictor", [0, chin + 0.166, -0.024], [0.083, 0.076, 0.104], { around: 28 });
  blob("hairVictor", [0, chin + 0.095, -0.066], [0.07, 0.07, 0.048], { around: 20 });
  bothSides(() => blob("hairVictor", [0.0705, chin + 0.1, 0.022], [0.006, 0.03, 0.011]));

  const brim = chin + 0.196;
  // A aba: larga, fina, levantando um pouco nos lados e caindo na frente.
  const brimPart = blob("hat", [0, brim, -0.008], [0.205, 0.0075, 0.215], { around: 40 });
  brimPart.positions = brimPart.positions.map(([x, y, z]) => [x, y + 0.9 * x * x - 0.25 * z * z * (z > 0 ? 1 : 0.4), z]);
  loft(
    "hat",
    [
      { p: [0, brim - 0.002, -0.008], rx: 0.094, rzF: 0.104, rzB: 0.106 },
      { p: [0, brim + 0.05, -0.008], rx: 0.09, rzF: 0.1, rzB: 0.102 },
      { p: [0, brim + 0.098, -0.008], rx: 0.085, rzF: 0.093, rzB: 0.098 },
      { p: [0, brim + 0.112, -0.008], rx: 0.07, rzF: 0.078, rzB: 0.084 },
    ],
    { axis: [0, 1, 0], around: 32 },
  );
  // A fita do chapéu.
  loft("leather", [{ p: [0, brim + 0.006, -0.008], rx: 0.0965, rzF: 0.1065, rzB: 0.1085 }, { p: [0, brim + 0.026, -0.008], rx: 0.0945, rzF: 0.1045, rzB: 0.1065 }], { axis: [0, 1, 0], detail: 1, around: 32, caps: false });
}

// -------------------------------------------------------------- materiais --

const srgbToLinear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const color = (hex) => [...[1, 3, 5].map((at) => srgbToLinear(parseInt(hex.slice(at, at + 2), 16) / 255)), 1];

/** Cor de base de cada material (sRGB) e o quanto a superfície é áspera. */
const MATERIALS = {
  skin: { hex: "#e6c3ad", roughness: 0.75 },
  skinVictor: { hex: "#cf9d80", roughness: 0.78 },
  lips: { hex: "#a8505a", roughness: 0.6 },
  lipsVictor: { hex: "#a8705f", roughness: 0.7 },
  eye: { hex: "#ece6dc", roughness: 0.5 },
  iris: { hex: "#3a2618", roughness: 0.5 },
  hair: { hex: "#17120f", roughness: 0.7 },
  hairVictor: { hex: "#4a3222", roughness: 0.8 },
  stubble: { hex: "#8a6450", roughness: 0.9 },
  dress: { hex: "#541428", roughness: 0.62 },
  corset: { hex: "#3c0e1e", roughness: 0.55 },
  jewel: { hex: "#8fa39a", roughness: 0.4 },
  shirt: { hex: "#1a1817", roughness: 0.85 },
  trousers: { hex: "#241f1c", roughness: 0.85 },
  // O casaco é uma casca: por dentro também se vê.
  coat: { hex: "#35261c", roughness: 0.7, doubleSided: true },
  leather: { hex: "#3d2a1c", roughness: 0.65 },
  buckle: { hex: "#9c8a66", roughness: 0.45 },
  hat: { hex: "#1c1917", roughness: 0.8 },
};

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

const title = NAME === "cassandra" ? "Cassandra" : "Victor";
(NAME === "cassandra" ? cassandra : victor)();
pieces.forEach(faceOutward);
const unknown = pieces.find((piece) => !(piece.material in MATERIALS));
if (unknown) throw new Error(`Material "${unknown.material}" não está em MATERIALS.`);

const WIDTHS = { SCALAR: 1, VEC3: 3 };
const chunks = [];
let binLength = 0;
const output = {
  asset: { version: "2.0", generator: "beyond-the-hill/scripts/models/build-figure.mjs" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: title, children: [] }],
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
for (const [name, material] of Object.entries(MATERIALS)) {
  const own = pieces.filter((piece) => piece.material === name).map(smooth);
  if (own.length === 0) continue;
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
  output.materials.push({
    name: `${title}_${name}`,
    pbrMetallicRoughness: { baseColorFactor: color(material.hex), metallicFactor: 0, roughnessFactor: material.roughness },
    ...(material.doubleSided ? { doubleSided: true } : {}),
  });
  output.meshes.push({
    name: `${title}_${name}`,
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
  output.nodes.push({ name: `${title}_${name}`, mesh: output.meshes.length - 1 });
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
writeFileSync(TARGET, glb);

console.log(`${TARGET}\n  ${pieces.length} peças em ${output.meshes.length} malhas, ${triangles} triângulos — ${(glb.length / 1024).toFixed(0)} kB`);
