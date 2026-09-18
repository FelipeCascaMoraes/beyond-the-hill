import { useGameStore } from "@/game/state/gameStore";
import { registerInteractionHandler } from "./actions";

/**
 * Liga as ações aos sistemas que já existem no estado do jogo.
 * `examine`, `event` e `scene` ainda não têm handler: serão registrados
 * pelos respectivos sistemas quando forem implementados.
 */
export function installDefaultInteractionHandlers(): () => void {
  const removers = [
    registerInteractionHandler("dialogue", (action) => useGameStore.getState().startDialogue(action.dialogue)),
    registerInteractionHandler("memory", (action) => useGameStore.getState().recoverMemory(action.memory)),
  ];
  return () => removers.forEach((remove) => remove());
}
