// O quanto da subida já foi vencido (0 a 1), publicado pela cena para quem
// está fora dela: a interface e o som. Fica aqui, e não no estado do jogo,
// porque muda com a posição da câmera — passar isso pelo store faria a árvore
// inteira renderizar a cada quadro.
//
// Os avisos saem em degraus, não por quadro: só quando o valor mexe o
// suficiente para alguém notar.

/** Mudança mínima para avisar quem escuta. */
const STEP = 0.02;

let ascent = 0;
const listeners = new Set<() => void>();

export const getAscent = (): number => ascent;

export function publishAscent(value: number): void {
  if (value !== 0 && Math.abs(value - ascent) < STEP) return;
  if (value === ascent) return;
  ascent = value;
  for (const listener of listeners) listener();
}

export function subscribeAscent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
