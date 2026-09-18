// Tipos dos dados narrativos. Nada aqui depende de React ou Three.js.
import type { CharacterId } from "./characters";
import type { DialogueId } from "./dialogues";
import type { ZoneId } from "./zones";

export type Vec3 = readonly [number, number, number];

export interface Character {
  name: string;
  /** Como a Aysha se refere ao personagem antes de ele se apresentar (com artigo: "a mulher..."). */
  epithet: string;
  /** Cor provisória usada enquanto não há modelo 3D. */
  placeholderColor: string;
}

/** Área explorável: círculo no plano XZ. */
export interface ZoneBounds {
  center: readonly [number, number];
  radius: number;
}

export interface Zone {
  title: string;
  /** Posição inicial da Aysha ao entrar na zona (y é ignorado: vem do terreno). */
  playerSpawn: Vec3;
  /** Para onde a Aysha olha ao entrar na zona. */
  spawnLookAt: Vec3;
  bounds: ZoneBounds;
}

export interface DialogueLine {
  speaker: CharacterId;
  text: string;
  /** Nesta fala o personagem se apresenta: a partir daqui o nome aparece no lugar do epíteto. */
  introduces?: CharacterId;
}

export interface Dialogue {
  lines: readonly DialogueLine[];
}

/** Um NPC no mundo: onde está e o que tem a dizer. */
export interface NpcDefinition {
  zone: ZoneId;
  /** Posição no plano XZ (a altura vem do terreno). */
  position: readonly [number, number];
  /** Para onde olha quando a Aysha está longe. */
  restLookAt: readonly [number, number];
  /**
   * Conversas em ordem: cada interação toca a próxima ainda não vista;
   * a última se repete.
   */
  conversation: readonly DialogueId[];
}

export interface Memory {
  title: string;
  text: string;
}

export type EndingChoice = "forgive" | "revenge";
