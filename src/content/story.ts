import type { StoryBeat } from "./types";

// Progressão narrativa: marcos da história e momentos que acontecem sozinhos.

/** Marcos da história, ligados ao fim de diálogos (`setsFlags`). */
export const storyFlags = [
  "met-guides",
  "hill-familiar",
  "first-memory",
  "found-drawing",
  "parents-lost",
  "machine-seen",
  "machine-caught",
  "hunt-began",
  "labyrinth-found",
  "saw-them-again",
  "guides-known",
  "own-death",
  "they-lied",
  "hill-reached",
  "hill-climbed",
  "refuge-seen",
  // O refúgio: os pais aparecem, e depois ela lembra de tudo.
  "parents-found",
  "remembered",
  // O fim: os dois aparecem na beira do refúgio, e depois não estão mais lá.
  "guides-return",
  "guides-gone",
] as const;
export type StoryFlag = (typeof storyFlags)[number];

/** Pensamentos dos pontos de interesse do campo de chegada. */
export const arrivalPoiDialogues = [
  "poi-horseshoe",
  "poi-fence",
  "poi-cairn",
  "poi-flowers",
  "poi-overlook",
  "poi-gate",
  "poi-house-drawing",
  "poi-house-table",
  "poi-house-horse",
  "poi-house-window",
] as const;

/**
 * Momentos que o jogo dispara sozinho quando as condições se cumprem e o
 * jogador está livre (sem diálogo nem memória aberta). Cada um acontece uma vez.
 */
export const storyBeats = {
  // Logo depois do encontro: permissão para explorar (sem travar o movimento).
  "arrival-encourage": {
    zone: "arrival",
    dialogue: "arrival-encourage",
    requires: { flags: ["met-guides"] },
    delay: 1.2,
  },
  // Depois de alguns pontos de interesse, a pergunta central da primeira cena.
  "arrival-hill-familiar": {
    zone: "arrival",
    dialogue: "arrival-hill-familiar",
    requires: { flags: ["met-guides"], seenAtLeast: { dialogues: arrivalPoiDialogues, count: 3 } },
    delay: 2.5,
  },
  // Depois de lembrar da própria morte, a conta fecha sozinha.
  "guides-lied": {
    zone: "arrival",
    dialogue: "guides-lied",
    requires: { memories: ["after"] },
    delay: 3,
  },
  // E então o campo se esvazia. Este momento só narra o que já é verdade: quem
  // tira os dois e a máquina do mundo é o próprio marco "they-lied" (ver
  // `leavesWhen` em npcs.ts e machines.ts). Assim nada depende de o jogador
  // estar por perto para ouvir — se ele já tiver ido embora para o labirinto,
  // o campo estará vazio quando voltar, com ou sem estas falas.
  "field-empty": {
    zone: "arrival",
    dialogue: "field-empty",
    requires: { flags: ["they-lied"] },
    delay: 4,
  },
  // No refúgio, quando a cena do reencontro devolve o controle: o que sobra
  // depois de lembrar de tudo. Não trava — ela pode ir até os dois ou só ficar.
  "refuge-after": {
    zone: "hillside",
    dialogue: "refuge-after",
    requires: { flags: ["remembered"] },
    delay: 2.5,
  },
  // Depois da primeira lembrança o Além mostra os dentes: algo ronda o campo.
  "machine-arrives": {
    zone: "arrival",
    dialogue: "machine-arrives",
    requires: { flags: ["first-memory"] },
    delay: 4,
  },
} as const satisfies Record<string, StoryBeat>;

export type StoryBeatId = keyof typeof storyBeats;
