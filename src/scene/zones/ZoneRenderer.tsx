import type { ComponentType } from "react";
import type { ZoneId } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { ArrivalZone } from "./ArrivalZone";
import { HillsideZone } from "./HillsideZone";
import { LabyrinthZone } from "./LabyrinthZone";

/** Uma zona montada por vez; as demais entram conforme forem construídas. */
const zoneComponents: Partial<Record<ZoneId, ComponentType>> = {
  arrival: ArrivalZone,
  labyrinth: LabyrinthZone,
  hillside: HillsideZone,
};

export function ZoneRenderer() {
  const zone = useGameStore((state) => state.zone);
  const Zone = zoneComponents[zone];
  return Zone ? <Zone key={zone} /> : null;
}
