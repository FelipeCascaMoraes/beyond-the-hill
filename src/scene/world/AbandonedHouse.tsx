import { useEffect, useMemo } from "react";
import { AdditiveBlending, Color, DoubleSide, Quaternion, Vector3 } from "three";
import { atmosphere } from "@/game/config/render";
import { HOUSE, HOUSE_WINDOW } from "@/game/world/house";
import { housePadHeight } from "@/game/world/terrain";
import { lightBeamFragmentShader, lightBeamVertexShader } from "../shaders/lightBeam";
import { createHouseGeometry } from "./houseGeometry";

const BEAM_LENGTH = 5.5;

/**
 * A casa abandonada: uma única geometria + o feixe de sol que entra pela
 * janela virada para a colina (o sol está logo atrás dela).
 */
export function AbandonedHouse() {
  const geometry = useMemo(() => createHouseGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const y = housePadHeight();

  // O feixe segue a direção da luz: do sol, através da janela, para dentro da casa.
  const beam = useMemo(() => {
    const direction = new Vector3(...atmosphere.sunDirection).normalize().negate();
    const windowCenter = new Vector3(
      HOUSE.x + HOUSE_WINDOW.x,
      y + (HOUSE_WINDOW.sill + HOUSE_WINDOW.top) / 2,
      HOUSE.z - HOUSE.depth / 2,
    );
    const size = new Vector3(HOUSE_WINDOW.width * 0.95, (HOUSE_WINDOW.top - HOUSE_WINDOW.sill) * 0.95, BEAM_LENGTH);
    return {
      position: windowCenter.addScaledVector(direction, BEAM_LENGTH / 2),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direction),
      size,
      uniforms: {
        uSize: { value: size },
        uColor: { value: new Color(atmosphere.sunColor) },
        uIntensity: { value: 0.22 },
      },
    };
  }, [y]);

  return (
    <>
      <mesh geometry={geometry} position={[HOUSE.x, y, HOUSE.z]}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      {/* Luz quente e fraca vinda da janela: o interior fica penumbroso, não preto. */}
      <pointLight
        position={[HOUSE.x + HOUSE_WINDOW.x, y + 1.9, HOUSE.z - HOUSE.depth / 2 + 0.8]}
        color={atmosphere.sunColor}
        intensity={5}
        distance={7}
        decay={2}
      />
      <mesh position={beam.position} quaternion={beam.quaternion}>
        <boxGeometry args={[beam.size.x, beam.size.y, beam.size.z]} />
        <shaderMaterial
          vertexShader={lightBeamVertexShader}
          fragmentShader={lightBeamFragmentShader}
          uniforms={beam.uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
