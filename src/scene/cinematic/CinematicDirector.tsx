import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4, Quaternion, Vector3 } from "three";
import { cinematics, type Cinematic, type CinematicStep, type GroundPoint } from "@/content";
import { stepApplies, stepDuration } from "@/game/cinematic/cinematicLogic";
import { playerConfig } from "@/game/config/player";
import { requestPlacement } from "@/game/player/placement";
import { lookAngles } from "@/game/player/playerController";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { prefersReducedMotion } from "@/lib/motion";

type GameStoreState = ReturnType<typeof useGameStore.getState>;

/** Quanto a câmera leva para voltar ao jogador no fim da cena (s). */
const BLEND_OUT = 1.6;
/** Com "menos movimento" ligado, as viagens da câmera ficam curtas. */
const REDUCED_MOVE = 0.35;

const UP = new Vector3(0, 1, 0);
const matrix = new Matrix4();
const target = new Vector3();

/** Orientação de quem está em `position` olhando para `lookAt`. */
function facing(position: Vector3, lookAt: Vector3, into: Quaternion): Quaternion {
  matrix.lookAt(position, lookAt, UP);
  return into.setFromRotationMatrix(matrix);
}

function toWorld([x, y, z]: GroundPoint, into: Vector3): Vector3 {
  return into.set(x, terrainHeight(x, z) + y, z);
}

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

interface Pose {
  position: Vector3;
  rotation: Quaternion;
}

const pose = (): Pose => ({ position: new Vector3(), rotation: new Quaternion() });

/** A câmera da cena: onde está, para onde vai, e o quanto ela manda na tela. */
interface Rig {
  /** A cena tem a câmera (mesmo que já esteja devolvendo). */
  engaged: boolean;
  /** 1 = a cena manda sozinha; 0 = o jogador. */
  weight: number;
  from: Pose;
  to: Pose;
  now: Pose;
  /** Progresso da viagem atual (0–1) e quanto ela dura (s). */
  t: number;
  move: number;
}

/**
 * Executa a cena em andamento (`content/cinematics.ts`), um passo por vez, e
 * dirige a câmera. Roda depois do PlayerController e antes da câmera das
 * lembranças: escreve por cima da pose do jogador, e o desvio da lembrança
 * soma-se por cima do enquadramento.
 *
 * A cena começa de onde a Aysha está olhando — nada salta no primeiro quadro.
 * Termina de um de dois jeitos: devolvendo o controle onde o último
 * enquadramento estava (a Aysha é posta ali, e a volta não tem emenda), ou no
 * fim do jogo, quando a câmera simplesmente fica.
 *
 * A posição viaja em linha reta e a orientação gira pelo caminho mais curto —
 * e não pelo ponto de mira, que numa meia-volta passaria por dentro da câmera.
 */
export function CinematicDirector() {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const rig = useRef<Rig>({ engaged: false, weight: 0, from: pose(), to: pose(), now: pose(), t: 1, move: 1 });
  /** Passo em execução e há quanto tempo. */
  const running = useRef<{ key: string; elapsed: number } | null>(null);

  useFrame(({ camera }, delta) => {
    const r = rig.current;
    const state = useGameStore.getState();
    const active = state.activeCinematic;

    if (active) {
      // Primeiro quadro da cena: ela assume a câmera exatamente onde estava.
      if (!r.engaged) {
        r.engaged = true;
        r.weight = 1;
        r.now.position.copy(camera.position);
        r.now.rotation.copy(camera.quaternion);
        r.to.position.copy(r.now.position);
        r.to.rotation.copy(r.now.rotation);
        r.t = 1;
      }

      const cinematic: Cinematic = cinematics[active.id];
      const step = cinematic.steps[active.step];
      const key = `${active.id}:${active.step}`;
      let done: boolean;
      if (running.current?.key !== key) {
        running.current = { key, elapsed: 0 };
        // Um ramo que não é o desta história passa direto, sem fazer nada.
        const applies = stepApplies(step, state);
        if (applies) enterStep(step, r, reduced);
        done = !applies || stepDone(step, 0, useGameStore.getState(), reduced);
      } else {
        running.current.elapsed += delta;
        done = stepDone(step, running.current.elapsed, useGameStore.getState(), reduced);
      }

      if (done) {
        if (active.step === cinematic.steps.length - 1) release(cinematic);
        running.current = null;
        state.advanceCinematic();
      }
    } else if (r.engaged) {
      // A cena acabou: devolve a câmera ao jogador, sem pressa.
      r.weight = Math.max(0, r.weight - delta / (reduced ? 0.3 : BLEND_OUT));
      if (r.weight === 0) {
        r.engaged = false;
        return;
      }
    } else {
      return;
    }

    // Viagem entre enquadramentos.
    r.t = Math.min(1, r.t + delta / r.move);
    const eased = smootherstep(r.t);
    r.now.position.lerpVectors(r.from.position, r.to.position, eased);
    r.now.rotation.slerpQuaternions(r.from.rotation, r.to.rotation, eased);

    const weight = smootherstep(r.weight);
    if (weight >= 1) {
      camera.position.copy(r.now.position);
      camera.quaternion.copy(r.now.rotation);
    } else {
      camera.position.lerp(r.now.position, weight);
      camera.quaternion.slerp(r.now.rotation, weight);
    }
  });

  return null;
}

/** O que cada passo faz ao começar. */
function enterStep(step: CinematicStep, r: Rig, reduced: boolean): void {
  const state = useGameStore.getState();
  switch (step.type) {
    case "shot":
      // Parte de onde a câmera está agora, mesmo no meio de outra viagem.
      r.from.position.copy(r.now.position);
      r.from.rotation.copy(r.now.rotation);
      toWorld(step.shot.position, r.to.position);
      facing(r.to.position, toWorld(step.shot.target, target), r.to.rotation);
      r.move = step.move * (reduced ? REDUCED_MOVE : 1);
      r.t = 0;
      return;
    case "flags":
      state.addFlags(step.flags);
      return;
    case "dialogue":
      state.startDialogue(step.dialogue);
      return;
    case "memory":
      state.activateMemory(step.memory);
      return;
    case "choice":
      state.openChoice(step.choice);
      return;
    case "finale":
      state.finishGame();
      return;
    case "pause":
    case "title":
      return;
  }
}

/**
 * O passo terminou? O tempo decide — ou o diálogo, a lembrança e a escolha
 * que ele abriu. O fim do jogo não termina.
 */
function stepDone(step: CinematicStep, elapsed: number, state: GameStoreState, reduced: boolean): boolean {
  if (step.type === "dialogue") return state.activeDialogue === null;
  if (step.type === "memory") return state.activeMemory === null;
  if (step.type === "choice") return state.activeChoice === null;
  if (step.type === "finale") return false;
  const seconds = stepDuration(step) ?? 0;
  // Com menos movimento, só as viagens encurtam; o tempo de ler continua o mesmo.
  return elapsed >= (step.type === "shot" && reduced ? seconds * REDUCED_MOVE : seconds);
}

/** Deixa a Aysha onde o último enquadramento estava, olhando para o mesmo lugar. */
function release(cinematic: Cinematic): void {
  if (!cinematic.release) return;
  const [x, z] = cinematic.release.position;
  const eyeY = terrainHeight(x, z) + playerConfig.eyeHeight;
  const [lookX, lookUp, lookZ] = cinematic.release.lookAt;
  requestPlacement({ x, z, eyeY, ...lookAngles(x, eyeY, z, lookX, terrainHeight(lookX, lookZ) + lookUp, lookZ) });
}
