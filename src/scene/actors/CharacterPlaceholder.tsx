import { characters, type CharacterId, type Vec3 } from "@/content";

interface CharacterPlaceholderProps {
  character: CharacterId;
  position?: Vec3;
}

/** Cápsula provisória até os modelos CC0 serem integrados. */
export function CharacterPlaceholder({ character, position = [0, 0, 0] }: CharacterPlaceholderProps) {
  return (
    <mesh position={[position[0], position[1] + 0.9, position[2]]}>
      <capsuleGeometry args={[0.3, 1.2, 4, 12]} />
      <meshStandardMaterial color={characters[character].placeholderColor} />
    </mesh>
  );
}
