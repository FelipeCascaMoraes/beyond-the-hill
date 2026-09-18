import type { DialogueId, MemoryId } from "@/content";

// Tipos do sistema de interação. Sem React, sem Three.js.

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * O que acontece ao interagir. Cada tipo é tratado por um handler registrável
 * (ver actions.ts); tipos sem handler são ignorados com aviso em desenvolvimento.
 */
export type InteractionAction =
  | { type: "dialogue"; dialogue: DialogueId }
  | { type: "memory"; memory: MemoryId }
  | { type: "examine"; text: string }
  | { type: "event"; event: string }
  | { type: "scene"; scene: string };

export type InteractionActionType = InteractionAction["type"];

/**
 * - `look`: é preciso mirar no objeto, dentro do alcance (objetos, portas, memórias).
 * - `proximity`: basta estar perto, sem mirar (NPCs, áreas).
 */
export type InteractionMode = "look" | "proximity";

export interface InteractableDefinition {
  /** Único entre os interativos montados. */
  id: string;
  /** Texto do prompt: "[ E ] {prompt}". */
  prompt: string;
  action: InteractionAction;
  mode?: InteractionMode;
  /** Distância máxima dos olhos até o objeto (m). */
  reach?: number;
  /** Raio do alvo para a mira (m). Só no modo `look`. */
  targetRadius?: number;
  /** Desligado: continua registrado, mas não recebe foco. */
  enabled?: boolean;
  /** Só pode ser usado uma vez por montagem. */
  once?: boolean;
}

/** Interativo registrado: definição + posição atual no mundo. */
export interface InteractableEntry {
  readonly definition: InteractableDefinition;
  readonly position: Point3;
  used: boolean;
}

export const INTERACTION_DEFAULTS = {
  mode: "look",
  reach: 2.6,
  targetRadius: 0.6,
} as const satisfies Required<Pick<InteractableDefinition, "mode" | "reach" | "targetRadius">>;
