import type { CharacterId, Vec3 } from "@/content";
import { CharacterPlaceholder } from "./CharacterPlaceholder";

interface NpcProps {
  character: Exclude<CharacterId, "aysha">;
  position: Vec3;
}

/** Personagem não jogável. Comportamento (seguir, guiar) entra na etapa de gameplay. */
export function Npc({ character, position }: NpcProps) {
  return <CharacterPlaceholder character={character} position={position} />;
}
