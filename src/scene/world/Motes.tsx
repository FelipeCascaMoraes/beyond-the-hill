import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, ShaderMaterial } from "three";
import { playerConfig } from "@/game/config/player";
import { atmosphere } from "@/game/config/render";
import { motesFragmentShader, motesVertexShader } from "../shaders/motes";
import { createMotesGeometry } from "./geometry";

interface MotesProps {
  count: number;
  /** Meia-largura do volume que acompanha a câmera (m). */
  range?: number;
  height?: number;
  seed?: number;
}

/** Partículas de luz suspensas no ar ao redor da Aysha: a sensação de outro mundo. */
export function Motes({ count, range = 30, height = 7, seed = 11 }: MotesProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => createMotesGeometry({ count, range, height, seed }), [count, range, height, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: height },
      uRange: { value: range },
      uEyeHeight: { value: playerConfig.eyeHeight },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color(atmosphere.moteColor) },
    }),
    [height, range],
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
