import type { Character } from "./types";

export const characters = {
  aysha: { name: "Aysha", placeholderColor: "#4a4038" },
  cassandra: { name: "Cassandra", placeholderColor: "#7a4b5c" },
  victor: { name: "Victor", placeholderColor: "#4b5c7a" },
  father: { name: "Pai", placeholderColor: "#8a7a5a" },
  mother: { name: "Mãe", placeholderColor: "#9a8a7a" },
} as const satisfies Record<string, Character>;

export type CharacterId = keyof typeof characters;
