import { test } from "node:test";
import assert from "node:assert/strict";
import type { PlayerConfig } from "../config/player.ts";
import { createPlayerState, headBobOffset, lookAngles, updatePlayer, type PlayerEnvironment, type PlayerInput } from "./playerController.ts";

// Rodar com: npm test

const config: PlayerConfig = {
  eyeHeight: 1.6,
  walkSpeed: 2,
  runSpeed: 4,
  acceleration: 6,
  deceleration: 8,
  lookSensitivity: 0.002,
  lookSmoothing: 1000,
  maxPitch: 1.2,
  groundSmoothing: 1000,
  boundsSoftMargin: 2,
  bodyRadius: 0.3,
  // Sem penalidade de subida por padrão: quem for testar a encosta troca isto.
  climb: { easySlope: 0.14, hardSlope: 0.52, minFactor: 1 },
  headBob: { amplitude: 0.02, stepsPerMeter: 1 },
};

const flat: PlayerEnvironment = {
  heightAt: () => 0,
  bounds: [{ centerX: 0, centerZ: 0, radius: 10 }],
};

const idle: PlayerInput = { forward: 0, strafe: 0, lookDeltaX: 0, lookDeltaY: 0 };
const forward: PlayerInput = { ...idle, forward: 1 };
const DT = 1 / 60;

test("correr é mais rápido que caminhar, e para na velocidade de corrida", () => {
  const walking = simulate(2, forward);
  const running = simulate(2, { ...forward, run: true });
  const walked = Math.hypot(walking.x, walking.z);
  const ran = Math.hypot(running.x, running.z);
  assert.ok(ran > walked, `correndo ${ran.toFixed(2)} m, andando ${walked.toFixed(2)} m`);
  assert.ok(Math.hypot(running.velocityX, running.velocityZ) <= config.runSpeed + 1e-6);
});

// ── Subir custa ───────────────────────────────────────────────────────────
// A encosta da colina tem uns 27° o caminho inteiro. Sem penalidade nenhuma a
// Aysha a venceria no mesmo passo do campo plano, e a subida viraria uma
// esteira; com ela, a trilha cavada é naturalmente o caminho mais rápido.

/** Configuração com a penalidade de subida ligada, como a do jogo. */
const climbing: PlayerConfig = { ...config, climb: { easySlope: 0.14, hardSlope: 0.52, minFactor: 0.6 } };

/** Uma rampa de inclinação constante subindo na direção -Z. */
const ramp = (degrees: number): PlayerEnvironment => ({
  heightAt: (_x, z) => -z * Math.tan((degrees * Math.PI) / 180),
  bounds: [{ centerX: 0, centerZ: -500, radius: 600 }],
});

function distance(seconds: number, input: PlayerInput, environment: PlayerEnvironment, withConfig: PlayerConfig) {
  const player = createPlayerState({ x: 0, z: 0, eyeY: withConfig.eyeHeight, yaw: 0, pitch: 0 });
  for (let i = 0; i < seconds / DT; i++) updatePlayer(player, input, DT, environment, withConfig);
  return Math.hypot(player.x, player.z);
}

test("subir encurta o passo, sem nunca travar a Aysha", () => {
  const onFlat = distance(3, forward, flat, climbing);
  const uphill = distance(3, forward, ramp(27), climbing);
  assert.ok(uphill < onFlat * 0.8, `subindo ${uphill.toFixed(2)} m contra ${onFlat.toFixed(2)} m no plano`);
  assert.ok(uphill > onFlat * climbing.climb.minFactor * 0.9, "mas ela continua subindo, e não a passo de tartaruga");
});

test("ladeira de menos de 8° não muda nada, e descer não acelera", () => {
  const onFlat = distance(3, forward, flat, climbing);
  assert.ok(Math.abs(distance(3, forward, ramp(6), climbing) - onFlat) < 0.02, "o campo ondulado anda igual");
  assert.ok(distance(3, forward, ramp(-27), climbing) <= onFlat + 1e-6, "a Aysha não dispara morro abaixo");
});

test("andar de través na encosta não é penalizado", () => {
  // Olhando para -Z numa rampa que sobe para -Z, andar de lado é curva de nível.
  const across = { ...idle, strafe: 1 };
  assert.ok(Math.abs(distance(2, across, ramp(27), climbing) - distance(2, across, flat, climbing)) < 0.02);
});

function simulate(seconds: number, input: PlayerInput, environment = flat) {
  const player = createPlayerState({ x: 0, z: 0, eyeY: config.eyeHeight, yaw: 0, pitch: 0 });
  for (let i = 0; i < seconds / DT; i++) updatePlayer(player, input, DT, environment, config);
  return player;
}

test("W anda para frente (-Z) na velocidade de caminhada", () => {
  const player = simulate(2, { ...idle, forward: 1 });
  assert.ok(player.z < -2.5, `z = ${player.z}`);
  assert.ok(Math.abs(player.x) < 1e-6);
  assert.ok(Math.abs(Math.hypot(player.velocityX, player.velocityZ) - config.walkSpeed) < 0.01);
});

test("D anda para a direita (+X)", () => {
  const player = simulate(1, { ...idle, strafe: 1 });
  assert.ok(player.x > 0.5);
  assert.ok(Math.abs(player.z) < 1e-6);
});

test("diagonal não é mais rápida que andar reto", () => {
  const player = simulate(2, { ...idle, forward: 1, strafe: 1 });
  assert.ok(Math.hypot(player.velocityX, player.velocityZ) <= config.walkSpeed + 1e-6);
});

test("para suavemente ao soltar as teclas", () => {
  const player = simulate(2, { ...idle, forward: 1 });
  updatePlayer(player, idle, DT, flat, config);
  const speedAfterOneFrame = Math.hypot(player.velocityX, player.velocityZ);
  assert.ok(speedAfterOneFrame > 0.5 && speedAfterOneFrame < config.walkSpeed);
  for (let i = 0; i < 120; i++) updatePlayer(player, idle, DT, flat, config);
  assert.ok(Math.hypot(player.velocityX, player.velocityZ) < 0.01);
});

test("nunca sai da área explorável", () => {
  const player = simulate(30, { ...idle, forward: 1 });
  assert.ok(Math.hypot(player.x, player.z) <= flat.bounds[0].radius + 1e-9);
});

test("olhos acompanham a altura do terreno", () => {
  const slope: PlayerEnvironment = { ...flat, heightAt: (x) => x * 0.5 };
  const player = simulate(2, { ...idle, strafe: 1 }, slope);
  assert.ok(Math.abs(player.eyeY - (player.x * 0.5 + config.eyeHeight)) < 0.01);
});

test("mouse para a direita gira para a direita e o pitch tem limite", () => {
  const player = createPlayerState({ x: 0, z: 0, eyeY: 1.6, yaw: 0, pitch: 0 });
  updatePlayer(player, { ...idle, lookDeltaX: 100, lookDeltaY: -100000 }, DT, flat, config);
  assert.ok(player.yaw < 0);
  assert.equal(player.targetPitch, config.maxPitch);
});

test("lookAngles aponta para o alvo", () => {
  const { yaw, pitch } = lookAngles(0, 0, 0, 10, 0, 0);
  assert.ok(Math.abs(yaw + Math.PI / 2) < 1e-9);
  assert.equal(pitch, 0);
});

test("balanço do passo é zero parado", () => {
  const player = createPlayerState({ x: 0, z: 0, eyeY: 1.6, yaw: 0, pitch: 0 });
  assert.equal(headBobOffset(player, config), 0);
});

test("não atravessa obstáculos e desliza pela lateral", () => {
  const withObstacle: PlayerEnvironment = { ...flat, obstacles: [{ x: 0.1, z: -3, radius: 0.45 }] };
  const player = simulate(4, { ...idle, forward: 1 }, withObstacle);
  const separation = Math.hypot(player.x - 0.1, player.z + 3);
  assert.ok(separation >= 0.45 + config.bodyRadius - 1e-9, `separação ${separation}`);
  assert.ok(player.z < -3, "deslizou e passou pelo obstáculo");
});

test("área em dois círculos: passa pela sobreposição e não sai do segundo", () => {
  // Campo (raio 10 na origem) + área lateral (raio 5 em z = -13): sobrepostos entre z -8 e -10.
  const twoAreas: PlayerEnvironment = {
    heightAt: () => 0,
    bounds: [
      { centerX: 0, centerZ: 0, radius: 10 },
      { centerX: 0, centerZ: -13, radius: 5 },
    ],
  };
  const player = simulate(20, { ...idle, forward: 1 }, twoAreas);
  assert.ok(player.z < -12, `chegou à área lateral (z = ${player.z})`);
  assert.ok(Math.hypot(player.x, player.z + 13) <= 5 + 1e-9, "não sai do segundo círculo");
});

test("paredes bloqueiam e deixam deslizar", () => {
  const withWall: PlayerEnvironment = { ...flat, walls: [{ minX: -2, maxX: 2, minZ: -3.1, maxZ: -2.9 }] };
  const blocked = simulate(3, { ...idle, forward: 1 }, withWall);
  assert.ok(blocked.z >= -2.9 + config.bodyRadius - 1e-9, `parou antes da parede (z = ${blocked.z})`);
  const sliding = simulate(4, { ...idle, forward: 1, strafe: 1 }, withWall);
  assert.ok(sliding.x > 2 && sliding.z < -3.1, "contornou a ponta da parede");
});
