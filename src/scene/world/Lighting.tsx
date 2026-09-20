import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type DirectionalLight, type HemisphereLight } from "three";
import { atmosphere, memoryMood, type MemoryMoodId } from "@/game/config/render";
import { selectActiveMemoryTone, useGameStore } from "@/game/state/gameStore";

const [sx, sy, sz] = atmosphere.sunDirection;

/** Cores de cada clima, criadas uma vez (o loop só interpola). */
const moodColors = Object.fromEntries(
  Object.entries(memoryMood).map(([id, mood]) => [
    id,
    { sun: new Color(mood.sunColor), sky: new Color(mood.skyColor), ground: new Color(mood.groundColor) },
  ]),
) as Record<MemoryMoodId, { sun: Color; sky: Color; ground: Color }>;

/** Velocidade da mudança de luz (1/s): rápida o bastante para a virada, sem piscar. */
const MOOD_SPEED = 1.8;

/**
 * Contraluz: o sol está atrás da colina; o céu preenche as sombras. Sem shadow maps.
 * Durante uma lembrança a luz segue o clima dela (`memoryMood`), esquentando ou
 * perdendo a cor, e volta ao normal quando a lembrança termina.
 */
export function Lighting() {
  const sunRef = useRef<DirectionalLight>(null);
  const skyRef = useRef<HemisphereLight>(null);

  useFrame((_, delta) => {
    const sun = sunRef.current;
    const sky = skyRef.current;
    if (!sun || !sky) return;

    const id: MemoryMoodId = selectActiveMemoryTone(useGameStore.getState()) ?? "idle";
    const mood = memoryMood[id];
    const colors = moodColors[id];
    const step = 1 - Math.exp(-delta * MOOD_SPEED);

    sun.intensity += (mood.sun - sun.intensity) * step;
    sun.color.lerp(colors.sun, step);
    sky.intensity += (mood.sky - sky.intensity) * step;
    sky.color.lerp(colors.sky, step);
    sky.groundColor.lerp(colors.ground, step);
  });

  return (
    <>
      <hemisphereLight ref={skyRef} args={[memoryMood.idle.skyColor, memoryMood.idle.groundColor, memoryMood.idle.sky]} />
      <directionalLight
        ref={sunRef}
        position={[sx * 200, sy * 200, sz * 200]}
        intensity={memoryMood.idle.sun}
        color={memoryMood.idle.sunColor}
      />
    </>
  );
}
