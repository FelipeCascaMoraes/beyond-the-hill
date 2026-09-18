import type { InteractableEntry, InteractionAction, InteractionActionType } from "./types.ts";

// Tabela de ações: cada tipo de ação tem um handler plugável.
// Novos sistemas (diálogo, exame, eventos, cenas) só precisam registrar o seu.

type ActionOf<T extends InteractionActionType> = Extract<InteractionAction, { type: T }>;

export type InteractionHandler<T extends InteractionActionType> = (
  action: ActionOf<T>,
  source: InteractableEntry,
) => void;

type HandlerMap = { [T in InteractionActionType]?: InteractionHandler<T> };

const handlers: HandlerMap = {};

/** Registra o handler de um tipo de ação. Retorna a função que o remove. */
export function registerInteractionHandler<T extends InteractionActionType>(
  type: T,
  handler: InteractionHandler<T>,
): () => void {
  (handlers as Record<T, InteractionHandler<T> | undefined>)[type] = handler;
  return () => {
    if (handlers[type] === handler) delete handlers[type];
  };
}

/** Executa a ação do interativo. Retorna `false` se não houver handler para o tipo. */
export function runInteraction(entry: InteractableEntry): boolean {
  const { action } = entry.definition;
  const handler = handlers[action.type] as InteractionHandler<typeof action.type> | undefined;
  if (!handler) {
    console.warn(`Nenhum handler registrado para a ação "${action.type}" (interativo "${entry.definition.id}").`);
    return false;
  }
  handler(action, entry);
  if (entry.definition.once) entry.used = true;
  return true;
}
