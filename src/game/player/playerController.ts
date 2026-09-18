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

/** Obstáculo retangular alinhado aos eixos no plano XZ (paredes). */
export interface BoxObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Círculo da área explorável. */
export interface BoundsCircle {
  centerX: number;
  centerZ: number;
  radius: number;
}

export interface PlayerEnvironment {
  heightAt: (x: number, z: number) => number;
  /** Área explorável: união de círculos (ex.: o campo + a área da casa). */
  bounds: readonly BoundsCircle[];
  obstacles?: readonly CircleObstacle[];
  walls?: readonly BoxObstacle[];
}

/** Círculo com mais folga para a posição (o "mais por dentro"); pode estar fora de todos. */
function roomiestCircle(bounds: readonly BoundsCircle[], x: number, z: number) {
  let best = bounds[0];
  let bestSlack = -Infinity;
  for (const circle of bounds) {
    const slack = circle.radius - Math.hypot(x - circle.centerX, z - circle.centerZ);
    if (slack > bestSlack) {
      best = circle;
      bestSlack = slack;
    }
  }
  return { circle: best, slack: bestSlack };
}

/** Empurra um ponto (com raio) para fora de um retângulo, pelo lado mais próximo. */
function pushOutOfBox(state: { x: number; z: number }, box: BoxObstacle, radius: number): void {
  const minX = box.minX - radius;
  const maxX = box.maxX + radius;
  const minZ = box.minZ - radius;
  const maxZ = box.maxZ + radius;
  if (state.x <= minX || state.x >= maxX || state.z <= minZ || state.z >= maxZ) return;
  const exits = [state.x - minX, maxX - state.x, state.z - minZ, maxZ - state.z];
  const smallest = Math.min(...exits);
  if (smallest === exits[0]) state.x = minX;
  else if (smallest === exits[1]) state.x = maxX;
  else if (smallest === exits[2]) state.z = minZ;
  else state.z = maxZ;
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

  // Limite suave: perto da borda, o passo para fora perde força. Usa o círculo
  // com mais folga, então a passagem entre círculos que se sobrepõem fica livre.
  const soft = roomiestCircle(environment.bounds, state.x, state.z);
  const offsetX = state.x - soft.circle.centerX;
  const offsetZ = state.z - soft.circle.centerZ;
  const distance = Math.hypot(offsetX, offsetZ);
  if (distance > 1e-4) {
    const normalX = offsetX / distance;
    const normalZ = offsetZ / distance;
    const outward = state.velocityX * normalX + state.velocityZ * normalZ;
    if (outward > 0) {
      const resistance = smoothstep(soft.circle.radius - config.boundsSoftMargin, soft.circle.radius, distance);
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

  // Paredes: empurra para fora pelo lado mais próximo (desliza ao longo delas).
  for (const wall of environment.walls ?? []) pushOutOfBox(state, wall, config.bodyRadius);

  // Limite rígido: nunca sai da área; volta para a borda do círculo mais próximo.
  const hard = roomiestCircle(environment.bounds, state.x, state.z);
  if (hard.slack < 0) {
    const { centerX, centerZ, radius } = hard.circle;
    const awayX = state.x - centerX;
    const awayZ = state.z - centerZ;
    const away = Math.hypot(awayX, awayZ);
    state.x = centerX + (awayX / away) * radius;
    state.z = centerZ + (awayZ / away) * radius;
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
