import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { areaTriggers } from "@/content";
import { selectIsFree, useGameStore } from "@/game/state/gameStore";
import { areaTriggerAt } from "@/game/story/areaTriggers";

/** Verificar 4 vezes por segundo basta: ninguém anda 1 m em 0,25 s. */
const CHECK_INTERVAL = 0.25;

/** Toca o diálogo de um lugar na primeira vez que a Aysha entra nele (`content/areas.ts`). */
export function AreaTriggers() {
  const sinceCheck = useRef(0);

  useFrame(({ camera }, delta) => {
    sinceCheck.current += delta;
    if (sinceCheck.current < CHECK_INTERVAL) return;
    sinceCheck.current = 0;

    const state = useGameStore.getState();
    if (!selectIsFree(state)) return;
    const id = areaTriggerAt(areaTriggers, state.zone, camera.position.x, camera.position.z, state);
    if (id) state.startDialogue(areaTriggers[id].dialogue);
  });

  return null;
}
