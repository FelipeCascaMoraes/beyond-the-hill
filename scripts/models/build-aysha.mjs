// Modela a Aysha para o jogo:
//
//   node scripts/models/build-aysha.mjs
//
// Escreve public/models/characters/aysha.glb. Não parte de arquivo nenhum — o
// corpo inteiro é desenhado aqui, com as ferramentas de figure-kit.mjs (lá
// está explicado como uma superfície é feita de anéis).
//
// Diferente da Cassandra e do Victor, ela anda: o arquivo leva um esqueleto e
// os clipes Idle, Walk e Run, escritos aqui. Cada parte do corpo é modelada
// dentro de um `bind`, que diz que osso ela segue; as que atravessam uma junta
// (a perna pelo joelho, o braço pelo cotovelo, o tronco pela cintura) dividem
// o peso entre os dois ossos numa faixa em volta dela, e dobram sem abrir.
//
// Blusa marfim de manga curta, alças escuras, cinto marrom com duas bolsas,
// calça escura com joelheiras, botas, luvas sem dedos; o cabelo castanho
// comprido, com franja.

import { fileURLToPath } from "node:url";
import { add, along, bind, blob, bothSides, hand, head, loft, scale, writeFigure } from "./figure-kit.mjs";

const TARGET = process.argv[2] ?? fileURLToPath(new URL("../../public/models/characters/aysha.glb", import.meta.url));

// ------------------------------------------------------------ o esqueleto --
//
// No arquivo, o lado "L" é o de x negativo. Aqui se modela o lado de x
// positivo (o "R"); `bothSides` espelha a peça e troca o osso.

/** O braço sai do ombro um pouco aberto; as animações o trazem para junto do corpo. */
const ARM_OPEN = 0.24;
const armDown = [Math.sin(ARM_OPEN), -Math.cos(ARM_OPEN), 0];
const shoulder = [0.168, 1.392, -0.006];
const UPPER_ARM = 0.265;
const FOREARM = 0.235;
const elbow = add(shoulder, scale(armDown, UPPER_ARM));
const wrist = add(elbow, scale(armDown, FOREARM));

const HIP = 0.9;
const KNEE = 0.49;
const ANKLE = 0.1;

/** Onde cada osso gira, do lado de x positivo; o outro lado é o espelho. */
const SIDE_JOINTS = {
  Shoulder: [0.07, 1.4, -0.006],
  UpperArm: shoulder,
  Forearm: elbow,
  Hand: wrist,
  Thigh: [0.086, HIP, 0],
  Shin: [0.092, KNEE, 0.004],
  Foot: [0.094, ANKLE, -0.004],
};
const SIDE_PARENTS = { Shoulder: "Chest", UpperArm: "Shoulder", Forearm: "UpperArm", Hand: "Forearm", Thigh: "Hips", Shin: "Thigh", Foot: "Shin" };

/** Os ossos, pais antes dos filhos. */
const BONES = [
  { name: "Root", parent: null, joint: [0, 0, 0] },
  { name: "Hips", parent: "Root", joint: [0, 0.93, 0] },
  { name: "Spine", parent: "Hips", joint: [0, 1.0, 0] },
  { name: "Chest", parent: "Spine", joint: [0, 1.13, 0] },
  { name: "Neck", parent: "Chest", joint: [0, 1.43, -0.01] },
  { name: "Head", parent: "Neck", joint: [0, 1.485, -0.006] },
];
for (const [side, sign] of [
  ["L", -1],
  ["R", 1],
]) {
  for (const part of ["Shoulder", "UpperArm", "Forearm", "Hand", "Thigh", "Shin", "Foot"]) {
    const [x, y, z] = SIDE_JOINTS[part];
    const parent = SIDE_PARENTS[part];
    BONES.push({ name: `${side}_${part}`, parent: parent in SIDE_JOINTS ? `${side}_${parent}` : parent, joint: [sign * x, y, z] });
  }
}

/** O tronco, de baixo para cima: cintura, peito, base do pescoço, base da cabeça. */
const torso = along(
  (position) => position[1],
  ["Hips", "Spine", "Chest", "Neck", "Head"],
  [
    [1.0, 0.08],
    [1.13, 0.1],
    [1.43, 0.05],
    [1.485, 0.04],
  ],
);

/** A perna, de cima para baixo: quadril, joelho, tornozelo. */
const leg = along(
  (position) => -position[1],
  ["Hips", "R_Thigh", "R_Shin", "R_Foot"],
  [
    [-HIP, 0.1],
    [-KNEE, 0.1],
    [-(ANKLE + 0.01), 0.06],
  ],
);

/** O braço, medido do ombro para a mão: ombro, cotovelo, pulso. */
const armBones = along(
  (position) => (position[0] - shoulder[0]) * armDown[0] + (position[1] - shoulder[1]) * armDown[1],
  ["Chest", "R_UpperArm", "R_Forearm", "R_Hand"],
  [
    [-0.03, 0.05],
    [UPPER_ARM, 0.08],
    [UPPER_ARM + FOREARM, 0.04],
  ],
);

/** Um ponto do braço, a `distance` metros do ombro. */
const onArm = (distance) => add(shoulder, scale(armDown, distance));

// ---------------------------------------------------------------- o corpo --

const chin = 1.47;

bind("Head", () => {
  head({ chin, skin: "skin", lips: "lips", brows: "hair", iris: "iris", lashes: "hair" });

  // O cabelo: a touca que desce em franja até perto das sobrancelhas, a massa
  // comprida nas costas e uma mecha de cada lado, por cima do ombro.
  blob("hair", [0, chin + 0.166, -0.019], [0.083, 0.079, 0.106], { around: 28 });
  loft(
    "hair",
    [
      { p: [0, chin + 0.2, -0.05], rx: 0.07, rz: 0.05 },
      { p: [0, chin + 0.1, -0.075], rx: 0.088, rz: 0.05 },
      { p: [0, 1.42, -0.092], rx: 0.096, rz: 0.045 },
      { p: [0, 1.32, -0.108], rx: 0.09, rz: 0.04 },
      { p: [0, 1.24, -0.112], rx: 0.07, rz: 0.03 },
      { p: [0, 1.2, -0.11], rx: 0.03, rz: 0.015 },
    ],
    { axis: [0, 1, 0], around: 24 },
  );
  bothSides(() =>
    loft(
      "hair",
      [
        { p: [0.072, chin + 0.16, 0.02], rx: 0.016 },
        { p: [0.085, chin + 0.06, 0.03], rx: 0.017 },
        { p: [0.092, 1.43, 0.052], rx: 0.016 },
        { p: [0.09, 1.36, 0.088], rx: 0.012 },
        { p: [0.085, 1.3, 0.104], rx: 0.005 },
      ],
      { around: 10 },
    ),
  );
});

bind(torso, () => {
  // Pescoço, e a pele que o colarinho deixa ver.
  loft("skin", [{ p: [0, 1.4, -0.012], rx: 0.047 }, { p: [0, 1.44, -0.01], rx: 0.044 }, { p: [0, 1.5, -0.004], rx: 0.045 }], { axis: [0, 1, 0] });
  blob("skin", [0, 1.44, 0.05], [0.022, 0.03, 0.012]);

  // A blusa: presa na cintura, solta no peito, fechando nos ombros.
  loft(
    "blouse",
    [
      { p: [0, 1.0, 0], rx: 0.15, rzF: 0.1, rzB: 0.106 },
      { p: [0, 1.085, 0], rx: 0.124, rzF: 0.087, rzB: 0.09 },
      { p: [0, 1.16, 0], rx: 0.132, rzF: 0.096, rzB: 0.093 },
      { p: [0, 1.235, 0], rx: 0.143, rzF: 0.106, rzB: 0.097 },
      { p: [0, 1.29, 0], rx: 0.152, rzF: 0.124, rzB: 0.1 },
      { p: [0, 1.345, 0], rx: 0.156, rzF: 0.112, rzB: 0.102 },
      { p: [0, 1.395, 0], rx: 0.154, rzF: 0.094, rzB: 0.098 },
      { p: [0, 1.43, -0.004], rx: 0.125, rzF: 0.074, rzB: 0.086 },
      { p: [0, 1.455, -0.008], rx: 0.07, rzF: 0.055, rzB: 0.066 },
      { p: [0, 1.468, -0.01], rx: 0.05, rzF: 0.048, rzB: 0.054 },
    ],
    { axis: [0, 1, 0], square: 2.3, around: 32 },
  );
  // O colarinho: uma gola em pé, aberta na frente.
  loft(
    "collar",
    [
      { p: [0, 1.45, -0.008], rx: 0.06, rzF: 0.057, rzB: 0.062, gap: 0.5 },
      { p: [0, 1.486, -0.008], rx: 0.058, rzF: 0.056, rzB: 0.061, gap: 0.8 },
    ],
    { axis: [0, 1, 0], detail: 2, around: 24, open: true },
  );
  // O pingente.
  blob("metal", [0, 1.4, 0.089], [0.008, 0.011, 0.004]);

  // As alças: da cintura, por cima do ombro, até a cintura atrás.
  bothSides(() =>
    loft(
      "strap",
      [
        { p: [0.078, 1.03, 0.089], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.16, 0.088], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.29, 0.117], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.39, 0.092], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.434, 0.066], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.46, -0.004], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.434, -0.078], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.39, -0.096], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.29, -0.098], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.16, -0.088], rx: 0.017, rz: 0.006 },
        { p: [0.078, 1.03, -0.095], rx: 0.017, rz: 0.006 },
      ],
      { around: 8 },
    ),
  );

  // A calça no quadril.
  loft(
    "trousers",
    [
      { p: [0, 0.8, 0], rx: 0.09, rzF: 0.08, rzB: 0.09 },
      { p: [0, 0.85, 0], rx: 0.158, rzF: 0.1, rzB: 0.115 },
      { p: [0, 0.93, 0], rx: 0.17, rzF: 0.105, rzB: 0.12 },
      { p: [0, 1.0, 0], rx: 0.152, rzF: 0.1, rzB: 0.106 },
    ],
    { axis: [0, 1, 0], square: 2.3, around: 32 },
  );
});

bind("Hips", () => {
  // O cinto, a fivela e as duas bolsas.
  loft("belt", [{ p: [0, 0.982, 0], rx: 0.156, rzF: 0.104, rzB: 0.11 }, { p: [0, 1.024, 0], rx: 0.153, rzF: 0.103, rzB: 0.109 }], { axis: [0, 1, 0], square: 2.3, detail: 1, around: 32 });
  blob("metal", [0, 1.003, 0.104], [0.02, 0.017, 0.006]);
  bothSides(() => blob("belt", [0.152, 0.945, 0.02], [0.034, 0.046, 0.05]));
});

bothSides(() => {
  bind(leg, () => {
    // A perna: coxa, joelho, panturrilha, até dentro da bota.
    loft(
      "trousers",
      [
        { p: [0.086, 0.93, 0], rx: 0.084, rzF: 0.09, rzB: 0.098 },
        { p: [0.09, 0.78, 0.004], rx: 0.079, rzF: 0.083, rzB: 0.085 },
        { p: [0.092, 0.62, 0.006], rx: 0.066, rzF: 0.068, rzB: 0.068 },
        { p: [0.092, KNEE, 0.008], rx: 0.056, rzF: 0.059, rzB: 0.056 },
        { p: [0.093, 0.36, -0.004], rx: 0.053, rzF: 0.048, rzB: 0.062 },
        { p: [0.094, 0.2, -0.003], rx: 0.043 },
      ],
      { around: 20 },
    );
    // A joelheira.
    blob("panel", [0.092, KNEE, 0.052], [0.044, 0.05, 0.022]);
    // O cano da bota e a dobra em cima dele.
    loft("boot", [{ p: [0.094, 0.3, -0.003], rx: 0.052 }, { p: [0.094, 0.2, -0.003], rx: 0.05 }, { p: [0.094, 0.07, -0.004], rx: 0.048 }], { around: 16 });
    loft("panel", [{ p: [0.094, 0.283, -0.003], rx: 0.056 }, { p: [0.094, 0.316, -0.003], rx: 0.056 }], { detail: 1, around: 16 });
  });
  // O bolso da coxa.
  bind("R_Thigh", () => blob("panel", [0.166, 0.72, 0], [0.016, 0.06, 0.05]));
  // O pé, do calcanhar ao bico.
  bind("R_Foot", () =>
    loft(
      "boot",
      [
        { p: [0.095, 0.05, -0.07], rx: 0.034, rz: 0.04 },
        { p: [0.095, 0.052, -0.03], rx: 0.045, rz: 0.05 },
        { p: [0.097, 0.047, 0.05], rx: 0.047, rz: 0.045 },
        { p: [0.099, 0.04, 0.115], rx: 0.043, rz: 0.035 },
        { p: [0.1, 0.033, 0.158], rx: 0.028, rz: 0.025 },
      ],
      { axis: [0, 0, 1], around: 16 },
    ),
  );

  bind(armBones, () => {
    // O braço, de pele, do ombro ao pulso.
    loft(
      "skin",
      [
        { p: onArm(-0.02), rx: 0.047 },
        { p: onArm(0.06), rx: 0.046 },
        { p: onArm(0.15), rx: 0.041 },
        { p: onArm(UPPER_ARM), rx: 0.035 },
        { p: onArm(UPPER_ARM + 0.06), rx: 0.036 },
        { p: onArm(UPPER_ARM + 0.14), rx: 0.031 },
        { p: onArm(UPPER_ARM + FOREARM), rx: 0.0255 },
      ],
      { around: 20 },
    );
    // A manga curta da blusa.
    loft(
      "blouse",
      [
        { p: [0.14, 1.432, -0.006], rx: 0.03 },
        { p: onArm(0), rx: 0.061 },
        { p: onArm(0.07), rx: 0.056 },
        { p: onArm(0.135), rx: 0.052 },
      ],
      { around: 20 },
    );
  });
  // A mão, de luva sem dedos.
  bind("R_Hand", () => hand("skin", wrist, armDown, 0.9, "glove"));
});

// ------------------------------------------------------------ as animações --

const FRAME_RATE = 30;

function multiply([ax, ay, az, aw], [bx, by, bz, bw]) {
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Giro de um osso a partir de três ângulos (rad): primeiro o rolar (z, o eixo
 * que aponta para a frente), depois o balanço (x: negativo leva o membro para
 * a frente), depois a torção (y, em torno do corpo).
 */
function rotation([x = 0, y = 0, z = 0]) {
  const about = (axis, angle) => {
    const quaternion = [0, 0, 0, Math.cos(angle / 2)];
    quaternion[axis] = Math.sin(angle / 2);
    return quaternion;
  };
  return multiply(about(1, y), multiply(about(0, x), about(2, z)));
}

/** Os braços são modelados abertos; isto os traz para junto do corpo. */
const ARMS_IN = 0.2;
/** No arquivo, o lado "L" é o de x negativo. */
const SIDES = [
  ["L", 1, 0],
  ["R", -1, Math.PI],
];

/** Parada: respira, e a cabeça passeia um pouco. */
function idle(t) {
  const breath = Math.sin(t * 2 * Math.PI * 2);
  const drift = t * 2 * Math.PI;
  const pose = {
    Hips: [0, 0, 0],
    Chest: [0.015 * breath, 0, 0],
    Head: [0.02 * Math.sin(drift + 1), 0.05 * Math.sin(drift), 0],
  };
  for (const [side, sign] of SIDES) {
    pose[`${side}_UpperArm`] = [0.02, 0, sign * (ARMS_IN + 0.012 * breath)];
    pose[`${side}_Forearm`] = [-0.14, 0, 0];
    pose[`${side}_Thigh`] = [0, 0, 0];
    pose[`${side}_Shin`] = [0, 0, 0];
    pose[`${side}_Foot`] = [0, 0, 0];
  }
  return pose;
}

/** Um ciclo de dois passos, no lugar. Corrida e caminhada só mudam nos números. */
function gait({ leg: swing, knee, arm, elbow: bend, elbowSwing, twist, lean }) {
  return (t) => {
    const cycle = t * 2 * Math.PI;
    const pose = {
      Hips: [0, twist * Math.sin(cycle), 0],
      Chest: [lean, -2 * twist * Math.sin(cycle), 0],
      Head: [-lean * 0.6, twist * Math.sin(cycle), 0],
    };
    for (const [side, sign, offset] of SIDES) {
      const phase = cycle + offset;
      // A perna vai à frente quando sin(phase) sobe; o joelho dobra no meio do caminho.
      const thigh = -swing * Math.sin(phase) - 0.04;
      const shin = 0.08 + knee * ((1 + Math.cos(phase)) / 2) ** 2;
      pose[`${side}_Thigh`] = [thigh, 0, 0];
      pose[`${side}_Shin`] = [shin, 0, 0];
      // O pé desfaz boa parte do giro da perna, para não apontar para o chão.
      pose[`${side}_Foot`] = [-0.6 * thigh - 0.4 * shin, 0, 0];
      // O braço balança contra a perna do mesmo lado.
      pose[`${side}_UpperArm`] = [arm * Math.sin(phase), 0, sign * ARMS_IN];
      pose[`${side}_Forearm`] = [-bend - elbowSwing * (1 - Math.sin(phase)) * 0.5, 0, 0];
    }
    return pose;
  };
}

// As durações casam com a cadência do jogo (game/config/player.ts): 0,85 passo
// por metro, a 2,4 m/s andando e 4,4 m/s correndo; cada ciclo são dois passos.
const CLIPS = [
  { name: "Idle", duration: 6, pose: idle },
  {
    name: "Walk",
    duration: 0.98,
    pose: gait({ leg: 0.4, knee: 0.85, arm: 0.32, elbow: 0.22, elbowSwing: 0.2, twist: 0.07, lean: 0.03 }),
  },
  {
    name: "Run",
    duration: 0.53,
    pose: gait({ leg: 0.68, knee: 1.5, arm: 0.7, elbow: 1.15, elbowSwing: 0.25, twist: 0.1, lean: 0.12 }),
  },
];

/** Um clipe amostrado: um giro por osso em cada quadro; o último quadro repete o primeiro. */
function sample(clip) {
  const frames = Math.round(clip.duration * FRAME_RATE);
  const times = new Float32Array(frames + 1);
  const tracks = {};
  for (let frame = 0; frame <= frames; frame++) {
    times[frame] = (frame / frames) * clip.duration;
    const pose = clip.pose((frame % frames) / frames);
    for (const [bone, angles] of Object.entries(pose)) {
      (tracks[bone] ??= new Float32Array((frames + 1) * 4)).set(rotation(angles), frame * 4);
    }
  }
  return { name: clip.name, times, tracks };
}

// ---------------------------------------------------------------- escrita --

writeFigure({
  title: "Aysha",
  target: TARGET,
  generator: "beyond-the-hill/scripts/models/build-aysha.mjs",
  materials: {
    skin: { hex: "#d9b29e", roughness: 0.75 },
    lips: { hex: "#ac6f6c", roughness: 0.6 },
    eye: { hex: "#ece6dc", roughness: 0.5 },
    iris: { hex: "#3a2618", roughness: 0.5 },
    hair: { hex: "#4a342c", roughness: 0.75 },
    blouse: { hex: "#e6e1d4", roughness: 0.8 },
    // A gola é uma casca: por dentro também se vê.
    collar: { hex: "#e6e1d4", roughness: 0.8, doubleSided: true },
    strap: { hex: "#2f2f33", roughness: 0.7 },
    belt: { hex: "#6f553d", roughness: 0.65 },
    metal: { hex: "#b2aea2", roughness: 0.4 },
    trousers: { hex: "#36363b", roughness: 0.85 },
    panel: { hex: "#4e4b4b", roughness: 0.8 },
    boot: { hex: "#37322e", roughness: 0.65 },
    glove: { hex: "#2a2a2e", roughness: 0.7 },
  },
  rig: { prefix: "Aysha_Rig_", bones: BONES, clips: CLIPS.map(sample) },
});
