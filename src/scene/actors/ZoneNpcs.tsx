import { useState } from "react";
import { npcs, type NpcDefinition, type NpcId, type ZoneId } from "@/content";
import { isPresent } from "@/game/story/presence";
import { useGameStore } from "@/game/state/gameStore";
import { Npc } from "./Npc";

const npcIds = Object.keys(npcs) as NpcId[];

/**
 * Um NPC existe no mundo só enquanto a história o mantém lá. Cassandra e
 * Victor somem do campo no instante em que a Aysha entende quem são — e a
 * colisão deles some junto (ver game/player/spawn.ts), ou ela esbarraria em
 * ninguém.
 *
 * Quem chega com a zona já aberta (o pai e a mãe, no meio do reencontro) não
 * surge de uma vez: aparece devagar, como a luz. Quem já estava lá quando a
 * zona montou simplesmente está. E quem vai embora com `exit: "fade"` (os
 * dois, no fim) continua na tela enquanto recua e se apaga — a colisão, essa,
 * já saiu no primeiro instante.
 */
function NpcWhenPresent({ id }: { id: NpcId }) {
  const npc: NpcDefinition = npcs[id];
  const present = useGameStore((state) => isPresent(npc, state));
  const [arrivesLater] = useState(() => !present);
  const [wasPresent, setWasPresent] = useState(present);
  const [leaving, setLeaving] = useState(false);

  // Ajuste durante a renderização: a partida começa no mesmo quadro em que a
  // presença acaba, sem um quadro vazio no meio.
  if (present !== wasPresent) {
    setWasPresent(present);
    setLeaving(!present && npc.exit === "fade");
  }

  if (present) return <Npc id={id} fadeIn={arrivesLater} />;
  if (leaving) return <Npc id={id} leaving onGone={() => setLeaving(false)} />;
  return null;
}

/** Monta os NPCs definidos para a zona em `content/npcs.ts`. */
export function ZoneNpcs({ zone }: { zone: ZoneId }) {
  return npcIds.filter((id) => npcs[id].zone === zone).map((id) => <NpcWhenPresent key={id} id={id} />);
}
