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
  // Depois da primeira lembrança o Além mostra os dentes: algo ronda o campo.
  "machine-arrives": {
    zone: "arrival",
    dialogue: "machine-arrives",
    requires: { flags: ["first-memory"] },
    delay: 4,
  },
} as const satisfies Record<string, StoryBeat>;

export type StoryBeatId = keyof typeof storyBeats;
