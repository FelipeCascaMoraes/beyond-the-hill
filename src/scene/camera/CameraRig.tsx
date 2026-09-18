import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { Vector2, Vector3 } from "three";
import { cameraIntro } from "@/game/config/render";
import { useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { prefersReducedMotion } from "@/lib/motion";

/** Poses da câmera com altura relativa ao chão sob ela. */
function aboveGround([x, y, z]: readonly [number, number, number]): Vector3 {
  return new Vector3(x, y + terrainHeight(x, z), z);
}

const fromPosition = aboveGround(cameraIntro.from.position);
const toPosition = aboveGround(cameraIntro.to.position);
const fromTarget = new Vector3(...cameraIntro.from.target);
const toTarget = aboveGround(cameraIntro.to.target);
const lookTarget = new Vector3();
const smoothedPointer = new Vector2();

/** Amplitude do balanço "respirando" e do parallax com o mouse (em metros). */
const SWAY = { x: 0.12, y: 0.06 };
const PARALLAX = { x: 2.2, y: 1.2 };

/**
 * Câmera cinematográfica. Na tela inicial fica parada entre a grama, olhando a colina;
 * ao começar, sobe até ficar atrás da Aysha e passa a respirar suavemente, reagindo
 * de leve ao mouse. A câmera de 3ª pessoa substitui isto no gameplay.
 */
export function CameraRig() {
  const phase = useGameStore((state) => state.phase);
  const progress = useRef({ value: 0 });

  useEffect(() => {
    if (phase !== "playing") return;
    const tween = gsap.to(progress.current, {
      value: 1,
      duration: prefersReducedMotion() ? 0 : cameraIntro.duration,
      ease: "power2.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [phase]);

  useFrame(({ camera, clock, pointer }, delta) => {
    const t = progress.current.value;
    const time = clock.elapsedTime;
    smoothedPointer.lerp(pointer, 1 - Math.exp(-delta * 1.5));

    camera.position.lerpVectors(fromPosition, toPosition, t);
    camera.position.x += Math.sin(time * 0.13) * SWAY.x * t;
    camera.position.y += Math.sin(time * 0.21) * SWAY.y * t;

    lookTarget.lerpVectors(fromTarget, toTarget, t);
    lookTarget.x += smoothedPointer.x * PARALLAX.x * t;
    lookTarget.y += smoothedPointer.y * PARALLAX.y * t;
    camera.lookAt(lookTarget);
  });

  return null;
}
