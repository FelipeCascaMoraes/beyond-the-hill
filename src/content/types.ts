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

// ── Diálogos ─────────────────────────────────────────────────────────────
// Um diálogo é um pequeno grafo de nós. Cada nó tem uma sequência de falas e,
// ao final, escolhas, um próximo nó ou o encerramento.
//
//   start ─► nó { falas... } ─► escolhas ─► nó ...
//                             └► next ────► nó ...
//                             └► (nada) ──► fim

/** Quem fala: um personagem ou o narrador (descrições curtas de ação, sem nome). */
export type Speaker = CharacterId | "narrator";

export interface DialogueLine {
  speaker: Speaker;
  text: string;
  /** Nesta fala alguém se apresenta: a partir daqui o nome aparece no lugar do epíteto. */
  introduces?: CharacterId | readonly CharacterId[];
}

export interface DialogueChoice {
  /** O que a Aysha diz/decide. */
  text: string;
  /** Nó seguinte; sem `next` a escolha encerra o diálogo. */
  next?: string;
}

export interface DialogueNode {
  lines: readonly DialogueLine[];
  /** Mostradas depois da última fala do nó. */
  choices?: readonly DialogueChoice[];
  /** Sem escolhas: segue para este nó; sem `next`, o diálogo termina. */
  next?: string;
}

export interface Dialogue {
  start: string;
  nodes: Readonly<Record<string, DialogueNode>>;
  /**
   * Trava o movimento enquanto o diálogo está aberto (padrão: `true`).
   * Com `false` as falas avançam sozinhas e o jogador continua andando
   * (comentários de fundo); nesse caso não pode haver escolhas.
   */
  blocksMovement?: boolean;
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
