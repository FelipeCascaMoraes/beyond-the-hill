import { pointsOfInterest, type PointOfInterestId, type ZoneId } from "@/content";
import { terrainHeight } from "@/game/world/terrain";
import type { GrassClearing } from "../world/geometry";
import { useInteractable } from "../interaction/useInteractable";
import { poiVisuals } from "./PoiVisuals";

const poiIds = Object.keys(pointsOfInterest) as PointOfInterestId[];

const inZone = (zone: ZoneId) => poiIds.filter((id) => pointsOfInterest[id].zone === zone);

/** Um ponto de interesse: visual + interação que abre o pensamento da Aysha. */
function PointOfInterestView({ id }: { id: PointOfInterestId }) {
  const poi = pointsOfInterest[id];
  const visual = poiVisuals[poi.kind];
  const [x, z] = poi.position;
  const y = terrainHeight(x, z);

  useInteractable(
    {
      id: `poi-${id}`,
      prompt: poi.prompt,
      action: { type: "dialogue", dialogue: poi.dialogue },
      reach: visual.reach,
      targetRadius: visual.targetRadius,
    },
    [x, y + visual.targetHeight, z],
  );

  const { Visual } = visual;
  return (
    <group position={[x, y, z]}>
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
