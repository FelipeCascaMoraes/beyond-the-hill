"use client";

import { useSyncExternalStore } from "react";
import { isPointerLocked, subscribePointerLock } from "@/game/input/input";
import { selectCanControl, useGameStore } from "@/game/state/gameStore";

const shadow = "[text-shadow:0_1px_10px_rgba(0,0,0,0.6)]";

/** Mira discreta no centro e o prompt "[ E ] …" quando há algo para interagir. */
export function InteractionPrompt() {
  const canControl = useGameStore(selectCanControl);
  const focus = useGameStore((state) => state.interactionFocus);
  const locked = useSyncExternalStore(subscribePointerLock, isPointerLocked, () => false);

  const showReticle = canControl && locked;
  const showPrompt = canControl && focus !== null;

  return (
    <>
      <span
        aria-hidden
        className={`absolute top-1/2 left-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-50 transition-all duration-300 ${
          showReticle ? "opacity-70" : "opacity-0"
        } ${showPrompt ? "size-1.5" : "size-1"}`}
      />
      <div
        role="status"
        aria-live="polite"
        className={`absolute top-[calc(50%+2.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap text-stone-100 transition-opacity duration-300 ${shadow} ${
          showPrompt ? "opacity-100" : "opacity-0"
        }`}
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
