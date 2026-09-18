import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { Vector3 } from "three";
import { cameraIntro } from "@/game/config/render";
import { getSpawnPose } from "@/game/player/spawn";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { prefersReducedMotion } from "@/lib/motion";

/** Pontos com altura relativa ao chão sob eles. */
function aboveGround([x, y, z]: readonly [number, number, number]): Vector3 {
  return new Vector3(x, y + terrainHeight(x, z), z);
}

const fromPosition = aboveGround(cameraIntro.from.position);
const fromTarget = aboveGround(cameraIntro.from.target);
const toPosition = new Vector3();
const toTarget = new Vector3();
const lookTarget = new Vector3();

/** Distância do ponto de mira usado para interpolar o olhar. */
const AIM_DISTANCE = 100;

/**
 * Abertura cinematográfica: Aysha desperta deitada na grama olhando o céu,
 * se ergue e o olhar desce até a colina. Ao terminar, entrega a câmera ao jogador.
 */
export function CameraRig() {
  const phase = useGameStore((state) => state.phase);
  const progress = useRef({ value: 0 });

  useEffect(() => {
    if (phase !== "playing") return;

    const { zone, setControlEnabled } = useGameStore.getState();
    const pose = getSpawnPose(zone);
    toPosition.set(pose.x, pose.eyeY, pose.z);
    toTarget.set(
      pose.x - Math.sin(pose.yaw) * Math.cos(pose.pitch) * AIM_DISTANCE,
      pose.eyeY + Math.sin(pose.pitch) * AIM_DISTANCE,
      pose.z - Math.cos(pose.yaw) * Math.cos(pose.pitch) * AIM_DISTANCE,
    );

    const tween = gsap.to(progress.current, {
      value: 1,
      duration: prefersReducedMotion() ? 0 : cameraIntro.duration,
      ease: "power2.inOut",
      onComplete: () => setControlEnabled(true),
    });
    return () => {
      tween.kill();
    };
  }, [phase]);

  useFrame(({ camera }) => {
    if (useGameStore.getState().controlEnabled) return;
    const t = progress.current.value;
    camera.position.lerpVectors(fromPosition, toPosition, t);
    lookTarget.lerpVectors(fromTarget, toTarget, t);
    camera.lookAt(lookTarget);
  });

  return null;
}
