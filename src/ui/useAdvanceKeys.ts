import { useEffect, useRef } from "react";

/** Teclas que avançam diálogos e fecham memórias (o mouse fica solto nessas telas). */
const ADVANCE_KEYS = new Set(["KeyE", "Space", "Enter"]);

/** Chama `onAdvance` quando o jogador aperta E, Espaço ou Enter (sem repetição ao segurar). */
export function useAdvanceKeys(active: boolean, onAdvance: () => void): void {
  const callbackRef = useRef(onAdvance);
  useEffect(() => {
    callbackRef.current = onAdvance;
  });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!ADVANCE_KEYS.has(event.code) || event.repeat) return;
      event.preventDefault();
      callbackRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
}
