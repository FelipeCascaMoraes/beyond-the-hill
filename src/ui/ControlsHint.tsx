"use client";

import { useSyncExternalStore } from "react";
import { isPointerLocked, subscribePointerLock } from "@/game/input/input";
import { useGameStore } from "@/game/state/gameStore";

/** Dica discreta de controles; some enquanto o mouse está travado na cena. */
export function ControlsHint() {
  const controlEnabled = useGameStore((state) => state.controlEnabled);
  const locked = useSyncExternalStore(subscribePointerLock, isPointerLocked, () => false);
  const visible = controlEnabled && !locked;

  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-x-0 bottom-[12vh] flex flex-col items-center gap-3 text-center transition-opacity duration-1000 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="font-serif text-xl font-light tracking-[0.08em] text-stone-100/90 italic [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
        Clique para olhar ao redor
      </p>
      <p className="text-[0.7rem] tracking-[0.3em] text-stone-200/70 uppercase [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
        W A S D caminhar · Esc soltar o mouse
      </p>
    </div>
  );
}
