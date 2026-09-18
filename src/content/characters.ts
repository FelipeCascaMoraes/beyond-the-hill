import type { Character } from "./types";

export const characters = {
  aysha: { name: "Aysha", epithet: "Aysha", placeholderColor: "#4a4038" },
  cassandra: { name: "Cassandra", epithet: "a mulher desconhecida", placeholderColor: "#7a4b5c" },
  victor: { name: "Victor", epithet: "o homem desconhecido", placeholderColor: "#4b5c7a" },
  father: { name: "Pai", epithet: "Pai", placeholderColor: "#8a7a5a" },
  mother: { name: "Mãe", epithet: "Mãe", placeholderColor: "#9a8a7a" },
} as const satisfies Record<string, Character>;

export type CharacterId = keyof typeof characters;
