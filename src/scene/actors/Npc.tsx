import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { npcs, type NpcId } from "@/content";
import { nextConversation } from "@/game/dialogue/conversation";
import { useCharacterLabel } from "@/game/dialogue/useCharacterLabel";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { useInteractable } from "../interaction/useInteractable";
import { NpcFigure } from "./NpcFigure";

/** A partir desta distância (m) o NPC se vira para a Aysha. */
const TURN_DISTANCE = 9;
/** Rapidez do giro (maior = mais rápido). */
const TURN_RATE = 2.5;
/** Altura do alvo de interação: peito/cabeça. */
const TARGET_HEIGHT = 1.25;

/** Diferença angular pelo caminho mais curto, em (-π, π]. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * NPC genérico: posição e conversas vêm de `content/npcs.ts`.
 * Vira-se para a Aysha quando ela se aproxima e oferece a próxima conversa.
 */
export function Npc({ id }: { id: NpcId }) {
  const npc = npcs[id];
  const [x, z] = npc.position;
  const y = terrainHeight(x, z);
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);

  const label = useCharacterLabel(id);
  const dialogue = useGameStore((state) => nextConversation(npc.conversation, state));

  const restYaw = useMemo(
    () => Math.atan2(npc.restLookAt[0] - x, npc.restLookAt[1] - z),
    [npc.restLookAt, x, z],
  );
  // Fase própria para os dois não respirarem em sincronia.
  const breathPhase = useMemo(() => (x * 12.9898 + z * 78.233) % (Math.PI * 2), [x, z]);

  useInteractable(
    {
      id: `npc-${id}`,
      prompt: `Falar com ${label}`,
      action: { type: "dialogue", dialogue },
      reach: 3.2,
      targetRadius: 0.85,
    },
    [x, y + TARGET_HEIGHT, z],
  );

  useFrame(({ camera, clock }, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;

    const dx = camera.position.x - x;
    const dz = camera.position.z - z;
    const targetYaw = dx * dx + dz * dz < TURN_DISTANCE * TURN_DISTANCE ? Math.atan2(dx, dz) : restYaw;
    group.rotation.y += angleDelta(group.rotation.y, targetYaw) * (1 - Math.exp(-TURN_RATE * delta));

    // Respiração sutil: presença sem animação de esqueleto.
    body.scale.y = 1 + Math.sin(clock.elapsedTime * 1.4 + breathPhase) * 0.008;
  });

  return (
    <group ref={groupRef} position={[x, y, z]} rotation-y={restYaw}>
      <group ref={bodyRef}>
        <NpcFigure id={id} />
      </group>
    </group>
  );
}
