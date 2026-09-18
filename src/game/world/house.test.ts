import { test } from "node:test";
import assert from "node:assert/strict";
import { areaTriggers } from "../../content/areas.ts";
import { pointsOfInterest } from "../../content/pointsOfInterest.ts";
import { zones } from "../../content/zones.ts";
import { areaTriggerAt } from "../story/areaTriggers.ts";
import { HOUSE, HOUSE_DOOR, houseWallBoxes, isInsideHouse } from "./house.ts";

// Rodar com: npm test

const houseItems = [pointsOfInterest.houseDrawing, pointsOfInterest.houseTable, pointsOfInterest.houseHorse, pointsOfInterest.houseWindow];

test("os objetos da casa ficam dentro dela (ou na janela)", () => {
  for (const item of houseItems) {
    const [x, z] = item.position;
    const onWindowWall = Math.abs(z - (HOUSE.z - HOUSE.depth / 2)) < 0.15;
    assert.ok(isInsideHouse(x, z) || onWindowWall, `${item.dialogue} em (${x}, ${z})`);
  }
});

test("a porta deixa a Aysha passar (vão maior que o corpo)", () => {
  const boxes = houseWallBoxes();
  const doorX = HOUSE.x + HOUSE.width / 2;
  const blocking = boxes.filter((box) => box.minX <= doorX && box.maxX >= doorX);
  const doorCenterZ = HOUSE.z + HOUSE_DOOR.z;
  const northEdge = Math.max(...blocking.filter((box) => box.maxZ < doorCenterZ).map((box) => box.maxZ));
  const southEdge = Math.min(...blocking.filter((box) => box.minZ > doorCenterZ).map((box) => box.minZ));
  assert.ok(southEdge - northEdge > 2 * 0.3 + 0.2, `vão de ${(southEdge - northEdge).toFixed(2)} m`);
});

test("a casa está dentro da área explorável da zona", () => {
  const houseArea = zones.arrival.bounds.some(
    ({ center, radius }) => Math.hypot(HOUSE.x - center[0], HOUSE.z - center[1]) + Math.hypot(HOUSE.width, HOUSE.depth) / 2 < radius,
  );
  assert.ok(houseArea);
});

test("gatilho de área: dispara dentro do raio, uma vez", () => {
  assert.equal(areaTriggerAt(areaTriggers, "arrival", 0, 0, []), null);
  assert.equal(areaTriggerAt(areaTriggers, "arrival", HOUSE.x + 5, HOUSE.z, []), "house-approach");
  assert.equal(areaTriggerAt(areaTriggers, "arrival", HOUSE.x + 5, HOUSE.z, ["house-approach"]), null);
});
