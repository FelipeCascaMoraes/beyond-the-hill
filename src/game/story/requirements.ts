import type { ChoiceId } from "../../content/choices.ts";
import type { DialogueId } from "../../content/dialogues.ts";
import type { MemoryId } from "../../content/memories.ts";
import type { StoryFlag } from "../../content/story.ts";
import type { Requirement } from "../../content/types.ts";

// Avaliação de condições narrativas. Lógica pura.

/** O que a narrativa sabe sobre o progresso do jogador. */
export interface StoryContext {
  flags: readonly StoryFlag[];
  seenDialogues: readonly DialogueId[];
  recoveredMemories: readonly MemoryId[];
  /** Decisões já tomadas (ausente = nenhuma). */
  choices?: { readonly [Id in ChoiceId]?: string };
}

export function meetsRequirement(requirement: Requirement | undefined, context: StoryContext): boolean {
  if (!requirement) return true;
  if (requirement.flags?.some((flag) => !context.flags.includes(flag))) return false;
  if (requirement.memories?.some((memory) => !context.recoveredMemories.includes(memory))) return false;
  if (requirement.seenAtLeast) {
    const { dialogues, count } = requirement.seenAtLeast;
    const seen = dialogues.filter((id) => context.seenDialogues.includes(id)).length;
    if (seen < count) return false;
  }
  if (requirement.choices) {
    for (const id of Object.keys(requirement.choices) as ChoiceId[]) {
      if (context.choices?.[id] !== requirement.choices[id]) return false;
    }
  }
  return true;
}
