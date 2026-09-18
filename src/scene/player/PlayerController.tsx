import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { playerConfig } from "@/game/config/player";
import { attachInput, consumeLook, readMovement } from "@/game/input/input";
import { createPlayerState, headBobOffset, lookAngles, updatePlayer, type PlayerState } from "@/game/player/playerController";
import { terrainHeight } from "@/game/world/terrain";
import { getPlayerEnvironment, getSpawnPose } from "@/game/player/spawn";
import { selectCanControl, useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Evita saltos de posição depois de trocar de aba ou travadas longas. */
const MAX_FRAME_TIME = 0.1;

/**
 * Aysha em 1ª pessoa: liga entrada → lógica pura → câmera.
 * Só assume a câmera quando `controlEnabled` fica verdadeiro (fim da abertura).
 * Com diálogo ou memória aberta a entrada é desligada (e o mouse destravado);
 * a simulação continua sem entrada, então a Aysha desacelera até parar.
 */
export function PlayerController() {
  const zone = useGameStore((state) => state.zone);
  const controlEnabled = useGameStore((state) => state.controlEnabled);
  const canControl = useGameStore(selectCanControl);
  const canvas = useThree((state) => state.gl.domElement);
  const playerRef = useRef<PlayerState | null>(null);
  const headBob = useMemo(() => !prefersReducedMotion(), []);

  const environment = useMemo(() => getPlayerEnvironment(zone), [zone]);

  useEffect(() => {
    playerRef.current = createPlayerState(getSpawnPose(zone));
  }, [zone]);

  // Só em desenvolvimento: window.__bthPlayer.teleport(x, z, olharX?, olharZ?, olharY?).
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const teleport = (x: number, z: number, lookX = x, lookZ = z - 10, lookY?: number) => {
      const eyeY = terrainHeight(x, z) + playerConfig.eyeHeight;
      playerRef.current = createPlayerState({ x, z, eyeY, ...lookAngles(x, eyeY, z, lookX, lookY ?? eyeY, lookZ) });
    };
    Object.assign(window, { __bthPlayer: { teleport } });
  }, []);

  useEffect(() => {
    if (!canControl) return;
    return attachInput(canvas);
  }, [canControl, canvas]);

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
