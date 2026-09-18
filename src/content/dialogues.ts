import type { Dialogue } from "./types";

// Roteiro das conversas.
// Neste ponto da história Cassandra e Victor devem parecer amigáveis, úteis e
// confiáveis. A única pista está nas entrelinhas: eles desencorajam, com
// delicadeza, que a Aysha busque lembranças e que se aproxime da colina.

export const dialogues = {
  "arrival-meeting": {
    lines: [
      { speaker: "cassandra", text: "Calma... está tudo bem. Você acabou de chegar." },
      { speaker: "aysha", text: "Onde... onde eu estou?" },
      { speaker: "cassandra", text: "No Além. É assim que chamamos este lugar. Eu sou Cassandra.", introduces: "cassandra" },
      {
        speaker: "victor",
        text: "E eu sou Victor. Não se assuste com o silêncio. Com o tempo, ele fica mais leve.",
        introduces: "victor",
      },
      { speaker: "aysha", text: "Eu não lembro de quase nada." },
      {
        speaker: "cassandra",
        text: "É normal. Quase todos chegam assim. As lembranças voltam aos poucos... e nem sempre fazem bem.",
      },
      {
        speaker: "victor",
        text: "Fique perto da gente. Existem máquinas que andam por estes campos, e elas não gostam de quem está sozinho.",
      },
      { speaker: "cassandra", text: "Nós conhecemos os caminhos. Vamos cuidar de você." },
    ],
  },

  "cassandra-hill": {
    lines: [
      { speaker: "aysha", text: "Aquela colina... eu sinto que já estive lá." },
      { speaker: "cassandra", text: "Todos que chegam olham primeiro para ela." },
      { speaker: "cassandra", text: "Com o tempo, a gente aprende a olhar para outras coisas." },
    ],
  },

  "cassandra-idle": {
    lines: [{ speaker: "cassandra", text: "Descanse um pouco. Aqui o tempo não tem pressa." }],
  },

  "victor-machines": {
    lines: [
      { speaker: "aysha", text: "Que máquinas são essas?" },
      {
        speaker: "victor",
        text: "Ninguém sabe ao certo. Dizem que algo acima de tudo isto as colocou aqui para caçar quem vive no Além.",
      },
      {
        speaker: "victor",
        text: "Se ouvir um zumbido metálico, não fique no campo aberto. Procure abrigo e espere passar.",
      },
    ],
  },

  "victor-idle": {
    lines: [{ speaker: "victor", text: "Estou de olho no horizonte. Pode ficar tranquila." }],
  },
} as const satisfies Record<string, Dialogue>;

export type DialogueId = keyof typeof dialogues;
