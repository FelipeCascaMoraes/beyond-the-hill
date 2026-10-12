import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { playerConfig } from "@/game/config/player";
import { attachInput, consumeLook, readMovement } from "@/game/input/input";
import { createPlayerState, headBobOffset, lookAngles, updatePlayer, type PlayerState } from "@/game/player/playerController";
import { terrainHeight } from "@/game/world/terrain";
import { getSpawnPose, playerEnvironmentFor } from "@/game/player/spawn";
import { takePlacement } from "@/game/player/placement";
import { getCameraMode } from "@/game/player/cameraMode";
import { playerView } from "@/game/player/playerView";
import { boomOffset, boomPosition, boomReach } from "@/game/player/thirdPerson";
import { selectCanControl, useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Evita saltos de posição depois de trocar de aba ou travadas longas. */
const MAX_FRAME_TIME = 0.1;

/** Com que rapidez a câmera troca de lugar entre a 1ª e a 3ª pessoa (1/s). */
const BOOM_SPEED = 4;

const boom = { x: 0, y: 0, z: 0 };
const eye = { x: 0, y: 0, z: 0 };
const place = { x: 0, y: 0, z: 0 };

/** A respiração de quem está parado: ritmo (rad/s) e amplitude do olhar (rad). */
const BREATH = { rate: 1.35, pitch: 0.0035, yaw: 0.0018 } as const;

/**
 * A Aysha: liga entrada → lógica pura → câmera. A câmera fica nos olhos dela
 * ou atrás do ombro, conforme a escolha de quem joga (game/player/cameraMode);
 * a caminhada é a mesma nas duas.
 * Só assume a câmera quando `controlEnabled` fica verdadeiro (fim da abertura).
 * Com diálogo ou memória aberta a entrada é desligada (e o mouse destravado);
 * a simulação continua sem entrada, então a Aysha desacelera até parar.
 */
export function PlayerController() {
  const zone = useGameStore((state) => state.zone);
  // Sobe a cada renascimento (capturada por uma máquina): refaz a pose inicial.
  const spawnEpoch = useGameStore((state) => state.spawnEpoch);
  const controlEnabled = useGameStore((state) => state.controlEnabled);
  const canControl = useGameStore(selectCanControl);
  const canvas = useThree((state) => state.gl.domElement);
  const playerRef = useRef<PlayerState | null>(null);
  /** O quanto a câmera já recuou para a 3ª pessoa (0–1). */
  const reach = useRef(0);
  const headBob = useMemo(() => !prefersReducedMotion(), []);

  // O mundo muda no meio da zona: os dois vão embora (e levam a colisão deles),
  // a saída norte se abre. O ambiente é refeito quando isso acontece e só
  // então — sem isso, a Aysha continuaria esbarrando em quem não está mais ali.
  const environment = useGameStore((state) => playerEnvironmentFor(state.zone, state));

  useEffect(() => {
    playerRef.current = createPlayerState(getSpawnPose(zone));
    // Ela acorda olhando pelos próprios olhos; a câmera recua depois.
    reach.current = 0;
  }, [zone, spawnEpoch]);

  useEffect(
    () => () => {
      playerView.tracked = false;
    },
    [],
  );

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

  useFrame(({ camera, clock }, delta) => {
    // Uma cena terminou e pediu que a Aysha ficasse onde a câmera estava.
    const placed = takePlacement();
    if (placed) {
      playerRef.current = createPlayerState(placed);
      // A cena devolveu a câmera nos olhos dela: a 3ª pessoa recua a partir dali.
      reach.current = 0;
    }

    const player = playerRef.current;
    if (!player || !controlEnabled) {
      playerView.tracked = false;
      return;
    }

    const movement = readMovement();
    const look = consumeLook();
    updatePlayer(
      player,
      { forward: movement.forward, strafe: movement.strafe, run: movement.run, lookDeltaX: look.x, lookDeltaY: look.y },
      Math.min(delta, MAX_FRAME_TIME),
      environment,
      playerConfig,
    );

    // Onde ela está, para quem não pode mais perguntar à câmera (playerView.ts).
    // Durante uma cena quem conta é a câmera: a posição dela deixa de valer.
    playerView.tracked = useGameStore.getState().activeCinematic === null;
    playerView.x = player.x;
    playerView.y = player.eyeY;
    playerView.z = player.z;
    playerView.groundY = player.eyeY - playerConfig.eyeHeight;
    playerView.yaw = player.yaw;
    playerView.velocityX = player.velocityX;
    playerView.velocityZ = player.velocityZ;
    playerView.stepPhase = player.stepPhase;

    // A câmera recua para trás do ombro em 3ª pessoa e volta aos olhos em 1ª:
    // `reach` é o quanto do caminho ela já fez (0 = olhos, 1 = lugar inteiro).
    // Encolhe na hora quando uma parede aparece — atravessá-la é pior que um
    // salto — e se estica devagar quando o espaço volta.
    boomOffset(player.yaw, player.pitch, boom);
    const wanted = getCameraMode() === "third" ? boomReach(player.x, player.z, boom, environment.walls ?? []) : 0;
    const frame = Math.min(delta, MAX_FRAME_TIME);
    if (wanted < reach.current && getCameraMode() === "third") reach.current = wanted;
    else reach.current += (wanted - reach.current) * (1 - Math.exp(-BOOM_SPEED * frame));
    if (reach.current < 1e-3) reach.current = 0;
    const eyes = 1 - Math.min(1, reach.current * 4);

    // Parada, ela respira: o olhar sobe e desce um nada, devagar. Some quando
    // anda — aí quem mexe a câmera é o passo. Só pelos olhos dela: vista de
    // fora, quem respira e pisa é o corpo.
    let breathPitch = 0;
    let breathYaw = 0;
    if (headBob && eyes > 0) {
      const still = 1 - Math.min(1, Math.hypot(player.velocityX, player.velocityZ) / playerConfig.walkSpeed);
      const time = clock.elapsedTime;
      breathPitch = Math.sin(time * BREATH.rate) * BREATH.pitch * still * eyes;
      breathYaw = Math.sin(time * BREATH.rate * 0.61 + 1.3) * BREATH.yaw * still * eyes;
    }

    camera.rotation.order = "YXZ";
    camera.rotation.set(player.pitch + breathPitch, player.yaw + breathYaw, 0);
    eye.x = player.x;
    eye.y = player.eyeY + (headBob ? headBobOffset(player, playerConfig) * eyes : 0);
    eye.z = player.z;
    boomPosition(eye, boom, reach.current, environment.heightAt, place);
    camera.position.set(place.x, place.y, place.z);
    playerView.cameraDistance = Math.hypot(place.x - eye.x, place.y - eye.y, place.z - eye.z);
  });

  return null;
}
