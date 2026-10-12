import { test } from "node:test";
import assert from "node:assert/strict";
import { boomOffset, boomPosition, boomReach, thirdPersonConfig } from "./thirdPerson.ts";

// Rodar com: npm test

const vec = () => ({ x: 0, y: 0, z: 0 });
const flat = () => 0;

test("olhando para -Z, a câmera fica atrás (+Z), acima e à direita (+X)", () => {
  const offset = boomOffset(0, 0, vec());
  assert.ok(Math.abs(offset.z - thirdPersonConfig.distance) < 1e-9);
  assert.ok(Math.abs(offset.x - thirdPersonConfig.shoulder) < 1e-9);
  assert.equal(offset.y, thirdPersonConfig.rise);
});

test("olhando para baixo a câmera sobe; para cima, desce", () => {
  assert.ok(boomOffset(0, -0.5, vec()).y > thirdPersonConfig.rise);
  assert.ok(boomOffset(0, 0.5, vec()).y < thirdPersonConfig.rise);
});

test("virando o olhar, a câmera gira junto e continua atrás", () => {
  // Yaw de 90° = olhando para -X: atrás é +X.
  const offset = boomOffset(Math.PI / 2, 0, vec());
  assert.ok(offset.x > 3, "atrás");
  assert.ok(offset.z < 0, "e a direita de quem olha para -X é -Z");
});

test("em campo aberto a câmera vai até o fim", () => {
  const offset = boomOffset(0, 0, vec());
  assert.equal(boomReach(0, 0, offset, []), 1);
  assert.equal(boomReach(0, 0, offset, [{ minX: 20, maxX: 21, minZ: -5, maxZ: 5 }]), 1, "parede longe não conta");
});

test("com uma parede logo atrás, a câmera para antes dela", () => {
  const offset = boomOffset(0, 0, vec());
  const wall = { minX: -5, maxX: 5, minZ: 1.5, maxZ: 1.8 };
  const reach = boomReach(0, 0, offset, [wall]);
  assert.ok(reach < 0.45, `parou em ${reach}`);
  const camera = boomPosition({ x: 0, y: 1.6, z: 0 }, offset, reach, flat, vec());
  assert.ok(camera.z < wall.minZ - thirdPersonConfig.wallMargin + 1e-9, "do lado de cá da parede, com folga");
});

test("a câmera nunca entra no chão", () => {
  // Olhando bem para cima, a câmera iria para baixo da terra.
  const offset = boomOffset(0, 1.2, vec());
  const camera = boomPosition({ x: 0, y: 1.6, z: 0 }, offset, 1, flat, vec());
  assert.ok(camera.y >= thirdPersonConfig.groundClearance - 1e-9);
  // Num barranco atrás dela, sobe com o barranco.
  const level = boomOffset(0, 0, vec());
  const onSlope = boomPosition({ x: 0, y: 1.6, z: 0 }, level, 1, (_x, z) => z * 2, vec());
  assert.ok(onSlope.y > 6);
});

test("com alcance zero a câmera está nos olhos dela: é a 1ª pessoa", () => {
  const offset = boomOffset(0.7, -0.2, vec());
  const camera = boomPosition({ x: 3, y: 1.6, z: -4 }, offset, 0, flat, vec());
  assert.deepEqual(camera, { x: 3, y: 1.6, z: -4 });
});
