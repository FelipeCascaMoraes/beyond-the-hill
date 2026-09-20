import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, Vector3, type FogExp2 } from "three";
import { atmosphere, worldMoods } from "@/game/config/render";
import { skyFragmentShader, skyVertexShader } from "../shaders/sky";
import { airBlend, resolveAir } from "./mood";

/** O ar muda muito mais devagar que a luz: ninguém deve ver acontecer (1/s). */
const AIR_SPEED = 0.3;

/**
 * O ar do mundo: o céu em gradiente e a neblina. Os dois moram juntos porque a
 * cor do horizonte e a da neblina precisam ser exatamente a mesma — é nela que
 * o fundo se funde, e qualquer diferença vira uma linha no horizonte.
 *
 * O ar clareia duas vezes ao longo do jogo: quando a mentira cai (a colina
 * fica visivelmente mais perto: era a neblina que a afastava) e ao longo da
 * subida, até o cume, onde a neblina fica lá embaixo com o resto do Além.
 */
export function Atmosphere() {
  const fogRef = useRef<FogExp2>(null);
  const target = useMemo(() => ({ density: atmosphere.fogDensity, horizon: new Color(), zenith: new Color() }), []);
  const uniforms = useMemo(
    () => ({
      uZenithColor: { value: new Color(worldMoods.idle.zenithColor) },
      uHorizonColor: { value: new Color(worldMoods.idle.horizonColor) },
      uSunColor: { value: new Color(atmosphere.sunColor) },
      uSunDirection: { value: new Vector3(...atmosphere.sunDirection).normalize() },
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    const fog = fogRef.current;
    if (!fog) return;

    resolveAir(airBlend(camera.position.y), target);
    const step = 1 - Math.exp(-delta * AIR_SPEED);

    const horizon = uniforms.uHorizonColor.value;
    horizon.lerp(target.horizon, step);
    uniforms.uZenithColor.value.lerp(target.zenith, step);
    // A neblina copia o horizonte em vez de perseguir o mesmo alvo: assim as
    // duas cores são a mesma no mesmo quadro, e não só no fim da transição.
    fog.color.copy(horizon);
    fog.density += (target.density - fog.density) * step;
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={[worldMoods.idle.horizonColor, worldMoods.idle.fogDensity]} />
      <mesh matrixAutoUpdate={false}>
        <sphereGeometry args={[atmosphere.skyRadius, 32, 16]} />
        <shaderMaterial
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
          uniforms={uniforms}
          side={BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
