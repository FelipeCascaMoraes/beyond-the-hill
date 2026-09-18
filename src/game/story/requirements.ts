import type { DialogueId } from "../../content/dialogues.ts";
import type { StoryFlag } from "../../content/story.ts";
import type { Requirement } from "../../content/types.ts";

// Avaliação de condições narrativas. Lógica pura.

/** O que a narrativa sabe sobre o progresso do jogador. */
export interface StoryContext {
  flags: readonly StoryFlag[];
  seenDialogues: readonly DialogueId[];
}

export function meetsRequirement(requirement: Requirement | undefined, context: StoryContext): boolean {
  if (!requirement) return true;
  if (requirement.flags?.some((flag) => !context.flags.includes(flag))) return false;
  if (requirement.seenAtLeast) {
    const { dialogues, count } = requirement.seenAtLeast;
    const seen = dialogues.filter((id) => context.seenDialogues.includes(id)).length;
    if (seen < count) return false;
  }
  return true;
}
