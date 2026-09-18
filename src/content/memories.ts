import type { Memory } from "./types";

// Memórias da Aysha: só dados. Para criar uma nova, basta adicionar uma
// entrada aqui; a lógica (desbloqueio, ativação, apresentação) é genérica.
//
// As lembranças voltam em fragmentos: sensações antes de fatos. Os nomes e o
// passado criminoso só devem aparecer bem mais tarde na jornada.

export const memories = {
  // Memória de teste: primeira lembrança, logo depois da pergunta sobre a colina.
  "first-ride": {
    title: "O campo",
    description: "Vento, um cavalo grande demais e uma colina que não se podia alcançar.",
    unlock: { flags: ["hill-familiar"] },
    trigger: { type: "auto", delay: 4 },
    fragments: [
      { text: "Vento no rosto. Cheiro de grama quente." },
      { text: "Um cavalo grande demais para ela. Mãos firmes segurando as rédeas por cima das suas." },
      { text: "Ao longe, uma colina. Ela aponta." },
      { kind: "voice", text: "Até ali não, pequena. Ainda não." },
      { text: "A lembrança se desfaz antes que ela veja o rosto." },
    ],
    setsFlags: ["first-memory"],
  },
} as const satisfies Record<string, Memory>;

export type MemoryId = keyof typeof memories;
