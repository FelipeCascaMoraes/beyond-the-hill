import { useEffect, useRef } from "react";

/**
 * Escuta teclas (por `event.code`) enquanto `active`. Ignora a repetição ao
 * segurar a tecla. O handler pode mudar a cada render sem re-registrar.
 */
export function useKeyPress(active: boolean, codes: ReadonlySet<string>, handler: (code: string) => void): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!codes.has(event.code) || event.repeat) return;
      event.preventDefault();
      handlerRef.current(event.code);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, codes]);
}

/** Teclas que avançam diálogos e fecham memórias (o mouse fica solto nessas telas). */
export const ADVANCE_KEYS: ReadonlySet<string> = new Set(["KeyE", "Space", "Enter"]);
