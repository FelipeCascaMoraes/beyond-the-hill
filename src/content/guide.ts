import { CLIMB_PATH } from "../game/world/terrain.ts";
import { npcs } from "./npcs.ts";
import { pointsOfInterest } from "./pointsOfInterest.ts";
import { arrivalPoiDialogues } from "./story.ts";
import type { GuidePassage, GuideStep } from "./types";

// O roteiro: o que a tela diz para fazer agora. Só dados — quem escolhe o
// passo é game/guide/guide.ts, quem mostra é ui/guide/GuideHint.
//
// Cada passo diz para onde ir e o que procurar, nunca o que vai acontecer lá.
// A ordem é a da história: vale o primeiro passo ainda não cumprido.

const { horseshoe, fence, cairn, flowers, overlook, gate } = pointsOfInterest;

/** Entre Cassandra e Victor, na trilha. */
const guides = [
  (npcs.cassandra.position[0] + npcs.victor.position[0]) / 2,
  (npcs.cassandra.position[1] + npcs.victor.position[1]) / 2,
] as const;

/** A subida até o ponto mais alto do caminho: a árvore do cume. */
const summitIndex = CLIMB_PATH.reduce(
  (best, point, index) => ((point.y ?? -Infinity) > (CLIMB_PATH[best].y ?? -Infinity) ? index : best),
  0,
);
const toSummit = CLIMB_PATH.slice(0, summitIndex + 1);

export const guideSteps = {
  "meet-guides": {
    zone: "arrival",
    until: { flags: ["met-guides"] },
    title: "Fale com as duas pessoas na trilha",
    hint: "Elas estão logo à frente. Ande até elas e aperte E.",
    target: { type: "point", position: guides },
  },
  "look-around": {
    zone: "arrival",
    until: { flags: ["hill-familiar"] },
    title: "Examine três coisas pelo campo",
    hint: "Uma ferradura, uma cerca, pedras empilhadas, flores… Chegue perto, olhe para a coisa e aperte E.",
    target: {
      type: "any",
      points: [horseshoe, fence, cairn, flowers, overlook, gate].map(({ position, dialogue }) => ({ position, dialogue })),
    },
    tally: { dialogues: arrivalPoiDialogues, of: 3 },
  },
  gate: {
    zone: "arrival",
    until: { memories: ["childhood-ride"] },
    title: "Vá até a porteira no fim da trilha",
    hint: "Siga a trilha na direção da colina, passando pelos dois, e toque a porteira.",
    target: { type: "point", position: gate.position },
  },
  house: {
    zone: "arrival",
    until: { flags: ["found-drawing"] },
    title: "Encontre a casa abandonada e o desenho na parede",
    hint: "Fica do outro lado do campo, à esquerda de quem olha para a colina. Uma máquina ronda o caminho: espere ela se afastar e corra (Shift). Dentro da casa ela não vê você.",
    target: { type: "point", position: pointsOfInterest.houseDrawing.position },
  },
  "toy-horse": {
    zone: "arrival",
    until: { memories: ["parents-night"] },
    title: "Pegue o cavalinho de madeira",
    hint: "Está no parapeito da janela, dentro da casa.",
    target: { type: "point", position: pointsOfInterest.houseHorse.position },
  },
  "labyrinth-note": {
    zone: "labyrinth",
    until: { memories: ["the-names"] },
    title: "Chegue ao centro do labirinto",
    hint: "A máquina dá voltas no corredor de fora. Espere ela passar e entre: no meio das paredes ela não vê você. A câmara do centro só abre pelo lado da colina.",
    target: { type: "point", position: pointsOfInterest.labyrinthNote.position },
  },
  "see-them-again": {
    zone: "arrival",
    until: { flags: ["saw-them-again"] },
    title: "Volte até Cassandra e Victor",
    hint: "Chegue perto dos dois e olhe bem para eles.",
    target: { type: "point", position: guides },
  },
  recognize: {
    zone: "arrival",
    until: { memories: ["the-two"] },
    title: "Espere um instante",
    hint: "Alguma coisa neles está voltando à memória.",
  },
  overlook: {
    zone: "arrival",
    until: { memories: ["after"] },
    title: "Sente na pedra virada para a colina",
    hint: "É uma pedra grande perto da porteira, à direita da trilha.",
    target: { type: "point", position: overlook.position },
  },
  "the-truth": {
    zone: "arrival",
    until: { flags: ["they-lied"] },
    title: "Espere um instante",
    hint: "Aysha está juntando as peças.",
  },
  climb: {
    zone: "hillside",
    until: { flags: ["hill-climbed"] },
    title: "Suba a colina até a árvore no alto",
    hint: "Siga a trilha aberta na grama. Aqui não há máquinas: é só andar.",
    target: { type: "trail", path: toSummit },
  },
  "over-the-top": {
    zone: "hillside",
    until: { flags: ["refuge-seen"] },
    title: "Passe pela árvore e desça do outro lado",
    hint: "O caminho continua atrás do cume.",
    target: { type: "trail", path: CLIMB_PATH },
  },
  refuge: {
    zone: "hillside",
    until: { flags: ["remembered"] },
    title: "Desça até a árvore pequena lá embaixo",
    hint: "Passe pela pedra e continue até o fundo.",
    target: { type: "trail", path: CLIMB_PATH },
  },
  stay: {
    zone: "hillside",
    until: { flags: ["guides-return"] },
    title: "Fique com os dois",
    hint: "Converse com eles, ou só fique por perto um pouco.",
  },
} as const satisfies Record<string, GuideStep>;

export type GuideStepId = keyof typeof guideSteps;

/** Quando o passo atual é em outra zona: por onde se vai. */
export const guidePassages = [
  {
    from: "arrival",
    to: ["labyrinth", "hillside"],
    title: "Abra a porteira no fim da trilha",
    hint: "É por ela que se segue adiante, na direção da colina.",
    position: gate.position,
  },
  {
    from: "labyrinth",
    to: ["arrival"],
    title: "Volte para o campo",
    hint: "Saia por onde entrou e examine a pilha de pedras do lado de fora.",
    position: pointsOfInterest.labyrinthReturn.position,
  },
  {
    from: "labyrinth",
    to: ["hillside"],
    title: "Saia pelo lado norte do labirinto",
    hint: "A passagem do lado da colina está aberta agora. A máquina ainda ronda o corredor de fora: atravesse pelo meio das paredes.",
    position: pointsOfInterest.labyrinthExit.position,
  },
] as const satisfies readonly GuidePassage[];
