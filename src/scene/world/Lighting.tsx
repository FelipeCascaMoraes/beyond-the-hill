import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type DirectionalLight, type HemisphereLight } from "three";
import { atmosphere, lightMoods, MOOD_SPEED } from "@/game/config/render";
import { lightBlend, resolveLight } from "./mood";

const [sx, sy, sz] = atmosphere.sunDirection;

/**
 * Contraluz: o sol está atrás da colina; o céu preenche as sombras. Sem shadow maps.
 *
 * A luz segue o clima do momento (ver ./mood): a lembrança em andamento, ou —
 * fora delas — a história e a altura da subida. Ela nunca salta: persegue o
 * alvo a uma velocidade fixa, então uma virada de lembrança leva um segundo e
 * a subida da colina leva a subida inteira.
 */
export function Lighting() {
  const sunRef = useRef<DirectionalLight>(null);
  const skyRef = useRef<HemisphereLight>(null);
  const target = useMemo(
    () => ({ sun: lightMoods.idle.sun, sky: lightMoods.idle.sky, sunColor: new Color(), skyColor: new Color(), groundColor: new Color() }),
    [],
  );

  useFrame(({ camera }, delta) => {
    const sun = sunRef.current;
    const sky = skyRef.current;
    if (!sun || !sky) return;

    resolveLight(lightBlend(camera.position.y), target);
    const step = 1 - Math.exp(-delta * MOOD_SPEED);

    sun.intensity += (target.sun - sun.intensity) * step;
    sun.color.lerp(target.sunColor, step);
    sky.intensity += (target.sky - sky.intensity) * step;
    sky.color.lerp(target.skyColor, step);
    sky.groundColor.lerp(target.groundColor, step);
  });

  return (
    <>
      <hemisphereLight ref={skyRef} args={[lightMoods.idle.skyColor, lightMoods.idle.groundColor, lightMoods.idle.sky]} />
      <directionalLight
        ref={sunRef}
        position={[sx * 200, sy * 200, sz * 200]}
        intensity={lightMoods.idle.sun}
        color={lightMoods.idle.sunColor}
      />
    </>
  );
}
