import type { ZoneId } from "../../content/zones.ts";
import { HOUSE, isInsideHouse } from "../world/house.ts";
import { LABYRINTH, isInsideLabyrinth, labyrinthKeepOut } from "../world/labyrinth.ts";
import type { KeepOut } from "./machineLogic.ts";

// O que o mundo oferece contra as máquinas — o abrigo de que o Victor fala:
// a casa abandonada e o miolo do labirinto. Lá dentro elas não enxergam, e
// não entram (são largas demais para as passagens).

/** Raio em volta da casa por onde a máquina passa sem entrar (m). */
const HOUSE_KEEP_OUT = 5;

/** A Aysha está escondida de uma máquina neste ponto? */
export function isSheltered(zone: ZoneId, x: number, z: number): boolean {
  if (HOUSE.zone === zone && isInsideHouse(x, z)) return true;
  return LABYRINTH.zone === zone && isInsideLabyrinth(x, z);
}

/** Onde as máquinas da zona não entram. */
export function machineKeepOut(zone: ZoneId): readonly KeepOut[] {
  return [
    ...(HOUSE.zone === zone ? [{ x: HOUSE.x, z: HOUSE.z, radius: HOUSE_KEEP_OUT }] : []),
    ...(LABYRINTH.zone === zone ? labyrinthKeepOut() : []),
  ];
}
