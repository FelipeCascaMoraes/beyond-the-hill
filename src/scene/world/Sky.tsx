import { useMemo } from "react";
import { BackSide, Color, Vector3 } from "three";
import { atmosphere } from "@/game/config/render";
import { skyFragmentShader, skyVertexShader } from "../shaders/sky";

export function Sky() {
  const uniforms = useMemo(
    () => ({
      uZenithColor: { value: new Color(atmosphere.zenithColor) },
      uHorizonColor: { value: new Color(atmosphere.horizonColor) },
      uSunColor: { value: new Color(atmosphere.sunColor) },
      uSunDirection: { value: new Vector3(...atmosphere.sunDirection).normalize() },
    }),
    [],
  );

  return (
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
  );
}
