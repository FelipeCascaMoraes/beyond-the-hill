"use client";

import { useSyncExternalStore } from "react";
import { isPointerLocked, subscribePointerLock } from "@/game/input/input";
import { selectCanControl, selectCanInteract, useGameStore } from "@/game/state/gameStore";
import { useAscent } from "./useAscent";

const shadow = "[text-shadow:0_1px_10px_rgba(0,0,0,0.6)]";

/** Opacidade normal da mira e do prompt, antes da subida apagá-los. */
const RETICLE_OPACITY = 0.7;
/** Quanto o prompt chega a perder no cume: some um pouco, mas continua legível. */
const PROMPT_FADE = 0.3;

/**
 * Mira discreta no centro e o prompt "[ E ] …" quando há algo para interagir.
 *
 * Os dois vão se apagando ao longo da subida da colina: a mira, que é o que
 * mais lembra que isto é um jogo, some de vez no cume; o prompt fica, porque
 * ainda é preciso saber que dá para tocar as coisas, mas fica mais fraco.
 */
export function InteractionPrompt() {
  const canControl = useGameStore(selectCanControl);
  const canInteract = useGameStore(selectCanInteract);
  const focus = useGameStore((state) => state.interactionFocus);
  const locked = useSyncExternalStore(subscribePointerLock, isPointerLocked, () => false);
  const climbed = useAscent();

  const showReticle = canControl && locked;
  const showPrompt = canInteract && focus !== null;

  return (
    <>
      <span
        aria-hidden
        style={{ opacity: showReticle ? RETICLE_OPACITY * (1 - climbed) : 0 }}
        className={`absolute top-1/2 left-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-50 transition-all duration-300 ${
          showPrompt ? "size-1.5" : "size-1"
        }`}
      />
      <div
        role="status"
        aria-live="polite"
        style={{ opacity: showPrompt ? 1 - PROMPT_FADE * climbed : 0 }}
        className={`absolute top-[calc(50%+2.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap text-stone-100 transition-opacity duration-300 ${shadow}`}
      >
        {focus && (
          <>
            <span className="text-xs tracking-[0.35em] text-stone-300">[ E ]</span>
            <span className="font-serif text-lg font-light tracking-[0.06em] italic">{focus.prompt}</span>
          </>
        )}
      </div>
    </>
  );
}
