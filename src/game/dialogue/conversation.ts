import type { DialogueId } from "../../content/dialogues.ts";
import type { ConversationEntry } from "../../content/types.ts";
import { meetsRequirement, type StoryContext } from "../story/requirements.ts";

// Regras puras de conversa e identificação.

const dialogueOf = (entry: ConversationEntry): DialogueId => (typeof entry === "string" ? entry : entry.dialogue);
const isAvailable = (entry: ConversationEntry, context: StoryContext) =>
  typeof entry === "string" || meetsRequirement(entry.requires, context);

/**
 * Próxima conversa: a primeira disponível ainda não vista; quando não houver,
 * repete a última disponível.
 */
export function nextConversation(conversation: readonly ConversationEntry[], context: StoryContext): DialogueId {
  const available = conversation.filter((entry) => isAvailable(entry, context)).map(dialogueOf);
  if (available.length === 0) throw new Error("Conversa sem nenhum diálogo disponível: defina ao menos um sem condição.");
  return available.find((id) => !context.seenDialogues.includes(id)) ?? available[available.length - 1];
}

/** Nome do personagem se a Aysha já o conhece; caso contrário, o epíteto. */
export function characterLabel(character: { name: string; epithet: string }, known: boolean): string {
  return known ? character.name : character.epithet;
}
