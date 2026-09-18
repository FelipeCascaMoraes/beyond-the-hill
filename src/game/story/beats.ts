import type { ZoneId } from "../../content/zones.ts";
import type { StoryBeat } from "../../content/types.ts";
import { meetsRequirement, type StoryContext } from "./requirements.ts";

// Escolhe o próximo momento narrativo automático. Lógica pura.

/**
 * Primeiro momento (na ordem declarada) da zona atual cujas condições se
 * cumprem e cujo diálogo ainda não aconteceu. `null` se nenhum.
 */
export function nextBeat<Id extends string>(
  beats: Readonly<Record<Id, StoryBeat>>,
  zone: ZoneId,
  context: StoryContext,
): Id | null {
  for (const id of Object.keys(beats) as Id[]) {
    const beat = beats[id];
    if (beat.zone !== zone) continue;
    if (context.seenDialogues.includes(beat.dialogue)) continue;
    if (meetsRequirement(beat.requires, context)) return id;
  }
  return null;
}
