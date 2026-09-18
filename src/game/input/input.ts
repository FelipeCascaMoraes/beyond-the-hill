// Entrada de teclado e mouse, fora da árvore React.
// Teclas por `event.code` (posição física): WASD funciona em qualquer layout.
// O olhar usa Pointer Lock: o cursor some e o mouse gira a câmera livremente.

const FORWARD = ["KeyW", "ArrowUp"];
const BACKWARD = ["KeyS", "ArrowDown"];
const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];
const MOVEMENT_KEYS = new Set([...FORWARD, ...BACKWARD, ...LEFT, ...RIGHT]);

/** Alguns navegadores entregam saltos enormes de movimento ao travar o mouse. */
const MAX_MOUSE_DELTA = 150;

const pressed = new Set<string>();
const lockListeners = new Set<() => void>();
let lookDeltaX = 0;
let lookDeltaY = 0;
let lockTarget: HTMLElement | null = null;

const clampDelta = (value: number) => Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, value));
const axis = (keys: string[]) => (keys.some((key) => pressed.has(key)) ? 1 : 0);

function onKeyDown(event: KeyboardEvent) {
  if (!MOVEMENT_KEYS.has(event.code)) return;
  pressed.add(event.code);
  event.preventDefault();
}

function onKeyUp(event: KeyboardEvent) {
  pressed.delete(event.code);
}

/** Ao perder o foco a janela não recebe keyup: evita tecla "presa". */
function releaseAllKeys() {
  pressed.clear();
}

function onMouseMove(event: MouseEvent) {
  if (!isPointerLocked()) return;
  lookDeltaX += clampDelta(event.movementX);
  lookDeltaY += clampDelta(event.movementY);
}

function onPointerLockChange() {
  lookDeltaX = 0;
  lookDeltaY = 0;
  lockListeners.forEach((listener) => listener());
}

function requestLook() {
  if (!lockTarget || isPointerLocked()) return;
  // Pode falhar (ex.: clique logo após sair com Esc); o próximo clique tenta de novo.
  Promise.resolve(lockTarget.requestPointerLock()).catch(() => undefined);
}

/** Liga a entrada ao elemento do canvas. Retorna a função que desliga tudo. */
export function attachInput(element: HTMLElement): () => void {
  lockTarget = element;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseAllKeys);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  element.addEventListener("click", requestLook);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", releaseAllKeys);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    element.removeEventListener("click", requestLook);
    if (isPointerLocked()) document.exitPointerLock();
    releaseAllKeys();
    lookDeltaX = 0;
    lookDeltaY = 0;
    lockTarget = null;
    lockListeners.forEach((listener) => listener());
  };
}

export function readMovement(): { forward: number; strafe: number } {
  return {
    forward: axis(FORWARD) - axis(BACKWARD),
    strafe: axis(RIGHT) - axis(LEFT),
  };
}

/** Retorna o movimento do mouse acumulado desde a última leitura e zera o acumulador. */
export function consumeLook(): { x: number; y: number } {
  const delta = { x: lookDeltaX, y: lookDeltaY };
  lookDeltaX = 0;
  lookDeltaY = 0;
  return delta;
}

export function isPointerLocked(): boolean {
  return lockTarget !== null && document.pointerLockElement === lockTarget;
}

export function subscribePointerLock(listener: () => void): () => void {
  lockListeners.add(listener);
  return () => {
    lockListeners.delete(listener);
  };
}
