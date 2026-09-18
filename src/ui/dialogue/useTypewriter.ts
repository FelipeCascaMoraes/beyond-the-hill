import { useCallback, useEffect, useState } from "react";

// Revela o texto letra a letra, com pausas naturais na pontuação.

const BASE_DELAY = 26;
const LONG_PAUSE = /[.!?…]/;
const SHORT_PAUSE = /[,;:—]/;

/** Espera antes de mostrar a próxima letra, conforme a letra que acabou de aparecer. */
function delayAfter(character: string | undefined): number {
  if (character === undefined) return 0;
  if (LONG_PAUSE.test(character)) return 320;
  if (SHORT_PAUSE.test(character)) return 140;
  return BASE_DELAY;
}

/**
 * `instant` mostra tudo de uma vez (menos movimento). O componente que usa
 * este hook deve ser recriado (via `key`) a cada novo texto.
 */
export function useTypewriter(text: string, instant: boolean) {
  const [count, setCount] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (count >= text.length) return;
    const timer = setTimeout(() => setCount((current) => current + 1), delayAfter(text[count - 1]));
    return () => clearTimeout(timer);
  }, [count, text]);

  const finish = useCallback(() => setCount(text.length), [text.length]);

  return {
    visible: text.slice(0, count),
    hidden: text.slice(count),
    done: count >= text.length,
    finish,
  };
}

/** Tempo de leitura para diálogos que avançam sozinhos (ms). */
export function readingTime(text: string): number {
  return Math.min(6000, 1400 + text.length * 45);
}
