import type { PlayerConfig } from "../config/player";

// Lógica pura da movimentação em 1ª pessoa: sem React, sem Three.js, sem DOM.
// Recebe entrada e ambiente, atualiza o estado. Testável isoladamente.

export interface PlayerState {
  x: number;
  z: number;
  /** Altura dos olhos no mundo (suavizada). */
  eyeY: number;
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  velocityX: number;
  velocityZ: number;
  /** Fase do balanço do passo, em passos. */
  stepPhase: number;
}

export interface PlayerInput {
  /** -1 (trás) a 1 (frente). */
  forward: number;
  /** -1 (esquerda) a 1 (direita). */
  strafe: number;
  /** Movimento do mouse desde o último frame, em pixels. */
  lookDeltaX: number;
  lookDeltaY: number;
}

/** Obstáculo circular no plano XZ (NPCs, pedras, troncos). */
export interface CircleObstacle {
  x: number;
  z: number;
  radius: number;
}

export interface PlayerEnvironment {
  heightAt: (x: number, z: number) => number;
  bounds: { centerX: number; centerZ: number; radius: number };
  obstacles?: readonly CircleObstacle[];
}

export interface SpawnPose {
  x: number;
  z: number;
  eyeY: number;
  yaw: number;
  pitch: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Fator de aproximação exponencial, independente do FPS. */
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Yaw/pitch para olhar de `from` até `to` (a câmera olha para -Z com yaw 0). */
export function lookAngles(
  fromX: number,
  fromY: number,
  fromZ: number,
  toX: number,
  toY: number,
  toZ: number,
): { yaw: number; pitch: number } {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(toY - fromY, Math.hypot(dx, dz)),
  };
}

export function createPlayerState(pose: SpawnPose): PlayerState {
  return {
    x: pose.x,
    z: pose.z,
    eyeY: pose.eyeY,
    yaw: pose.yaw,
    pitch: pose.pitch,
    targetYaw: pose.yaw,
    targetPitch: pose.pitch,
    velocityX: 0,
    velocityZ: 0,
    stepPhase: 0,
  };
}

export function updatePlayer(
  state: PlayerState,
  input: PlayerInput,
  dt: number,
  environment: PlayerEnvironment,
  config: PlayerConfig,
): void {
  // Olhar: acumula no alvo e segue com leve suavização.
  state.targetYaw -= input.lookDeltaX * config.lookSensitivity;
  state.targetPitch = clamp(
    state.targetPitch - input.lookDeltaY * config.lookSensitivity,
    -config.maxPitch,
    config.maxPitch,
  );
  const look = damp(config.lookSmoothing, dt);
  state.yaw += (state.targetYaw - state.yaw) * look;
  state.pitch += (state.targetPitch - state.pitch) * look;

  // Direção desejada relativa ao olhar (diagonal não fica mais rápida).
  let forward = input.forward;
  let strafe = input.strafe;
  const length = Math.hypot(forward, strafe);
  if (length > 1) {
    forward /= length;
    strafe /= length;
  }
  const sin = Math.sin(state.yaw);
  const cos = Math.cos(state.yaw);
  const wishX = (-sin * forward + cos * strafe) * config.walkSpeed;
  const wishZ = (-cos * forward - sin * strafe) * config.walkSpeed;

  const accel = damp(length > 0 ? config.acceleration : config.deceleration, dt);
  state.velocityX += (wishX - state.velocityX) * accel;
  state.velocityZ += (wishZ - state.velocityZ) * accel;

  // Limite suave: perto da borda, o passo para fora perde força.
  const { centerX, centerZ, radius } = environment.bounds;
  let offsetX = state.x - centerX;
  let offsetZ = state.z - centerZ;
  let distance = Math.hypot(offsetX, offsetZ);
  if (distance > 1e-4) {
    const normalX = offsetX / distance;
    const normalZ = offsetZ / distance;
    const outward = state.velocityX * normalX + state.velocityZ * normalZ;
    if (outward > 0) {
      const resistance = smoothstep(radius - config.boundsSoftMargin, radius, distance);
      state.velocityX -= normalX * outward * resistance;
      state.velocityZ -= normalZ * outward * resistance;
    }
  }

  state.x += state.velocityX * dt;
  state.z += state.velocityZ * dt;

  // Obstáculos: empurra para fora do círculo; o movimento tangente continua (desliza).
  for (const obstacle of environment.obstacles ?? []) {
    const awayX = state.x - obstacle.x;
    const awayZ = state.z - obstacle.z;
    const minDistance = obstacle.radius + config.bodyRadius;
    const separation = Math.hypot(awayX, awayZ);
    if (separation >= minDistance || separation < 1e-6) continue;
    state.x = obstacle.x + (awayX / separation) * minDistance;
    state.z = obstacle.z + (awayZ / separation) * minDistance;
  }

  // Limite rígido: nunca sai do círculo, desliza pela borda.
  offsetX = state.x - centerX;
  offsetZ = state.z - centerZ;
  distance = Math.hypot(offsetX, offsetZ);
  if (distance > radius) {
    state.x = centerX + (offsetX / distance) * radius;
    state.z = centerZ + (offsetZ / distance) * radius;
  }

  // Chão: os olhos acompanham o terreno com suavização.
  const targetEyeY = environment.heightAt(state.x, state.z) + config.eyeHeight;
  state.eyeY += (targetEyeY - state.eyeY) * damp(config.groundSmoothing, dt);

  const speed = Math.hypot(state.velocityX, state.velocityZ);
  state.stepPhase += speed * dt * config.headBob.stepsPerMeter;
}

/** Deslocamento vertical do passo; some quando a Aysha está parada. */
export function headBobOffset(state: PlayerState, config: PlayerConfig): number {
  const speedRatio = Math.min(1, Math.hypot(state.velocityX, state.velocityZ) / config.walkSpeed);
  return Math.sin(state.stepPhase * Math.PI * 2) * config.headBob.amplitude * speedRatio;
}
