import { atmosphere } from "@/game/config/render";

const [sx, sy, sz] = atmosphere.sunDirection;

/** Contraluz: o sol está atrás da colina; o céu preenche as sombras. Sem shadow maps. */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={["#d3d4d0", "#4a4430", 1.9]} />
      <directionalLight position={[sx * 200, sy * 200, sz * 200]} intensity={1.8} color={atmosphere.sunColor} />
    </>
  );
}
