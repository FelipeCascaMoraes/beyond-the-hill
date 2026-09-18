import { npcs, zones, type NpcId, type ZoneId } from "@/content";
import { playerConfig } from "@/game/config/player";
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

export function getPlayerEnvironment(zoneId: ZoneId): PlayerEnvironment {
  const { center, radius } = zones[zoneId].bounds;
  const obstacles: CircleObstacle[] = (Object.keys(npcs) as NpcId[])
    .filter((id) => npcs[id].zone === zoneId)
    .map((id) => ({ x: npcs[id].position[0], z: npcs[id].position[1], radius: NPC_RADIUS }));

  return {
    heightAt: terrainHeight,
    bounds: { centerX: center[0], centerZ: center[1], radius },
    obstacles,
  };
}
