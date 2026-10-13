import { useRef, useState, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { playerConfig } from "@/game/config/player";
import { getCameraMode, subscribeCameraMode } from "@/game/player/cameraMode";
import { playerView } from "@/game/player/playerView";
import { thirdPersonConfig } from "@/game/player/thirdPerson";
import { prefersReducedMotion } from "@/lib/motion";
import type { CharacterAnimation } from "../actors/CharacterModel";
import { NpcFigure } from "../actors/NpcFigure";
import { GroundShadow } from "../world/GroundShadow";

/** Com que rapidez o corpo se vira para onde anda (1/s). */
const TURN_RATE = 9;
/** Abaixo desta velocidade ela está parada (m/s): não vira nem troca de animação. */
const MOVING_ABOVE = 0.35;
/** Acima desta ela corre (m/s): a meio caminho entre o passo e a corrida. */
const RUNNING_ABOVE = (playerConfig.walkSpeed + playerConfig.runSpeed) / 2;
/** Sombra de contato, como a dos outros personagens. */
const SHADOW_RADIUS = 0.75;
const SHADOW_OPACITY = 0.5;

/** Menor diferença entre dois ângulos, em (-π, π]. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * O corpo da Aysha, para a câmera em 3ª pessoa. Não decide nada: lê onde o
 * controlador do jogador a pôs (game/player/playerView) e desenha ali. O corpo
 * se vira para onde ela anda, não para onde a câmera olha — parada, dá para
 * girar a câmera em volta dela.
 *
 * Some em 1ª pessoa, enquanto a câmera ainda está perto demais (estaria dentro
 * da lente), na abertura e durante as cenas, que foram filmadas pelos olhos
 * dela.
 */
export function AyshaBody() {
  const third = useSyncExternalStore(subscribeCameraMode, getCameraMode, () => "first") === "third";
  return third ? <Body /> : null;
}

function Body() {
  const [reduced] = useState(prefersReducedMotion);
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  /** Para onde o corpo está virado; nulo até ela aparecer pela primeira vez. */
  const heading = useRef<number | null>(null);
  const [animation, setAnimation] = useState<CharacterAnimation>("idle");

  useFrame((_, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;

    const visible = playerView.tracked && playerView.cameraDistance > thirdPersonConfig.hideBodyWithin;
    group.visible = visible;
    if (!playerView.tracked) return;

    const speed = Math.hypot(playerView.velocityX, playerView.velocityZ);
    const walking = speed > MOVING_ABOVE;
    const next = !walking ? "idle" : speed > RUNNING_ABOVE ? "run" : "walk";
    if (next !== animation) setAnimation(next);

    // A frente das figuras é +Z; a câmera olha para -Z com yaw 0.
    if (heading.current === null) heading.current = playerView.yaw + Math.PI;
    if (walking) {
      const target = Math.atan2(playerView.velocityX, playerView.velocityZ);
      heading.current += angleDelta(heading.current, target) * (1 - Math.exp(-TURN_RATE * delta));
    }

    group.position.set(playerView.x, playerView.groundY, playerView.z);
    group.rotation.y = heading.current;

    // O passo: sobe um nada a cada passada e inclina para a frente quando
    // corre. É quase tudo o que a figura sem esqueleto tem de caminhada; num
    // modelo animado, soma-se de leve à animação dele.
    const stride = reduced ? 0 : Math.min(1, speed / playerConfig.runSpeed);
    body.position.y = Math.abs(Math.sin(playerView.stepPhase * Math.PI)) * 0.035 * stride;
    body.rotation.x = 0.07 * stride;
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={bodyRef}>
        <NpcFigure character="aysha" animation={animation} />
      </group>
      <GroundShadow x={0} z={0} radius={SHADOW_RADIUS} opacity={SHADOW_OPACITY} local />
    </group>
  );
}
