import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { playerConfig } from "@/game/config/player";
import { attachInput, consumeLook, readMovement } from "@/game/input/input";
import { createPlayerState, headBobOffset, updatePlayer, type PlayerState } from "@/game/player/playerController";
import { getPlayerEnvironment, getSpawnPose } from "@/game/player/spawn";
import { useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Evita saltos de posição depois de trocar de aba ou travadas longas. */
const MAX_FRAME_TIME = 0.1;

/**
 * Aysha em 1ª pessoa: liga entrada → lógica pura → câmera.
 * Só assume a câmera quando `controlEnabled` fica verdadeiro (fim da abertura).
 */
export function PlayerController() {
  const zone = useGameStore((state) => state.zone);
  const controlEnabled = useGameStore((state) => state.controlEnabled);
  const canvas = useThree((state) => state.gl.domElement);
  const playerRef = useRef<PlayerState | null>(null);
  const headBob = useMemo(() => !prefersReducedMotion(), []);

  const environment = useMemo(() => getPlayerEnvironment(zone), [zone]);

  useEffect(() => {
    playerRef.current = createPlayerState(getSpawnPose(zone));
  }, [zone]);

  useEffect(() => {
    if (!controlEnabled) return;
    return attachInput(canvas);
  }, [controlEnabled, canvas]);

  useFrame(({ camera }, delta) => {
    const player = playerRef.current;
    if (!player || !controlEnabled) return;

    const movement = readMovement();
    const look = consumeLook();
    updatePlayer(
      player,
      { forward: movement.forward, strafe: movement.strafe, lookDeltaX: look.x, lookDeltaY: look.y },
      Math.min(delta, MAX_FRAME_TIME),
      environment,
      playerConfig,
    );

    camera.rotation.order = "YXZ";
    camera.rotation.set(player.pitch, player.yaw, 0);
    camera.position.set(player.x, player.eyeY + (headBob ? headBobOffset(player, playerConfig) : 0), player.z);
  });

  return null;
}
