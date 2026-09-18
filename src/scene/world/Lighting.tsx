import { atmosphere } from "@/game/config/render";

const [sx, sy, sz] = atmosphere.sunDirection;

/** Contraluz: o sol está atrás da colina; o céu preenche as sombras. Sem shadow maps. */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={["#c9d0d8", "#3b3624", 1.5]} />
      <directionalLight position={[sx * 200, sy * 200, sz * 200]} intensity={1.8} color={atmosphere.sunColor} />
    </>
  );
}
