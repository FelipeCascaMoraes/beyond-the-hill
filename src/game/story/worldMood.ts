import type { WorldMoodId } from "../config/render.ts";
import type { StoryContext } from "./requirements.ts";

// O clima do mundo — não o das lembranças. Muda uma vez só, e muda devagar.

/**
 * Enquanto a Aysha acredita nos dois, o Além é bonito e parado (`idle`).
 * Quando a mentira cai, o ar clareia e a luz vira para a colina (`calling`):
 * nada é dito, mas o campo inteiro passa a apontar para lá.
 *
 * A subida em si não entra aqui — ela é contínua, e vem da altura
 * (ver game/world/hillside.ts).
 */
export function worldMoodOf(context: StoryContext): WorldMoodId {
  return context.flags.includes("they-lied") ? "calling" : "idle";
}
