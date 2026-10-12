import { REFUGE } from "../game/world/refuge.ts";
import { SUMMIT } from "../game/world/terrain.ts";
import type { Cinematic, GroundPoint } from "./types";

// Cenas: momentos em que o jogo tira a câmera da Aysha e conta alguma coisa.
// Só dados — quem executa os passos é scene/cinematic/CinematicDirector.
//
// Duas, as duas no refúgio: o reencontro com os pais e o fim do jogo.

const { father, mother, tree } = REFUGE;

/** Entre os dois, na altura do peito: é para onde o olhar vai. */
const between: GroundPoint = [(father[0] + mother[0]) / 2, 1.45, (father[1] + mother[1]) / 2];

/** Onde ela para, a poucos passos deles. É também onde o controle volta. */
const close = { x: 44.5, z: -804.4 } as const;

/** Entre Cassandra e Victor, na beira do patamar. */
const guides: GroundPoint = [(REFUGE.cassandra[0] + REFUGE.victor[0]) / 2, 1.5, (REFUGE.cassandra[1] + REFUGE.victor[1]) / 2];

/** Os dois ramos do fim. */
const forgiving = { choices: { ending: "forgive" } } as const;
const avenging = { choices: { ending: "revenge" } } as const;

export const cinematics = {
  // Ela desce para o patamar e o jogo tira o controle devagar: primeiro o
  // passo encurta (game/world/refuge.ts), depois a câmera assume. Olha para a
  // árvore; os dois aparecem debaixo dela, sem vir de lugar nenhum. Quatro
  // falas, um passo à frente, mais quatro — e ela deixa a vida inteira voltar,
  // com os dois do lado. No fim a tela diz, sozinha: "Eu me lembro."
  //
  // O reencontro é contido de propósito: ninguém chora na tela, ninguém
  // explica nada. O que conta é a distância que some entre um plano e outro.
  reunion: {
    zone: "hillside",
    trigger: { center: [44, -796.5], radius: 6 },
    requires: { flags: ["refuge-seen"] },
    steps: [
      // A câmera assume de onde ela está e encontra a árvore.
      { type: "shot", shot: { position: [44, 1.62, -797.5], target: [tree.x, 1.8, tree.z] }, move: 3.2 },
      { type: "pause", seconds: 0.6 },
      // Eles aparecem: a luz sob a árvore se adensa e os dois estão ali.
      { type: "flags", flags: ["parents-found"] },
      { type: "pause", seconds: 3.4 },
      { type: "dialogue", dialogue: "reunion-see" },
      // Ela anda até eles. A câmera ainda está chegando quando a fala começa.
      { type: "shot", shot: { position: [close.x, 1.62, close.z], target: between }, move: 5.5, wait: 1.5 },
      { type: "dialogue", dialogue: "reunion-hold" },
      { type: "pause", seconds: 1 },
      // E a vida inteira, de uma vez.
      { type: "memory", memory: "whole" },
      { type: "title", text: "Eu me lembro.", seconds: 4.6 },
    ],
    release: { position: [close.x, close.z], lookAt: between },
  },

  // O fim. Alguns segundos depois de ela lembrar de tudo, com o refúgio em
  // silêncio, Cassandra e Victor aparecem na beira do patamar. Uma conversa,
  // uma escolha — e cada escolha segue por um ramo da mesma cena (`when`).
  //
  //   os dois aparecem → a conversa → PERDOAR / VINGAR-SE
  //     perdoar:   ela os manda embora; o lugar não os deixa voltar;
  //                ela senta com os pais.
  //     vingar-se: ela vai até eles, diz tudo em voz alta e os esquece;
  //                eles deixam de existir; ela volta para os pais.
  //   → a câmera sobe e mostra a colina → BEYOND THE HILL / FIM
  //
  // Nenhum dos dois ramos tem violência: no perdão ninguém levanta a mão; na
  // vingança, a arma é esquecer.
  confrontation: {
    zone: "hillside",
    // Em qualquer ponto do refúgio, depois de alguns segundos em paz.
    trigger: { center: [REFUGE.center.x, REFUGE.center.z], radius: 22, delay: 8 },
    requires: { flags: ["remembered"], seenAtLeast: { dialogues: ["refuge-after"], count: 1 } },
    steps: [
      // Ela se vira para a saída do refúgio, e eles estão lá.
      { type: "shot", shot: { position: [close.x, 1.62, -801.5], target: guides }, move: 3 },
      { type: "flags", flags: ["guides-return"] },
      { type: "pause", seconds: 3.4 },
      { type: "dialogue", dialogue: "final-confrontation" },
      { type: "choice", choice: "ending" },

      // ── Perdoar ────────────────────────────────────────────────────────
      { when: forgiving, type: "dialogue", dialogue: "ending-forgive" },
      { when: forgiving, type: "flags", flags: ["guides-gone"] },
      { when: forgiving, type: "dialogue", dialogue: "ending-forgive-gone" },
      // Ela se vira e senta com os dois: a câmera desce à altura de quem senta.
      { when: forgiving, type: "shot", shot: { position: [close.x, 1.15, -804.8], target: [between[0], 1.25, between[2]] }, move: 5, wait: 2 },
      { when: forgiving, type: "dialogue", dialogue: "ending-forgive-stay" },

      // ── Vingar-se ──────────────────────────────────────────────────────
      { when: avenging, type: "shot", shot: { position: [44.4, 1.62, -794.6], target: guides }, move: 4, wait: 1.5 },
      { when: avenging, type: "dialogue", dialogue: "ending-revenge" },
      { when: avenging, type: "flags", flags: ["guides-gone"] },
      { when: avenging, type: "pause", seconds: 1.5 },
      { when: avenging, type: "dialogue", dialogue: "ending-revenge-gone" },
      // E volta para o refúgio, para os dois que esperaram.
      { when: avenging, type: "shot", shot: { position: [close.x, 1.62, -804.8], target: between }, move: 6, wait: 2 },
      { when: avenging, type: "dialogue", dialogue: "ending-revenge-return" },

      // ── A colina ───────────────────────────────────────────────────────
      // A câmera deixa os três lá embaixo, sobe acima do cume e recua até o
      // vale, de onde a colina aparece inteira — a árvore contra o céu, como
      // na primeira imagem do jogo. As alturas são escolhidas para a linha
      // reta entre os dois pontos passar por cima do cume (ver os testes).
      { type: "pause", seconds: 2 },
      { type: "shot", shot: { position: [44, 110, -812], target: [SUMMIT.x, 30, SUMMIT.z] }, move: 7 },
      { type: "shot", shot: { position: [12, 40, -430], target: [SUMMIT.x, 20, SUMMIT.z] }, move: 11 },
      { type: "pause", seconds: 3 },
      { type: "finale", title: "BEYOND THE HILL", subtitle: "FIM" },
    ],
  },
} as const satisfies Record<string, Cinematic>;

export type CinematicId = keyof typeof cinematics;
