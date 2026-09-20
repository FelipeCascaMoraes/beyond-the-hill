import type { Requirement } from "../../content/types.ts";
import { meetsRequirement, type StoryContext } from "./requirements.ts";

// Quem está no mundo agora. As coisas do Além chegam com a história e vão
// embora com ela: os dois guias somem no instante em que a Aysha entende quem
// são, e a máquina do campo some junto, porque não há mais nada para vigiar.
//
// Lógica pura, usada tanto por quem desenha (cena) quanto por quem esbarra
// (colisão do jogador) — as duas coisas precisam concordar sempre, ou a Aysha
// bate em quem já não está lá.

/** Algo que só existe em um trecho da história. */
export interface Presence {
  /** Enquanto não se cumprir, ainda não chegou. */
  requires?: Requirement;
  /** Quando se cumprir, foi embora. */
  leavesWhen?: Requirement;
}

export function isPresent(thing: Presence, context: StoryContext): boolean {
  if (!meetsRequirement(thing.requires, context)) return false;
  return thing.leavesWhen === undefined || !meetsRequirement(thing.leavesWhen, context);
}
