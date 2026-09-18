import { zones } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { CharacterPlaceholder } from "./CharacterPlaceholder";

/** Aysha. Controle e câmera em 3ª pessoa entram na etapa de gameplay. */
export function Player() {
  const zone = useGameStore((state) => state.zone);
  const [x, , z] = zones[zone].playerSpawn;
  return <CharacterPlaceholder character="aysha" position={[x, terrainHeight(x, z), z]} />;
}
