import { getQualitySettings } from "@/game/config/quality";
import { ZoneNpcs } from "../actors/ZoneNpcs";
import { DevInteractionProbe } from "../interaction/DevInteractionProbe";
import { Grass } from "../world/Grass";
import { Motes } from "../world/Motes";

const isDevelopment = process.env.NODE_ENV === "development";

/** Campo onde Aysha desperta no Além: grama alta, silêncio e luz suspensa no ar. */
export function ArrivalZone() {
  const quality = getQualitySettings();
  return (
    <>
      <Grass count={quality.grassBlades} radius={quality.grassRadius} centerZ={4} />
      <Motes count={quality.motes} />
      <ZoneNpcs zone="arrival" />
      {isDevelopment && <DevInteractionProbe />}
    </>
  );
}
