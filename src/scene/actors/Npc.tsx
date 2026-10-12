import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, type Group, type MeshBasicMaterial, type Object3D } from "three";
import { npcs, type NpcDefinition, type NpcId } from "@/content";
import { nextConversation } from "@/game/dialogue/conversation";
import { useCharacterLabel } from "@/game/dialogue/useCharacterLabel";
import { ayshaPosition } from "@/game/player/playerView";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { useInteractable } from "../interaction/useInteractable";
import { GroundShadow } from "../world/GroundShadow";
import { NpcFigure, type FigureId } from "./NpcFigure";

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

/** Quanto leva para quem chega no meio da zona aparecer por inteiro (s). */
const FADE_IN = 3;
/** Quanto leva para quem vai embora à vista se apagar (s), e quanto recua (m). */
const FADE_OUT = 4.5;
const RETREAT = 3;
/** Sombra de contato: o que assenta a figura no chão em vez de colada por cima. */
const SHADOW_RADIUS = 0.75;
const SHADOW_OPACITY = 0.5;

/**
 * Deixa a figura inteira com esta opacidade. Abaixo de 1 os materiais ficam
 * transparentes; em 1 voltam a ser opacos — transparência custa ordenação, e
 * quem já apareceu não precisa dela.
 */
function setFigureOpacity(root: Object3D, opacity: number): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      // Um modelo pode trazer materiais que são transparentes por natureza
      // (cabelo, cílios): esses não voltam a ser opacos (ver CharacterModel).
      const transparent = opacity < 1 || material.userData.keepTransparent === true;
      material.opacity = opacity;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
    }
  });
}

/**
 * NPC genérico: posição e conversas vêm de `content/npcs.ts`.
 * Vira-se para a Aysha quando ela se aproxima e oferece a próxima conversa.
 * Com `fadeIn`, surge devagar em vez de estar lá de uma vez; com `leaving`,
 * recua alguns passos e se apaga, e avisa `onGone` quando não resta nada.
 */
export function Npc({
  id,
  fadeIn = false,
  leaving = false,
  onGone,
}: {
  id: NpcId;
  fadeIn?: boolean;
  leaving?: boolean;
  onGone?: () => void;
}) {
  const npc: NpcDefinition = npcs[id];
  const [x, z] = npc.position;
  const y = terrainHeight(x, z);
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const shadowRef = useRef<MeshBasicMaterial>(null);

  // Quem é: o próprio id, ou a pessoa que este lugar da história traz de volta.
  const character = npc.character ?? (id as FigureId);
  const label = useCharacterLabel(character);
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
      prompt: npc.prompt ?? `Falar com ${label}`,
      action: { type: "dialogue", dialogue },
      reach: 3.2,
      targetRadius: 0.85,
    },
    [x, y + TARGET_HEIGHT, z],
  );

  // A aparição: quanto dela já aconteceu (1 = está ali por inteiro).
  const appeared = useRef(fadeIn ? 0 : 1);
  useLayoutEffect(() => {
    if (bodyRef.current && appeared.current < 1) setFigureOpacity(bodyRef.current, 0);
    if (shadowRef.current && appeared.current < 1) shadowRef.current.opacity = 0;
  }, []);

  // Para onde recua ao ir embora: de costas para onde estava olhando.
  const away = useMemo(() => {
    const dx = x - npc.restLookAt[0];
    const dz = z - npc.restLookAt[1];
    const length = Math.hypot(dx, dz) || 1;
    return { x: dx / length, z: dz / length };
  }, [npc.restLookAt, x, z]);
  const gone = useRef(false);

  useFrame(({ camera, clock }, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;

    if (leaving) {
      // A partida: a mesma curva da chegada, ao contrário, andando para trás.
      const t = Math.max(0, appeared.current - delta / FADE_OUT);
      appeared.current = t;
      setFigureOpacity(body, t * t * (3 - 2 * t));
      if (shadowRef.current) shadowRef.current.opacity = SHADOW_OPACITY * t;
      const back = (1 - t) * RETREAT;
      const bx = x + away.x * back;
      const bz = z + away.z * back;
      group.position.set(bx, terrainHeight(bx, bz), bz);
      if (t === 0 && !gone.current) {
        gone.current = true;
        onGone?.();
      }
    } else if (appeared.current < 1) {
      const t = Math.min(1, appeared.current + delta / FADE_IN);
      appeared.current = t;
      setFigureOpacity(body, t * t * (3 - 2 * t));
      if (shadowRef.current) shadowRef.current.opacity = SHADOW_OPACITY * t;
    }

    const aysha = ayshaPosition(camera.position);
    const dx = aysha.x - x;
    const dz = aysha.z - z;
    const targetYaw = dx * dx + dz * dz < TURN_DISTANCE * TURN_DISTANCE ? Math.atan2(dx, dz) : restYaw;
    group.rotation.y += angleDelta(group.rotation.y, targetYaw) * (1 - Math.exp(-TURN_RATE * delta));

    // Respiração sutil: presença sem animação de esqueleto.
    body.scale.y = 1 + Math.sin(clock.elapsedTime * 1.4 + breathPhase) * 0.008;
  });

  return (
    <group ref={groupRef} position={[x, y, z]} rotation-y={restYaw}>
      <group ref={bodyRef}>
        <NpcFigure character={character} />
      </group>
      <GroundShadow x={0} z={0} radius={SHADOW_RADIUS} opacity={SHADOW_OPACITY} local materialRef={shadowRef} />
    </group>
  );
}
