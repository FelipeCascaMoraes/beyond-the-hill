"use client";

import { useSyncExternalStore } from "react";
import { isPointerLocked, subscribePointerLock } from "@/game/input/input";
import { toggleCameraMode } from "@/game/player/cameraMode";
import { selectCanControl, selectIsFree, useGameStore } from "@/game/state/gameStore";
import { useKeyPress } from "./useKeyPress";
import { useAscent } from "./useAscent";

/**
 * Dica discreta de controles; some enquanto o mouse está travado na cena ou há
 * diálogo/memória aberta — e não volta mais depois que a subida começa: a
 * essa altura o jogador já sabe andar, e ali a tela é para a colina.
 */
/** Troca entre ver pelos olhos da Aysha e por cima do ombro dela. */
const CAMERA_KEYS: ReadonlySet<string> = new Set(["KeyC"]);

export function ControlsHint() {
  const isFree = useGameStore(selectIsFree);
  // A tecla vale sempre que se pode andar, com a dica na tela ou não.
  const canControl = useGameStore(selectCanControl);
  useKeyPress(canControl, CAMERA_KEYS, toggleCameraMode);
  const locked = useSyncExternalStore(subscribePointerLock, isPointerLocked, () => false);
  const climbing = useAscent() > 0;
  const visible = isFree && !locked && !climbing;

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
        W A S D caminhar · Shift correr · E interagir · C trocar câmera · Esc soltar o mouse
      </p>
    </div>
  );
}
