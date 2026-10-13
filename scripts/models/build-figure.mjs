// Modela a Cassandra e o Victor para o jogo:
//
//   node scripts/models/build-figure.mjs cassandra
//   node scripts/models/build-figure.mjs victor
//
// Escreve public/models/characters/<nome>.glb. Não parte de arquivo nenhum — o
// corpo inteiro é desenhado aqui, com as ferramentas de figure-kit.mjs (lá
// está explicado como uma superfície é feita de anéis).
//
// Sem esqueleto e sem animação: os dois esperam de pé.

import { fileURLToPath } from "node:url";
import { arm, blob, bothSides, head, loft, writeFigure } from "./figure-kit.mjs";

const NAME = process.argv[2];
const TARGETS = ["cassandra", "victor"];
if (!TARGETS.includes(NAME)) throw new Error(`Uso: node scripts/models/build-figure.mjs <${TARGETS.join("|")}>`);
const TARGET = process.argv[3] ?? fileURLToPath(new URL(`../../public/models/characters/${NAME}.glb`, import.meta.url));

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

(NAME === "cassandra" ? cassandra : victor)();
writeFigure({
  title: NAME === "cassandra" ? "Cassandra" : "Victor",
  target: TARGET,
  generator: "beyond-the-hill/scripts/models/build-figure.mjs",
  materials: MATERIALS,
});
