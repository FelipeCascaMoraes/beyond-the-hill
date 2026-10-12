// De onde a jogadora vê a Aysha: pelos olhos dela ou por cima do ombro. É uma
// preferência de quem joga, não um fato da história — por isso mora aqui, fora
// do estado do jogo (que `startGame()` zera), e fica guardada no navegador.

export type CameraMode = "first" | "third";

const STORAGE_KEY = "bth-camera";

let mode: CameraMode = "first";
let loaded = false;
const listeners = new Set<() => void>();

/** Lê a escolha guardada, uma vez. Navegador sem armazenamento: fica o padrão. */
function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "third") mode = "third";
  } catch {
    // Armazenamento bloqueado: a escolha vale só para esta visita.
  }
}

export function getCameraMode(): CameraMode {
  load();
  return mode;
}

export function setCameraMode(next: CameraMode): void {
  load();
  if (next === mode) return;
  mode = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Idem.
  }
  for (const listener of listeners) listener();
}

export const toggleCameraMode = (): void => setCameraMode(getCameraMode() === "first" ? "third" : "first");

export function subscribeCameraMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
