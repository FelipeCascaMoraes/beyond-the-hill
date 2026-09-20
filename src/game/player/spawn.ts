import { npcs, pointsOfInterest, zones, type NpcId, type PointOfInterest, type ZoneId } from "@/content";
import { playerConfig } from "@/game/config/player";
import { HOUSE, houseWallBoxes } from "@/game/world/house";
import { LABYRINTH, labyrinthWallBoxes } from "@/game/world/labyrinth";
import { terrainHeight } from "@/game/world/terrain";
import { lookAngles, type CircleObstacle, type PlayerEnvironment, type SpawnPose } from "./playerController";

/** Raio de colisão de um NPC (m): espaço pessoal, a Aysha para a ~1 m. */
const NPC_RADIUS = 0.7;

/** Onde a Aysha surge e para onde olha ao entrar na zona. */
export function getSpawnPose(zoneId: ZoneId): SpawnPose {
  const zone = zones[zoneId];
  const [x, , z] = zone.playerSpawn;
  const eyeY = terrainHeight(x, z) + playerConfig.eyeHeight;
  const [lookX, lookY, lookZ] = zone.spawnLookAt;
  return { x, z, eyeY, ...lookAngles(x, eyeY, z, lookX, lookY, lookZ) };
}

/** Tudo que é parede na zona: a casa abandonada, o labirinto. */
function zoneWalls(zoneId: ZoneId) {
  return [
    ...(HOUSE.zone === zoneId ? houseWallBoxes() : []),
    ...(LABYRINTH.zone === zoneId ? labyrinthWallBoxes() : []),
  ];
}

export function getPlayerEnvironment(zoneId: ZoneId): PlayerEnvironment {
  const npcObstacles: CircleObstacle[] = (Object.keys(npcs) as NpcId[])
    .filter((id) => npcs[id].zone === zoneId)
    .map((id) => ({ x: npcs[id].position[0], z: npcs[id].position[1], radius: NPC_RADIUS }));

  // Pontos de interesse sólidos (pedras) também bloqueiam a passagem.
  const poiObstacles: CircleObstacle[] = Object.values<PointOfInterest>(pointsOfInterest)
    .filter((poi) => poi.zone === zoneId && poi.obstacleRadius !== undefined)
    .map((poi) => ({ x: poi.position[0], z: poi.position[1], radius: poi.obstacleRadius ?? 0 }));

  const obstacles = [...npcObstacles, ...poiObstacles];

  return {
    heightAt: terrainHeight,
    bounds: zones[zoneId].bounds.map(({ center, radius }) => ({ centerX: center[0], centerZ: center[1], radius })),
    obstacles,
    walls: zoneWalls(zoneId),
  };
}
