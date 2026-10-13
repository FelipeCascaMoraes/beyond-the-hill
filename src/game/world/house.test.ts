import { test } from "node:test";
import assert from "node:assert/strict";
import { areaTriggers } from "../../content/areas.ts";
import type { DialogueId } from "../../content/dialogues.ts";
import type { StoryFlag } from "../../content/story.ts";
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
  const context = (seenDialogues: readonly DialogueId[] = [], flags: readonly StoryFlag[] = []) => ({
    flags,
    seenDialogues,
    recoveredMemories: [],
  });
  assert.equal(areaTriggerAt(areaTriggers, "arrival", 0, 0, context()), null);
  assert.equal(areaTriggerAt(areaTriggers, "arrival", HOUSE.x + 5, HOUSE.z, context()), "house-approach");
  assert.equal(areaTriggerAt(areaTriggers, "arrival", HOUSE.x + 5, HOUSE.z, context(["house-approach"])), null);

  // Um lugar com condição fica calado até a história chegar nele.
  const guides = areaTriggers["guides-again"];
  const [gx, gz] = guides.center;
  assert.equal(areaTriggerAt(areaTriggers, "arrival", gx, gz, context()), null, "antes da caçada, não diz nada");
  assert.equal(areaTriggerAt(areaTriggers, "arrival", gx, gz, context([], ["hunt-began"])), "guides-again");
});

test("da casa até a porteira, os guias e o despertar, a Aysha não empaca na borda do campo", async () => {
  const { playerConfig } = await import("../config/player.ts");
  const { createPlayerState, updatePlayer } = await import("../player/playerController.ts");
  const { getPlayerEnvironment } = await import("../player/spawn.ts");
  const environment = getPlayerEnvironment("arrival", { flags: [], seenDialogues: [], recoveredMemories: [] });
  const doorX = HOUSE.x + HOUSE.width / 2 + 1;
  // Da porta e das duas quinas do lado do campo, andando sempre de frente para o destino.
  const starts: (readonly [number, number])[] = [
    [doorX, HOUSE.z],
    [doorX, HOUSE.z - HOUSE.depth / 2 - 1],
    [doorX, HOUSE.z + HOUSE.depth / 2 + 1],
  ];
  const targets: (readonly [number, number])[] = [pointsOfInterest.gate.position, [-2, -10], [0, 0]];
  const dt = 1 / 60;
  for (const [startX, startZ] of starts) {
    for (const [targetX, targetZ] of targets) {
      const player = createPlayerState({ x: startX, z: startZ, eyeY: 0, yaw: 0, pitch: 0 });
      let slow = 0;
      for (let time = 0; time < 12; time += dt) {
        player.yaw = player.targetYaw = Math.atan2(-(targetX - player.x), -(targetZ - player.z));
        const beforeX = player.x;
        const beforeZ = player.z;
        updatePlayer(player, { forward: 1, strafe: 0, lookDeltaX: 0, lookDeltaY: 0 }, dt, environment, playerConfig);
        const speed = Math.hypot(player.x - beforeX, player.z - beforeZ) / dt;
        slow = time > 0.6 && speed < playerConfig.walkSpeed * 0.35 ? slow + dt : 0;
        assert.ok(slow < 1, `quase parada em (${player.x.toFixed(1)}, ${player.z.toFixed(1)}), indo de (${startX}, ${startZ}) para (${targetX}, ${targetZ})`);
      }
    }
  }
});
