import { zones, type ZoneId } from "@/content";
import { playerConfig } from "@/game/config/player";
import { terrainHeight } from "@/game/world/terrain";
import { lookAngles, type PlayerEnvironment, type SpawnPose } from "./playerController";

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
  return {
    heightAt: terrainHeight,
    bounds: { centerX: center[0], centerZ: center[1], radius },
  };
}
