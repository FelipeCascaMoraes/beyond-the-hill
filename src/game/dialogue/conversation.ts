// Regras puras de conversa e identificação. Sem React, sem dados importados.

/** Próxima conversa: a primeira ainda não vista; depois de todas, repete a última. */
export function nextConversation<T extends string>(conversation: readonly T[], seen: readonly T[]): T {
  if (conversation.length === 0) throw new Error("Conversa vazia: defina ao menos um diálogo para o NPC.");
  return conversation.find((id) => !seen.includes(id)) ?? conversation[conversation.length - 1];
}

/** Nome do personagem se a Aysha já o conhece; caso contrário, o epíteto. */
export function characterLabel(character: { name: string; epithet: string }, known: boolean): string {
  return known ? character.name : character.epithet;
}
