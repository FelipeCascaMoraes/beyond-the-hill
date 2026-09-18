import { getQualitySettings } from "@/game/config/quality";
import { Grass } from "../world/Grass";
import { Motes } from "../world/Motes";

/** Campo onde Aysha desperta no Além: grama alta, silêncio e luz suspensa no ar. */
export function ArrivalZone() {
  const quality = getQualitySettings();
  return (
    <>
      <Grass count={quality.grassBlades} radius={quality.grassRadius} centerZ={4} />
      <Motes count={quality.motes} centerZ={4} />
    </>
  );
}
