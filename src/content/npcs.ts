import type { NpcDefinition } from "./types";

// NPCs do mundo. Cassandra e Victor esperam juntos na trilha, alguns passos à
// frente de onde a Aysha desperta: visíveis logo na primeira cena.
// As conversas sobre a colina só abrem depois que a Aysha se pergunta por que
// ela parece familiar (marco "hill-familiar").

const afterHillFeelsFamiliar = { flags: ["hill-familiar"] } as const;

// No instante em que a Aysha entende quem eles são, os dois deixam de estar no
// campo — sem despedida, sem serem vistos indo embora. Não é fuga: é que o
// disfarce parou de servir. Daí em diante a trilha fica vazia (ver o momento
// "field-empty") e a colina é o único lugar para onde ir.
const afterSheKnows = { flags: ["they-lied"] } as const;

// A última janela para falar com eles: a Aysha já reconheceu os dois rostos
// (lembrança "the-two"), mas ainda não juntou a conta inteira. Eles continuam
// amáveis, e não sabem que ela sabe — é o que torna essas duas conversas as
// piores do jogo. Fechar a conta é o momento "guides-lied", e nele eles somem.
const afterSheRecognizesThem = { flags: ["guides-known"] } as const;

export const npcs = {
  cassandra: {
    zone: "arrival",
    position: [-2.4, -13],
    restLookAt: [0, 0],
    conversation: [
      "arrival-meeting",
      { dialogue: "cassandra-hill", requires: afterHillFeelsFamiliar },
      // Ela desconversa sobre o que existe do outro lado do campo.
      { dialogue: "cassandra-machine", requires: { flags: ["machine-seen"] } },
      { dialogue: "cassandra-after-truth", requires: afterSheRecognizesThem },
      "cassandra-idle",
    ],
    leavesWhen: afterSheKnows,
  },
  victor: {
    zone: "arrival",
    position: [-0.6, -14.6],
    restLookAt: [0, 0],
    conversation: [
      "arrival-meeting",
      "victor-machines",
      { dialogue: "victor-hill", requires: afterHillFeelsFamiliar },
      { dialogue: "victor-house", requires: { flags: ["found-drawing"] } },
      { dialogue: "victor-machine", requires: { flags: ["machine-seen"] } },
      { dialogue: "victor-after-truth", requires: afterSheRecognizesThem },
      "victor-idle",
    ],
    leavesWhen: afterSheKnows,
  },
} as const satisfies Record<string, NpcDefinition>;

export type NpcId = keyof typeof npcs;
