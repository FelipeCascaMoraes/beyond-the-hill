import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { areaTriggers, cinematics, type Cinematic, type CinematicId } from "@/content";
import { cinematicAt } from "@/game/cinematic/cinematicLogic";
import { selectIsFree, useGameStore } from "@/game/state/gameStore";
import { ayshaPosition } from "@/game/player/playerView";
import { areaTriggerAt } from "@/game/story/areaTriggers";

/** Verificar 4 vezes por segundo basta: ninguém anda 1 m em 0,25 s. */
const CHECK_INTERVAL = 0.25;

/**
 * Toca o diálogo de um lugar na primeira vez que a Aysha entra nele
 * (`content/areas.ts`) — ou, se o lugar guarda uma cena, começa a cena
 * (`content/cinematics.ts`). A cena vem antes: é o momento maior.
 *
 * Uma cena com `delay` espera a Aysha ficar esse tempo no lugar, livre. Se
 * ela sair, abrir uma conversa ou uma lembrança, a contagem recomeça — o
 * momento chega quando houver silêncio para ele.
 */
export function AreaTriggers() {
  const sinceCheck = useRef(0);
  /** Cena esperando a vez, e há quanto tempo. */
  const waiting = useRef<{ id: CinematicId; elapsed: number } | null>(null);

  useFrame(({ camera }, delta) => {
    sinceCheck.current += delta;
    if (sinceCheck.current < CHECK_INTERVAL) return;
    const elapsed = sinceCheck.current;
    sinceCheck.current = 0;

    const state = useGameStore.getState();
    if (!selectIsFree(state)) {
      waiting.current = null;
      return;
    }
    // O lugar é onde a Aysha pisa, não onde a câmera está.
    const { x, z } = ayshaPosition(camera.position);
    const id = cinematicAt(cinematics, state.zone, x, z, state);
    if (id) {
      const cinematic: Cinematic = cinematics[id];
      const time = waiting.current?.id === id ? waiting.current.elapsed + elapsed : 0;
      if (time >= (cinematic.trigger.delay ?? 0)) {
        waiting.current = null;
        state.startCinematic(id);
      } else {
        waiting.current = { id, elapsed: time };
      }
      return;
    }
    waiting.current = null;

    const trigger = areaTriggerAt(areaTriggers, state.zone, x, z, state);
    if (trigger) state.startDialogue(areaTriggers[trigger].dialogue);
  });

  return null;
}
