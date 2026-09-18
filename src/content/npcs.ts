import type { NpcDefinition } from "./types";

// NPCs do mundo. Cassandra e Victor esperam juntos na trilha, alguns passos à
// frente de onde a Aysha desperta: visíveis logo na primeira cena.

export const npcs = {
  cassandra: {
    zone: "arrival",
    position: [-2.4, -13],
    restLookAt: [0, 0],
    conversation: ["arrival-meeting", "cassandra-hill", "cassandra-idle"],
  },
  victor: {
    zone: "arrival",
    position: [-0.6, -14.6],
    restLookAt: [0, 0],
    conversation: ["arrival-meeting", "victor-machines", "victor-idle"],
  },
} as const satisfies Record<string, NpcDefinition>;

export type NpcId = keyof typeof npcs;
