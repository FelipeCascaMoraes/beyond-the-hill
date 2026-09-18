import type { Dialogue } from "./types";

// Textos provisórios; o roteiro final substitui estas falas.
export const dialogues = {
  "arrival-meeting": {
    lines: [
      { speaker: "Cassandra", text: "Você acordou. Não tenha medo." },
      { speaker: "Victor", text: "Fique perto de nós. Este lugar não é seguro." },
    ],
  },
} as const satisfies Record<string, Dialogue>;

export type DialogueId = keyof typeof dialogues;
