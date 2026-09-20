import { HOUSE } from "./house.ts";
import { LABYRINTH, LABYRINTH_HALF } from "./labyrinth.ts";
import { fbm, smoothstep } from "./noise.ts";

// Forma do mundo. Fonte única da altura do chão: terreno, grama, árvore e o
// movimento da Aysha usam a mesma função, sem física.
//
// Composição vista do despertar (olhando para -Z):
//   campo de grama → crista baixa (~330 m, esconde a base) → vale → a colina (~720 m)

export const TERRAIN_HALF_SIZE = 1250;

/** A colina: cume arredondado à direita, encosta longa e suave à esquerda. */
export const HILL = {
  x: 40,
  z: -720,
  height: 150,
  radiusLeft: 560,
  radiusRight: 300,
  radiusZ: 280,
} as const;

/**
 * A concha atrás do cume: um anel de terra levantado em volta de um fundo
 * abrigado. Fica logo depois do ponto mais alto, então a própria colina a
 * esconde de todo o campo; do cume aparece só um pedaço, e o resto só quando
 * a Aysha chega na borda. É para lá que a subida leva.
 */
export const HOLLOW = {
  x: 44,
  z: -792,
  /** Raio do fundo, onde o anel se levanta. */
  radius: 32,
  /** Quanto o fundo afunda em relação ao terreno em volta. */
  depth: 9,
  /** Altura e largura do anel de borda. */
  rimHeight: 3,
  rimWidth: 11,
  /** A brecha no anel, do lado do cume: é por ela que se entra. */
  gate: { width: 16, depth: 0.9 },
} as const;

/** Ombro na encosta esquerda: um degrau que torna a silhueta reconhecível. */
const SHOULDER = { x: -380, z: -690, height: 58, radiusX: 150, radiusZ: 200 } as const;

/** Onde fica o topo (e a árvore solitária). */
export const SUMMIT = { x: HILL.x, z: HILL.z } as const;

export interface ClimbPoint {
  x: number;
  z: number;
  /** Altura que o terreno deve ter aqui. Sem ela, o trecho é terreno natural. */
  y?: number;
}

/**
 * O caminho que sobe a encosta sul e desce para a concha atrás do cume. Subir
 * em linha reta pela cara da colina dá quase 40° — um paredão. Aqui a trilha
 * contorna para oeste e volta, e o terreno perto dela é puxado para o perfil
 * escrito abaixo (ver `climbRamp`). De longe a silhueta é a mesma; de perto
 * existe por onde subir, e dá para ver lá de cima o trecho já andado.
 *
 * É também a linha de onde saem a área explorável da encosta e a trilha aberta
 * na grama (ver game/world/hillside.ts): mexer aqui move as três coisas.
 */
export const CLIMB_PATH: readonly ClimbPoint[] = [
  // O vale, antes da subida: o terreno já é manso, a rampa não entra.
  { x: 15, z: -330 },
  { x: 23, z: -410 },
  // Daqui em diante a altura é escrita à mão: 27° de subida constante até o
  // cume, e 13° a 18° de descida até o fundo da concha.
  { x: 26, z: -468, y: 11 },
  { x: 8, z: -505, y: 32 },
  { x: -12, z: -560, y: 63 },
  { x: -6, z: -620, y: 94 },
  { x: 14, z: -668, y: 121 },
  { x: 32, z: -700, y: 140 },
  { x: 40, z: -718, y: 150 },
  { x: 44, z: -752, y: 142 },
  { x: 45, z: -800, y: 126 },
];

/** Até esta distância da linha, a rampa manda sozinha; depois volta a colina (m). */
const CLIMB_FULL = 13;
const CLIMB_FADE = 36;

/** Raio ao redor do despertar em que o campo é quase plano. */
const CALM_RADIUS = 10;

function hillHeight(x: number, z: number): number {
  const dx = (x - HILL.x) / (x < HILL.x ? HILL.radiusLeft : HILL.radiusRight);
  const dz = (z - HILL.z) / HILL.radiusZ;
  const main = HILL.height * Math.exp(-Math.pow(dx * dx + dz * dz, 1.15) * 2.6);

  const sx = (x - SHOULDER.x) / SHOULDER.radiusX;
  const sz = (z - SHOULDER.z) / SHOULDER.radiusZ;
  const shoulder = SHOULDER.height * Math.exp(-(sx * sx + sz * sz) * 2);

  return main + shoulder;
}

/** O anel e o fundo da concha, somados ao relevo da colina. */
function hollowHeight(x: number, z: number): number {
  const distance = Math.hypot(x - HOLLOW.x, z - HOLLOW.z);
  // O anel abre uma brecha do lado do cume, ou a Aysha teria de escalar a borda.
  const toGate = Math.hypot(x - HOLLOW.x, z - (HOLLOW.z + HOLLOW.radius));
  const gate = 1 - HOLLOW.gate.depth * Math.exp(-((toGate / HOLLOW.gate.width) ** 2));
  const rim = HOLLOW.rimHeight * gate * Math.exp(-(((distance - HOLLOW.radius) / HOLLOW.rimWidth) ** 2));
  const bowl = -HOLLOW.depth * (1 - smoothstep(0, HOLLOW.radius, distance));
  return rim + bowl;
}

/**
 * Chão nivelado sob o que foi construído, com transição suave para o terreno
 * em volta: nem a casa nem o labirinto ficam tortos sobre a ondulação.
 */
interface GroundPad {
  x: number;
  z: number;
  radius: number;
  /** Largura da transição até o terreno natural (m). */
  feather: number;
}

const HOUSE_PAD: GroundPad = { x: HOUSE.x, z: HOUSE.z, radius: 4.5, feather: 7 };
const LABYRINTH_PAD: GroundPad = { x: LABYRINTH.x, z: LABYRINTH.z, radius: LABYRINTH_HALF + 2, feather: 16 };
const PADS: readonly GroundPad[] = [HOUSE_PAD, LABYRINTH_PAD];

export function terrainHeight(x: number, z: number): number {
  let height = climbRamp(x, z, naturalHeight(x, z));
  for (const pad of PADS) {
    const distance = Math.hypot(x - pad.x, z - pad.z);
    if (distance >= pad.radius + pad.feather) continue;
    const flatten = 1 - smoothstep(pad.radius, pad.radius + pad.feather, distance);
    height += (padHeight(pad) - height) * flatten;
  }
  return height;
}

/** Os trechos com altura escrita: só eles cavam a rampa. */
const rampSegments = CLIMB_PATH.flatMap((from, index) => {
  const to = CLIMB_PATH[index + 1];
  return from.y !== undefined && to?.y !== undefined ? [{ from, to }] : [];
}) as readonly { from: Required<ClimbPoint>; to: Required<ClimbPoint> }[];

/**
 * Puxa o terreno perto da trilha para o perfil escrito em `CLIMB_PATH`. Longe
 * dela o valor não muda, então a colina continua sendo a colina — a rampa é um
 * corte na encosta, não uma reforma.
 */
function climbRamp(x: number, z: number, natural: number): number {
  let best = CLIMB_FADE;
  let target = 0;
  for (const { from, to } of rampSegments) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const t = Math.min(1, Math.max(0, ((x - from.x) * dx + (z - from.z) * dz) / (dx * dx + dz * dz)));
    const distance = Math.hypot(x - (from.x + dx * t), z - (from.z + dz * t));
    if (distance >= best) continue;
    best = distance;
    target = from.y + (to.y - from.y) * t;
  }
  if (best >= CLIMB_FADE) return natural;
  return natural + (target - natural) * (1 - smoothstep(CLIMB_FULL, CLIMB_FADE, best));
}

const padHeights = new Map<GroundPad, number>();

/** Altura do piso de uma construção (calculada uma vez por lugar). */
function padHeight(pad: GroundPad): number {
  let height = padHeights.get(pad);
  if (height === undefined) {
    height = naturalHeight(pad.x, pad.z);
    padHeights.set(pad, height);
  }
  return height;
}

/** Altura do piso da casa. */
export const housePadHeight = (): number => padHeight(HOUSE_PAD);

/** Altura do chão do labirinto. */
export const labyrinthPadHeight = (): number => padHeight(LABYRINTH_PAD);

function naturalHeight(x: number, z: number): number {
  const hill = hillHeight(x, z);

  // Ondulação natural, contida perto do despertar e sobre a colina (silhueta limpa).
  const rolling = (fbm(x * 0.006, z * 0.006) - 0.5) * 14 + (fbm(x * 0.03 + 100, z * 0.03) - 0.5) * 2.5;
  const calm = 0.2 + 0.8 * smoothstep(CALM_RADIUS, 80, Math.hypot(x, z));
  const onHill = Math.min(1, hill / 60);

  // Crista intermediária: baixa no centro, mais alta nas laterais (moldura em V).
  const ridgeHeight = (9 + 16 * smoothstep(80, 420, Math.abs(x - HILL.x))) * (0.8 + 0.4 * fbm(x * 0.004 + 7, 3.1, 3));
  const ridge = ridgeHeight * Math.exp(-(((z + 330) / 70) ** 2));

  // Vale entre a crista e a colina: o que existe ali fica escondido.
  const valley = -10 * Math.exp(-(((z + 500) / 110) ** 2));

  return rolling * calm * (1 - 0.7 * onHill) + ridge + valley + hill + hollowHeight(x, z);
}

/** Trilha de grama pisada que serpenteia do despertar na direção da colina. */
export function trailCenterX(z: number): number {
  return -z * (SUMMIT.x / -SUMMIT.z) + 3 * Math.sin(z * 0.045) + 1.6 * Math.sin(z * 0.12 + 1.3);
}

/** Distância horizontal aproximada até o centro da trilha (a trilha corre quase ao longo de Z). */
export function distanceToTrail(x: number, z: number): number {
  return Math.abs(x - trailCenterX(z));
}
