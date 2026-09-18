import { characters, type CharacterId } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { characterLabel } from "./conversation";

/** Nome ou epíteto do personagem, conforme a Aysha já o conheça. */
export function useCharacterLabel(id: CharacterId): string {
  const known = useGameStore((state) => state.knownCharacters.includes(id));
  return characterLabel(characters[id], known);
}
