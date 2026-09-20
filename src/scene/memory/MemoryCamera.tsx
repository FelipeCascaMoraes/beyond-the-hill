import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, type Camera } from "three";
import type { MemoryTone } from "@/content";
import { renderConfig } from "@/game/config/render";
import { selectActiveMemoryTone, useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Desvio somado à pose do jogador enquanto uma lembrança acontece. */
interface Drift {
  /** Campo de visão (graus) somado ao normal: negativo aproxima. */
  fov: number;
  /** Altura dos olhos (m). */
  rise: number;
  /** Inclinação da cabeça (rad). */
  roll: number;
  /** Baque no instante em que este clima entra (0–1). */
  shake: number;
  /** Com que rapidez a câmera chega a este estado (1/s). */
  speed: number;
}

const drifts: Record<MemoryTone, Drift> = {
  // A lembrança boa puxa a Aysha para dentro dela: aproxima devagar, a cabeça pende.
  warm: { fov: -5, rise: 0.1, roll: -0.012, shake: 0.12, speed: 0.5 },
  // A ruim abre o quadro de repente, afunda o olhar e desequilibra.
  cold: { fov: 7, rise: -0.2, roll: 0.035, shake: 1, speed: 2.4 },
};

/** Fora de uma lembrança a câmera volta, sem pressa, à pose do jogador. */
const rest: Drift = { fov: 0, rise: 0, roll: 0, shake: 0, speed: 1.2 };

/** Quanto o baque dura (1/s) e o tamanho do tremor que ele provoca. */
const SHAKE_DECAY = 2.6;
const SHAKE_ROLL = 0.018;
const SHAKE_RISE = 0.035;

/**
 * A câmera durante as lembranças. Roda depois do PlayerController: soma o
 * desvio do clima por cima da pose já escrita no frame, e volta a zero quando
 * a lembrança acaba. Com "menos movimento" ligado, não faz nada.
 */
export function MemoryCamera() {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const drift = useRef({ fov: 0, rise: 0, roll: 0 });
  const shake = useRef(0);
  const previousTone = useRef<MemoryTone | null>(null);
  const settled = useRef(true);

  useFrame(({ camera, clock }, delta) => {
    if (reduced) return;
    const tone = selectActiveMemoryTone(useGameStore.getState());
    // A virada de clima (e a entrada na lembrança) dá o baque.
    if (tone !== previousTone.current) {
      previousTone.current = tone;
      if (tone) shake.current = drifts[tone].shake;
    }

    const target = tone ? drifts[tone] : rest;
    const current = drift.current;
    const step = 1 - Math.exp(-delta * target.speed);
    current.fov += (target.fov - current.fov) * step;
    current.rise += (target.rise - current.rise) * step;
    current.roll += (target.roll - current.roll) * step;
    shake.current *= Math.exp(-delta * SHAKE_DECAY);

    // Parada: devolve a câmera exatamente como estava e sai do caminho.
    const atRest =
      !tone && Math.abs(current.fov) < 0.02 && Math.abs(current.rise) < 0.002 && Math.abs(current.roll) < 0.0005 && shake.current < 0.002;
    if (atRest) {
      if (settled.current) return;
      current.fov = 0;
      current.rise = 0;
      current.roll = 0;
      shake.current = 0;
      setFov(camera, 0);
      settled.current = true;
      return;
    }
    settled.current = false;

    const time = clock.elapsedTime;
    camera.position.y += current.rise + Math.sin(time * 15.5) * SHAKE_RISE * shake.current;
    camera.rotation.z = current.roll + Math.sin(time * 21) * SHAKE_ROLL * shake.current;
    setFov(camera, current.fov);
  });

  return null;
}

/** Aplica o desvio de campo de visão sobre o valor normal da cena. */
function setFov(camera: Camera, offset: number): void {
  if (!(camera instanceof PerspectiveCamera)) return;
  const fov = renderConfig.camera.fov + offset;
  if (camera.fov === fov) return;
  camera.fov = fov;
  camera.updateProjectionMatrix();
}
