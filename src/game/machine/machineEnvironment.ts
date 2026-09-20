import type { ZoneId } from "../../content/zones.ts";
import { HOUSE, isInsideHouse } from "../world/house.ts";
import type { KeepOut } from "./machineLogic.ts";

// O que o mundo oferece contra as máquinas. Hoje só a casa abandonada, que é
// o abrigo de que o Victor fala: lá dentro elas não veem, e não entram.

/** Raio em volta da casa por onde a máquina passa sem entrar (m). */
const HOUSE_KEEP_OUT = 5;

/** A Aysha está escondida de uma máquina neste ponto? */
export function isSheltered(zone: ZoneId, x: number, z: number): boolean {
  return HOUSE.zone === zone && isInsideHouse(x, z);
}

/** Círculos em que as máquinas da zona não entram. */
export function machineKeepOut(zone: ZoneId): readonly KeepOut[] {
  return HOUSE.zone === zone ? [{ x: HOUSE.x, z: HOUSE.z, radius: HOUSE_KEEP_OUT }] : [];
}
