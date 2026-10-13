// Prepara o modelo da Aysha para o jogo:
//
//   node scripts/models/build-aysha.mjs [arquivo-de-origem.glb]
//
// Lê o arquivo exportado (scripts/models/aysha.source.glb, se nenhum for
// passado) e escreve public/models/characters/aysha.glb no contrato que o jogo
// espera (public/models/characters/README.md). O arquivo de origem vem:
//
//   • deitado para o glTF: Z para cima e o rosto para -Y. Aqui vira Y para
//     cima, rosto para +Z;
//   • com os ossos fora das juntas da malha (o esqueleto é de um corpo menor):
//     girar a coxa dobraria a perna no meio. Cada osso vai para a junta que a
//     malha desenha — a esfera do joelho, do ombro, do cotovelo;
//   • com peças presas ao osso errado (o colar no pé, o queixo no quadril);
//   • em 105 malhas, uma por peça: aqui viram uma por material;
//   • sem animação nenhuma: os clipes Idle, Walk e Run são escritos aqui.
//
// Sem dependências: lê e escreve o GLB na mão.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = process.argv[2] ?? fileURLToPath(new URL("./aysha.source.glb", import.meta.url));
const TARGET = fileURLToPath(new URL("../../public/models/characters/aysha.glb", import.meta.url));

const RIG = "Aysha_Rig_";

/** Peças que o arquivo prende ao osso errado: [nome da peça, osso certo]. */
const REBIND = [
  [/^(jaw|cheek|upper lip|fringe)/, () => "Head"],
  [/^([LR]) thumb/, (match) => `${match[1]}_Hand`],
  [/^(blouse button|left collar|right collar|strap buckle|necklace)/, () => "Chest"],
  [/utility pouch/, () => "Hips"],
  [/^cargo strap -1/, () => "L_Thigh"],
  [/^cargo strap 1/, () => "R_Thigh"],
];

/** Quem é filho de quem; a ordem é a dos ossos no arquivo final. */
const PARENTS = {
  Root: null,
  Hips: "Root",
  Spine: "Hips",
  Chest: "Spine",
  Neck: "Chest",
  Head: "Neck",
  L_Shoulder: "Chest",
  L_UpperArm: "L_Shoulder",
  L_Forearm: "L_UpperArm",
  L_Hand: "L_Forearm",
  R_Shoulder: "Chest",
  R_UpperArm: "R_Shoulder",
  R_Forearm: "R_UpperArm",
  R_Hand: "R_Forearm",
  L_Thigh: "Hips",
  L_Shin: "L_Thigh",
  L_Foot: "L_Shin",
  R_Thigh: "Hips",
  R_Shin: "R_Thigh",
  R_Foot: "R_Shin",
};
const BONES = Object.keys(PARENTS);

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

/** Um accessor como lista de linhas (uma por vértice, índice ou matriz). */
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

const skin = source.skins[0];
const sourceBones = skin.joints.map((node) => source.nodes[node].name.replace(RIG, ""));

/** As peças do arquivo, já de pé (Y para cima, rosto para +Z) e com o osso certo. */
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

    // Cada peça é rígida: segue um osso só. Vale o de maior peso do 1º vértice.
    const joints = readAccessor(primitive.attributes.JOINTS_0)[0];
    const weights = readAccessor(primitive.attributes.WEIGHTS_0)[0];
    let bone = sourceBones[joints[weights.indexOf(Math.max(...weights))]];
    for (const [pattern, fix] of REBIND) {
      const match = pattern.exec(mesh.name);
      if (match) bone = fix(match);
    }
    if (!BONES.includes(bone)) throw new Error(`A peça "${mesh.name}" pede o osso "${bone}", que não existe.`);

    pieces.push({ name: mesh.name, material: primitive.material, positions, indices, bone });
  }
}

// ------------------------------------------------------------ o esqueleto --

/** A caixa de uma peça, pelo nome. */
function boxOf(name) {
  const piece = pieces.find((candidate) => candidate.name === name);
  if (!piece) throw new Error(`O script procura a peça "${name}" para achar uma junta, e ela não está no arquivo.`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const position of piece.positions) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], position[axis]);
      max[axis] = Math.max(max[axis], position[axis]);
    }
  }
  return { min, max, center: min.map((value, axis) => (value + max[axis]) / 2) };
}

// Onde cada osso gira: no meio da peça que desenha a junta, quando há uma.
const waist = boxOf("trousers waist");
const joints = {
  Root: [0, 0, 0],
  Hips: [0, waist.min[1] + 0.07, 0],
  Spine: [0, waist.max[1] - 0.08, 0],
  Chest: [0, waist.max[1], 0],
  Neck: [0, boxOf("neck").min[1] + 0.04, 0],
  Head: [0, boxOf("head").min[1] + 0.04, 0],
};
for (const side of ["L", "R"]) {
  const shoulder = boxOf(`${side} shoulder`).center;
  const thigh = boxOf(`${side} upper trouser`);
  const boot = boxOf(`${side} boot`);
  joints[`${side}_Shoulder`] = [shoulder[0] * 0.55, shoulder[1], 0];
  joints[`${side}_UpperArm`] = shoulder;
  joints[`${side}_Forearm`] = boxOf(`${side} elbow`).center;
  joints[`${side}_Hand`] = boxOf(`${side} glove cuff`).center;
  joints[`${side}_Thigh`] = [thigh.center[0], thigh.max[1] - 0.055, 0];
  joints[`${side}_Shin`] = boxOf(`${side} knee`).center;
  joints[`${side}_Foot`] = [boot.center[0], boot.max[1] - 0.04, 0];
}

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

/** Os braços saem do arquivo abertos; isto os traz para junto do corpo. */
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
function gait({ leg, knee, arm, elbow, elbowSwing, twist, lean }) {
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
      const thigh = -leg * Math.sin(phase) - 0.04;
      const shin = 0.08 + knee * ((1 + Math.cos(phase)) / 2) ** 2;
      pose[`${side}_Thigh`] = [thigh, 0, 0];
      pose[`${side}_Shin`] = [shin, 0, 0];
      // O pé desfaz boa parte do giro da perna, para não apontar para o chão.
      pose[`${side}_Foot`] = [-0.6 * thigh - 0.4 * shin, 0, 0];
      // O braço balança contra a perna do mesmo lado.
      pose[`${side}_UpperArm`] = [arm * Math.sin(phase), 0, sign * ARMS_IN];
      pose[`${side}_Forearm`] = [-elbow - elbowSwing * (1 - Math.sin(phase)) * 0.5, 0, 0];
    }
    return pose;
  };
}

// As durações casam com a cadência do jogo (game/config/player.ts): 0,85 passo
// por metro, a 2,4 m/s andando e 3,8 m/s correndo; cada ciclo são dois passos.
const CLIPS = [
  { name: "Idle", duration: 6, pose: idle },
  {
    name: "Walk",
    duration: 0.98,
    pose: gait({ leg: 0.4, knee: 0.85, arm: 0.32, elbow: 0.22, elbowSwing: 0.2, twist: 0.07, lean: 0.03 }),
  },
  {
    name: "Run",
    duration: 0.62,
    pose: gait({ leg: 0.68, knee: 1.5, arm: 0.7, elbow: 1.15, elbowSwing: 0.25, twist: 0.1, lean: 0.12 }),
  },
];

// ---------------------------------------------------------------- escrita --

const chunks = [];
let binLength = 0;
const output = {
  asset: { version: "2.0", generator: "beyond-the-hill/scripts/models/build-aysha.mjs" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "Aysha", children: [] }],
  meshes: [],
  materials: source.materials,
  skins: [],
  animations: [],
  accessors: [],
  bufferViews: [],
  buffers: [],
};

/** Guarda um bloco de dados e devolve o índice do accessor que o descreve. */
function addAccessor(array, type, componentType, extra = {}, target) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const padding = (4 - (bytes.length % 4)) % 4;
  output.bufferViews.push({ buffer: 0, byteOffset: binLength, byteLength: bytes.length, ...(target ? { target } : {}) });
  chunks.push(bytes, Buffer.alloc(padding));
  binLength += bytes.length + padding;
  output.accessors.push({
    bufferView: output.bufferViews.length - 1,
    componentType,
    count: array.length / WIDTHS[type],
    type,
    ...extra,
  });
  return output.accessors.length - 1;
}

const FLOAT = 5126;
const VERTEX_DATA = 34962;
const INDEX_DATA = 34963;

// Os ossos: sem giro em repouso, cada um na sua junta.
const boneNode = {};
for (const bone of BONES) {
  const parent = PARENTS[bone];
  const origin = parent ? joints[parent] : [0, 0, 0];
  boneNode[bone] = output.nodes.length;
  output.nodes.push({ name: RIG + bone, translation: joints[bone].map((value, axis) => value - origin[axis]) });
  const parentNode = output.nodes[parent ? boneNode[parent] : 0];
  (parentNode.children ??= []).push(boneNode[bone]);
}
const inverseBind = new Float32Array(BONES.length * 16);
BONES.forEach((bone, index) => {
  inverseBind.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -joints[bone][0], -joints[bone][1], -joints[bone][2], 1], index * 16);
});
output.skins.push({
  name: "Aysha_Humanoid_Rig",
  joints: BONES.map((bone) => boneNode[bone]),
  skeleton: boneNode.Root,
  inverseBindMatrices: addAccessor(inverseBind, "MAT4", FLOAT),
});

// As malhas: uma por material, com todas as peças daquele material dentro.
let triangles = 0;
source.materials.forEach((material, materialIndex) => {
  const own = pieces.filter((piece) => piece.material === materialIndex);
  if (own.length === 0) return;
  const vertexCount = own.reduce((sum, piece) => sum + piece.positions.length, 0);
  const positions = new Float32Array(vertexCount * 3);
  const skinIndex = new Uint8Array(vertexCount * 4);
  const skinWeight = new Uint8Array(vertexCount * 4);
  const indices = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let vertex = 0;
  for (const piece of own) {
    for (const index of piece.indices) indices.push(vertex + index);
    for (const position of piece.positions) {
      positions.set(position, vertex * 3);
      skinIndex[vertex * 4] = BONES.indexOf(piece.bone);
      skinWeight[vertex * 4] = 255;
      for (let axis = 0; axis < 3; axis++) {
        // Os limites são conferidos contra o que foi gravado, em 32 bits.
        const stored = positions[vertex * 3 + axis];
        min[axis] = Math.min(min[axis], stored);
        max[axis] = Math.max(max[axis], stored);
      }
      vertex++;
    }
  }
  triangles += indices.length / 3;

  const wide = vertexCount > 65535;
  output.meshes.push({
    name: material.name,
    primitives: [
      {
        attributes: {
          POSITION: addAccessor(positions, "VEC3", FLOAT, { min, max }, VERTEX_DATA),
          JOINTS_0: addAccessor(skinIndex, "VEC4", 5121, {}, VERTEX_DATA),
          WEIGHTS_0: addAccessor(skinWeight, "VEC4", 5121, { normalized: true }, VERTEX_DATA),
        },
        indices: addAccessor(wide ? new Uint32Array(indices) : new Uint16Array(indices), "SCALAR", wide ? 5125 : 5123, {}, INDEX_DATA),
        material: materialIndex,
      },
    ],
  });
  output.nodes[0].children.push(output.nodes.length);
  output.nodes.push({ name: material.name, mesh: output.meshes.length - 1, skin: 0 });
});

// Os clipes: um giro por osso, amostrado; o último quadro repete o primeiro.
for (const clip of CLIPS) {
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
  const input = addAccessor(times, "SCALAR", FLOAT, { min: [0], max: [times[frames]] });
  const animation = { name: clip.name, samplers: [], channels: [] };
  for (const [bone, values] of Object.entries(tracks)) {
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
writeFileSync(TARGET, glb);

console.log(
  `${TARGET}\n  ${pieces.length} peças em ${output.meshes.length} malhas, ${triangles} triângulos, ${BONES.length} ossos, ` +
    `clipes ${CLIPS.map((clip) => clip.name).join(", ")} — ${(glb.length / 1024).toFixed(0)} kB`,
);
