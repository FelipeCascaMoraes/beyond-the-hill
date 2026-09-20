import { npcs, type NpcDefinition, type NpcId, type ZoneId } from "@/content";
import { isPresent } from "@/game/story/presence";
import { useGameStore } from "@/game/state/gameStore";
import { Npc } from "./Npc";

const npcIds = Object.keys(npcs) as NpcId[];

/**
 * Um NPC existe no mundo só enquanto a história o mantém lá. Cassandra e
 * Victor somem no instante em que a Aysha entende quem são — e a colisão deles
 * some junto (ver game/player/spawn.ts), ou ela esbarraria em ninguém.
 */
function NpcWhenPresent({ id }: { id: NpcId }) {
  const npc: NpcDefinition = npcs[id];
  const present = useGameStore((state) => isPresent(npc, state));
  return present ? <Npc id={id} /> : null;
}

/** Monta os NPCs definidos para a zona em `content/npcs.ts`. */
export function ZoneNpcs({ zone }: { zone: ZoneId }) {
  return npcIds.filter((id) => npcs[id].zone === zone).map((id) => <NpcWhenPresent key={id} id={id} />);
}
