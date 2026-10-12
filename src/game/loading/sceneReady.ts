// A cena 3D está pronta para ser mostrada? Publicado pela cena (quando o
// código dela chegou, o mundo foi gerado e os shaders compilaram) para a tela
// de carregamento, que mora fora do Canvas. Fica aqui, e não no estado do
// jogo, porque `startGame()` zera aquele estado — e isto só acontece uma vez.

let ready = false;
const listeners = new Set<() => void>();

export const isSceneReady = (): boolean => ready;

export function markSceneReady(): void {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

export function subscribeSceneReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
