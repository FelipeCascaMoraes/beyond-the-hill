import { npcs, type NpcId, type ZoneId } from "@/content";
import { Npc } from "./Npc";

const npcIds = Object.keys(npcs) as NpcId[];

/** Monta todos os NPCs definidos para a zona em `content/npcs.ts`. */
export function ZoneNpcs({ zone }: { zone: ZoneId }) {
  return npcIds.filter((id) => npcs[id].zone === zone).map((id) => <Npc key={id} id={id} />);
}
