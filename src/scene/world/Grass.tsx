import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3 } from "three";
import { atmosphere } from "@/game/config/render";
import { grassFragmentShader, grassVertexShader } from "../shaders/grass";
import { createGrassGeometry } from "./geometry";

interface GrassProps {
  count: number;
  radius: number;
  centerX?: number;
  centerZ?: number;
  seed?: number;
}

/** Campo de grama: todas as folhas em um único draw call. */
export function Grass({ count, radius, centerX = 0, centerZ = 0, seed = 7 }: GrassProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(
    () => createGrassGeometry({ count, radius, centerX, centerZ, seed }),
    [count, radius, centerX, centerZ, seed],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () =>
      UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uWindDirection: { value: new Vector2(0.8, 0.6).normalize() },
          uBaseColor: { value: new Color(atmosphere.grassBaseColor) },
          uTipColor: { value: new Color(atmosphere.grassTipColor) },
          uSunColor: { value: new Color(atmosphere.sunColor) },
          uSunDirection: { value: new Vector3(...atmosphere.sunDirection).normalize() },
        },
      ]),
    [],
  );

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    // A geometria instanciada não tem bounding sphere útil: o campo está sempre à vista.
    <mesh geometry={geometry} frustumCulled={false} matrixAutoUpdate={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={grassVertexShader}
        fragmentShader={grassFragmentShader}
        uniforms={uniforms}
        side={DoubleSide}
        fog
      />
    </mesh>
  );
}
