import { Atmosphere } from "./Atmosphere";
import { Lighting } from "./Lighting";
import { LoneTree } from "./LoneTree";
import { Terrain } from "./Terrain";

/** Elementos presentes em todas as zonas: ar, luz, terreno, a colina e sua árvore. */
export function World() {
  return (
    <>
      <Atmosphere />
      <Lighting />
      <Terrain />
      <LoneTree />
    </>
  );
}
