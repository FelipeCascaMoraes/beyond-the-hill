import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial, Sphere, UniformsLib, UniformsUtils, Vector2, Vector3 } from "three";
import { terrainHeight } from "@/game/world/terrain";
import { atmosphere } from "@/game/config/render";
import { grassFragmentShader, grassVertexShader } from "../shaders/grass";
import { createGrassGeometry, type GrassClearing } from "./geometry";

interface GrassProps {
  count: number;
  radius: number;
  centerX?: number;
  centerZ?: number;
  seed?: number;
  /** Deve ser uma referência estável (a geometria é refeita se mudar). */
  clearings?: readonly GrassClearing[];
  /**
   * Descarta a mancha quando ela sai do campo de visão. Um campo só, centrado
   * no jogador, está sempre à vista e não vale o teste; já a encosta é uma
   * fileira de nove manchas ao longo de meio quilômetro, e quase todas estão
   * atrás da Aysha a cada instante.
   */
  cull?: boolean;
}

const NO_CLEARINGS: readonly GrassClearing[] = [];

/** Folga vertical do volume de uma mancha (m): o relevo dentro dela e a folha. */
const GRASS_VERTICAL_SLACK = 25;

/** Campo de grama: todas as folhas em um único draw call. */
export function Grass({ count, radius, centerX = 0, centerZ = 0, seed = 7, clearings = NO_CLEARINGS, cull = false }: GrassProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const created = createGrassGeometry({ count, radius, centerX, centerZ, seed, clearings });
    // A geometria é instanciada: as folhas vivem nos atributos por instância e
    // o three não tem como deduzir o volume. Para poder descartar a mancha é
    // preciso dizer onde ela está — com folga para a altura da grama.
    if (cull) {
      created.boundingSphere = new Sphere(
        new Vector3(centerX, terrainHeight(centerX, centerZ), centerZ),
        radius + GRASS_VERTICAL_SLACK,
      );
    }
    return created;
  }, [count, radius, centerX, centerZ, seed, clearings, cull]);
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
    <mesh geometry={geometry} frustumCulled={cull} matrixAutoUpdate={false}>
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
