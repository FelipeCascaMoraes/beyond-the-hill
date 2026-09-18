import { atmosphere } from "@/game/config/render";
import { Lighting } from "./Lighting";
import { LoneTree } from "./LoneTree";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";

/** Elementos presentes em todas as zonas: céu, luz, neblina, terreno, a colina e sua árvore. */
export function World() {
  return (
    <>
      <fogExp2 attach="fog" args={[atmosphere.horizonColor, atmosphere.fogDensity]} />
      <Lighting />
      <Sky />
      <Terrain />
      <LoneTree />
    </>
  );
}
