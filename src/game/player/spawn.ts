// Importa cada módulo pelo caminho relativo e com extensão: este arquivo é
// alcançado pelos testes, e o alias @/ só existe no bundler.
import { npcs, type NpcId } from "../../content/npcs.ts";
import { pointsOfInterest } from "../../content/pointsOfInterest.ts";
import type { PointOfInterest } from "../../content/types.ts";
import { zones, type ZoneId } from "../../content/zones.ts";
import { playerConfig } from "../config/player.ts";
import { isPresent } from "../story/presence.ts";
import { meetsRequirement, type StoryContext } from "../story/requirements.ts";
import { HOUSE, houseWallBoxes } from "../world/house.ts";
import { LABYRINTH, labyrinthWallBoxes } from "../world/labyrinth.ts";
import { REFUGE, refugeObstacles, refugePaceAt } from "../world/refuge.ts";
import { terrainHeight } from "../world/terrain.ts";
import { lookAngles, type CircleObstacle, type PlayerEnvironment, type SpawnPose } from "./playerController.ts";

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

/** Um ponto de interesse que abriu passagem e some ao abrir não barra mais nada. */
const stillBlocks = (poi: PointOfInterest, context: StoryContext): boolean =>
  poi.obstacleRadius !== undefined &&
  !(poi.travel?.clears === true && meetsRequirement(poi.travel.requires, context));

/**
 * O que existe fisicamente na zona agora. Depende da história, não só da zona:
 * no meio do campo os dois guias vão embora e a saída norte do labirinto se
 * abre. Quem desenha e quem colide leem daqui — se discordarem, a Aysha
 * esbarra em quem já não está lá, que é o jeito mais fácil de travar o jogo.
 */
export function getPlayerEnvironment(zoneId: ZoneId, context: StoryContext): PlayerEnvironment {
  const npcObstacles: CircleObstacle[] = (Object.keys(npcs) as NpcId[])
    .filter((id) => npcs[id].zone === zoneId && isPresent(npcs[id], context))
    .map((id) => ({ x: npcs[id].position[0], z: npcs[id].position[1], radius: NPC_RADIUS }));

  // Pontos de interesse sólidos (pedras) também bloqueiam a passagem.
  const poiObstacles: CircleObstacle[] = Object.values<PointOfInterest>(pointsOfInterest)
    .filter((poi) => poi.zone === zoneId && stillBlocks(poi, context))
    .map((poi) => ({ x: poi.position[0], z: poi.position[1], radius: poi.obstacleRadius ?? 0 }));

  // O refúgio: a cerca viva e a árvore barram o passo, e o chão pede calma.
  const inRefuge = REFUGE.zone === zoneId;

  return {
    heightAt: terrainHeight,
    bounds: zones[zoneId].bounds.map(({ center, radius }) => ({ centerX: center[0], centerZ: center[1], radius })),
    obstacles: [...npcObstacles, ...poiObstacles, ...(inRefuge ? refugeObstacles() : [])],
    walls: zoneWalls(zoneId),
    ...(inRefuge ? { paceAt: refugePaceAt } : {}),
  };
}

/**
 * Assinatura do que existe fisicamente na zona. Muda exatamente quando alguma
 * colisão aparece ou some — é o sinal de que o ambiente precisa ser refeito.
 */
function zoneSignature(zoneId: ZoneId, context: StoryContext): string {
  const present = (Object.keys(npcs) as NpcId[]).filter((id) => npcs[id].zone === zoneId && isPresent(npcs[id], context));
  const solid = Object.values<PointOfInterest>(pointsOfInterest).filter((poi) => poi.zone === zoneId && stillBlocks(poi, context));
  return `${zoneId}|${present.join(",")}|${solid.length}`;
}

let cached: { key: string; environment: PlayerEnvironment } | null = null;

/**
 * O ambiente da zona, refeito só quando alguma colisão aparece ou some.
 * Devolve a mesma referência enquanto nada muda: é isso que permite lê-lo
 * direto de um seletor do estado sem renderizar o jogador à toa.
 */
export function playerEnvironmentFor(zoneId: ZoneId, context: StoryContext): PlayerEnvironment {
  const key = zoneSignature(zoneId, context);
  if (cached?.key !== key) cached = { key, environment: getPlayerEnvironment(zoneId, context) };
  return cached.environment;
}
