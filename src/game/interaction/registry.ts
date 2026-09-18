import type { InteractableEntry } from "./types.ts";

// Interativos montados na cena. Fora do React: consultado a cada frame sem re-render.

const entries = new Map<string, InteractableEntry>();

/** Registra um interativo. Retorna a função que o remove. */
export function registerInteractable(id: string, entry: InteractableEntry): () => void {
  if (entries.has(id)) console.warn(`Interativo duplicado: "${id}". O anterior foi substituído.`);
  entries.set(id, entry);
  return () => {
    // Só remove se ainda for o mesmo registro (evita apagar um substituto).
    if (entries.get(id) === entry) entries.delete(id);
  };
}

export function getInteractables(): Iterable<InteractableEntry> {
  return entries.values();
}

export function getInteractable(id: string): InteractableEntry | undefined {
  return entries.get(id);
}
