import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, ShaderMaterial } from "three";
import { atmosphere } from "@/game/config/render";
import { motesFragmentShader, motesVertexShader } from "../shaders/motes";
import { createMotesGeometry } from "./geometry";

interface MotesProps {
  count: number;
  radius?: number;
  height?: number;
  centerX?: number;
  centerZ?: number;
  seed?: number;
}

/** Partículas de luz suspensas no ar: a sensação de outro mundo. */
export function Motes({ count, radius = 32, height = 7, centerX = 0, centerZ = 0, seed = 11 }: MotesProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(
    () => createMotesGeometry({ count, radius, height, centerX, centerZ, seed }),
    [count, radius, height, centerX, centerZ, seed],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: height },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color(atmosphere.moteColor) },
    }),
    [height],
  );

  useFrame(({ clock, viewport }) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false} matrixAutoUpdate={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={motesVertexShader}
        fragmentShader={motesFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
