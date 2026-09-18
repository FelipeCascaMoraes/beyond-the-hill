import { atmosphere } from "@/game/config/render";
import { Lighting } from "./Lighting";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";

/** Elementos presentes em todas as zonas: céu, luz, neblina, terreno e a colina. */
export function World() {
  return (
    <>
      <fogExp2 attach="fog" args={[atmosphere.horizonColor, atmosphere.fogDensity]} />
      <Lighting />
      <Sky />
      <Terrain />
    </>
  );
}
