import { getQualitySettings } from "@/game/config/quality";
import { HOUSE } from "@/game/world/house";
import { ZoneNpcs } from "../actors/ZoneNpcs";
import { ZonePointsOfInterest, poiGrassClearings } from "../poi/PointsOfInterest";
import { AbandonedHouse } from "../world/AbandonedHouse";
import { Grass } from "../world/Grass";
import { Motes } from "../world/Motes";

/** Referência estável: a grama só é gerada uma vez. Inclui o quintal da casa (grama baixa). */
const CLEARINGS = [...poiGrassClearings("arrival"), { x: HOUSE.x, z: HOUSE.z, radius: 8, floor: 0.35 }];

/** Campo onde Aysha desperta no Além: grama alta, silêncio, luz suspensa, pequenas lembranças e uma casa. */
export function ArrivalZone() {
  const quality = getQualitySettings();
  return (
    <>
      <Grass count={quality.grassBlades} radius={quality.grassRadius} centerZ={4} clearings={CLEARINGS} />
      <Motes count={quality.motes} />
      <AbandonedHouse />
      <ZoneNpcs zone="arrival" />
      <ZonePointsOfInterest zone="arrival" />
    </>
  );
}
