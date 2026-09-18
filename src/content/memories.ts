import type { Memory } from "./types";

// Memórias da Aysha: só dados. Para criar uma nova, basta adicionar uma
// entrada aqui; a lógica (desbloqueio, ativação, apresentação) é genérica.
//
// As lembranças voltam em fragmentos: sensações antes de fatos. Os nomes, o
// passado criminoso e as mortes só devem aparecer bem mais tarde na jornada.

export const memories = {
  // Primeira memória real: a infância, o pai e a colina que nunca se alcançava.
  // Ativada pela porteira no fim da trilha, depois que a colina parece familiar.
  // ~16 s de fragmentos, avançando sozinhos (~19 s com as transições).
  "childhood-ride": {
    title: "O campo dourado",
    description: "Uma menina, o pai, um cavalo e uma colina que ele nunca a deixava alcançar.",
    unlock: { flags: ["hill-familiar"] },
    trigger: { type: "interaction" },
    tone: "warm",
    autoplay: true,
    fragments: [
      { text: "Um campo igual a este. Mãos pequenas agarradas à crina de um cavalo.", duration: 2.9 },
      { kind: "voice", text: "Segura firme. Eu estou aqui.", duration: 2.1 },
      { text: "Ele ri. Ela ri mais alto.", duration: 1.9 },
      { kind: "voice", text: "Quero que você lembre deste dia.", duration: 2.3 },
      { kind: "voice", soft: true, text: "Pai... o que tem depois da colina?", duration: 2.4 },
      { kind: "voice", text: "Hoje não, pequena.", duration: 1.9 },
      { text: "Ele vira o cavalo. A colina fica para trás.", duration: 2.5 },
    ],
    setsFlags: ["first-memory"],
  },
} as const satisfies Record<string, Memory>;

export type MemoryId = keyof typeof memories;
