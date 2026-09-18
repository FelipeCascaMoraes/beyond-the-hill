import { memories, pointsOfInterest, type PointOfInterest, type PointOfInterestId, type ZoneId } from "@/content";
import { memoryStatus } from "@/game/memory/memoryLogic";
import { poiInteraction } from "@/game/poi/poiInteraction";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import type { GrassClearing } from "../world/geometry";
import { useInteractable } from "../interaction/useInteractable";
import { poiVisuals } from "./PoiVisuals";

const poiIds = Object.keys(pointsOfInterest) as PointOfInterestId[];

const inZone = (zone: ZoneId) => poiIds.filter((id) => pointsOfInterest[id].zone === zone);

/**
 * Um ponto de interesse: visual + interação. Se estiver ligado a uma memória,
 * a interação muda sozinha conforme ela desbloqueia e é vivida.
 */
function PointOfInterestView({ id }: { id: PointOfInterestId }) {
  const poi: PointOfInterest = pointsOfInterest[id];
  const visual = poiVisuals[poi.kind];
  const [x, z] = poi.position;
  const y = terrainHeight(x, z);

  const status = useGameStore((state) => (poi.memory ? memoryStatus(poi.memory.id, memories[poi.memory.id], state) : null));
  const { prompt, action } = poiInteraction(poi, status);

  useInteractable(
    {
      id: `poi-${id}`,
      prompt,
      action,
      reach: visual.reach,
      targetRadius: visual.targetRadius,
    },
    [x, y + visual.targetHeight, z],
  );

  const { Visual } = visual;
  return (
    <group position={[x, y, z]} rotation-y={poi.rotation ?? 0}>
      <Visual x={x} y={y} z={z} />
    </group>
  );
}

/** Monta todos os pontos de interesse da zona definidos em `content/pointsOfInterest.ts`. */
export function ZonePointsOfInterest({ zone }: { zone: ZoneId }) {
  return inZone(zone).map((id) => <PointOfInterestView key={id} id={id} />);
}

/** Clareiras de grama em volta dos pontos de interesse da zona (chame fora do render). */
export function poiGrassClearings(zone: ZoneId): readonly GrassClearing[] {
  return inZone(zone).map((id) => {
    const poi = pointsOfInterest[id];
    return { x: poi.position[0], z: poi.position[1], radius: poiVisuals[poi.kind].clearing };
  });
}
