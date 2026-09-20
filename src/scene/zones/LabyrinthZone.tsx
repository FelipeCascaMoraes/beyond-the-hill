import { useEffect, useMemo } from "react";
import { getQualitySettings } from "@/game/config/quality";
import { LABYRINTH, LABYRINTH_HALF } from "@/game/world/labyrinth";
import { labyrinthPadHeight } from "@/game/world/terrain";
import { ZoneMachines } from "../machines/ZoneMachines";
import { ZonePointsOfInterest, poiGrassClearings } from "../poi/PointsOfInterest";
import { Grass } from "../world/Grass";
import { Motes } from "../world/Motes";
import { createLabyrinthGeometry } from "../world/labyrinthGeometry";

/** Grama rala só por fora da muralha: dentro é pedra e terra batida. */
const CLEARINGS = [
  ...poiGrassClearings("labyrinth"),
  { x: LABYRINTH.x, z: LABYRINTH.z, radius: LABYRINTH_HALF + 1, floor: 0.12 },
];

/**
 * O labirinto: um quadrado de pedra no caminho da colina. Corredores estreitos,
 * uma câmara escondida no meio e uma máquina rondando o anel externo.
 * As paredes são baixas de propósito — a colina continua por cima delas.
 */
export function LabyrinthZone() {
  const quality = getQualitySettings();
  const geometry = useMemo(() => createLabyrinthGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <Grass count={quality.grassBlades} radius={quality.grassRadius} centerZ={LABYRINTH.z} clearings={CLEARINGS} />
      <Motes count={Math.round(quality.motes * 0.6)} />
      <mesh geometry={geometry} position={[LABYRINTH.x, labyrinthPadHeight(), LABYRINTH.z]}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <ZoneMachines zone="labyrinth" />
      <ZonePointsOfInterest zone="labyrinth" />
    </>
  );
}
