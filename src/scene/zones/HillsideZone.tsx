import { getQualitySettings } from "@/game/config/quality";
import { hillsideGrassPatches, hillsideTrailClearings } from "@/game/world/hillside";
import { ZonePointsOfInterest, poiGrassClearings } from "../poi/PointsOfInterest";
import { Grass } from "../world/Grass";
import { HillsideAmbience } from "../world/HillsideAmbience";
import { Motes } from "../world/Motes";

// Referências estáveis: grama e trilha são geradas uma única vez.
const CLEARINGS = [...poiGrassClearings("hillside"), ...hillsideTrailClearings()];

/**
 * Cada mancha carrega só as clareiras que a alcançam. São cem ao longo de meio
 * quilômetro de trilha, e testar todas contra cada folha custaria mais tempo
 * do que gerar a grama inteira — e esse tempo apareceria como um tranco na
 * travessia para a encosta.
 */
const PATCHES = hillsideGrassPatches().map((patch) => ({
  ...patch,
  clearings: CLEARINGS.filter(
    (clearing) => Math.hypot(clearing.x - patch.x, clearing.z - patch.z) < patch.radius + clearing.radius,
  ),
}));

/** Fatia do orçamento de folhas que vai para cada mancha. */
const PATCH_SHARE = 0.24;

/**
 * A encosta: meio quilômetro de subida, do vale até a concha atrás do cume.
 * Nenhuma máquina, nenhum NPC — é a única zona do jogo sem nada que ameace.
 * O que muda aqui muda com a altura: a luz, o ar, o vento e a interface (ver
 * scene/world/mood.ts, audio/hillsideAudio.ts e ui/GameUI.tsx).
 */
export function HillsideZone() {
  const quality = getQualitySettings();
  return (
    <>
      {PATCHES.map((patch, index) => (
        <Grass
          key={index}
          count={Math.round(quality.grassBlades * PATCH_SHARE * patch.density)}
          radius={patch.radius}
          centerX={patch.x}
          centerZ={patch.z}
          seed={patch.seed}
          clearings={patch.clearings}
          cull
        />
      ))}
      <Motes count={Math.round(quality.motes * 0.7)} />
      <HillsideAmbience />
      <ZonePointsOfInterest zone="hillside" />
    </>
  );
}
