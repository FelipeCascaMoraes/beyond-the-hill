import type { Memory } from "./types";

// Textos provisórios; o roteiro final substitui estes fragmentos.
export const memories = {
  "father-ride": {
    title: "Cavalgada",
    text: "Meu pai me levava para cavalgar. Nunca até o fim da colina.",
  },
} as const satisfies Record<string, Memory>;

export type MemoryId = keyof typeof memories;
