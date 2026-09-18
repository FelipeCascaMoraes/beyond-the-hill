import { getQualitySettings } from "@/game/config/quality";
import { ZoneNpcs } from "../actors/ZoneNpcs";
import { DevInteractionProbe } from "../interaction/DevInteractionProbe";
import { ZonePointsOfInterest, poiGrassClearings } from "../poi/PointsOfInterest";
import { Grass } from "../world/Grass";
import { Motes } from "../world/Motes";

const isDevelopment = process.env.NODE_ENV === "development";

/** Referência estável: a grama só é gerada uma vez. */
const CLEARINGS = poiGrassClearings("arrival");

/** Campo onde Aysha desperta no Além: grama alta, silêncio, luz suspensa e pequenas lembranças. */
export function ArrivalZone() {
  const quality = getQualitySettings();
  return (
    <>
      <Grass count={quality.grassBlades} radius={quality.grassRadius} centerZ={4} clearings={CLEARINGS} />
      <Motes count={quality.motes} />
      <ZoneNpcs zone="arrival" />
      <ZonePointsOfInterest zone="arrival" />
      {isDevelopment && <DevInteractionProbe />}
    </>
  );
}
