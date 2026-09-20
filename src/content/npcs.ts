import type { NpcDefinition } from "./types";

// NPCs do mundo. Cassandra e Victor esperam juntos na trilha, alguns passos à
// frente de onde a Aysha desperta: visíveis logo na primeira cena.
// As conversas sobre a colina só abrem depois que a Aysha se pergunta por que
// ela parece familiar (marco "hill-familiar").

const afterHillFeelsFamiliar = { flags: ["hill-familiar"] } as const;

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
      { dialogue: "cassandra-after-truth", requires: { flags: ["they-lied"] } },
      "cassandra-idle",
    ],
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
      { dialogue: "victor-after-truth", requires: { flags: ["they-lied"] } },
      "victor-idle",
    ],
  },
} as const satisfies Record<string, NpcDefinition>;

export type NpcId = keyof typeof npcs;
