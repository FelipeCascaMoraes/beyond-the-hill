import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { runInteraction } from "@/game/interaction/actions";
import { installDefaultInteractionHandlers } from "@/game/interaction/defaultHandlers";
import { findFocus } from "@/game/interaction/focus";
import { getInteractables } from "@/game/interaction/registry";
import { consumeInteract } from "@/game/input/input";
import { selectCanInteract, useGameStore } from "@/game/state/gameStore";

const viewDirection = new Vector3();

/**
 * A cada frame: descobre qual interativo está em foco (mira ou proximidade),
 * publica o foco para o prompt da UI e dispara a ação quando o jogador aperta E.
 */
export function InteractionSystem() {
  useEffect(() => installDefaultInteractionHandlers(), []);

  useFrame(({ camera }) => {
    // Sempre consome: um toque feito sem alvo não dispara nada depois.
    const pressed = consumeInteract();
    const state = useGameStore.getState();
    const currentId = state.interactionFocus?.id ?? null;

    let focus = null;
    if (selectCanInteract(state)) {
      camera.getWorldDirection(viewDirection);
      focus = findFocus(getInteractables(), { position: camera.position, direction: viewDirection }, currentId);
    }

    // Só atualiza o estado quando o foco muda (sem re-render por frame).
    const focusId = focus?.definition.id ?? null;
    if (focusId !== currentId) {
      state.setInteractionFocus(focus ? { id: focus.definition.id, prompt: focus.definition.prompt } : null);
    }

    if (pressed && focus) runInteraction(focus);
  });

  return null;
}
