import { test } from "node:test";
import assert from "node:assert/strict";
import { pointsOfInterest } from "../../content/pointsOfInterest.ts";
import type { PointOfInterest } from "../../content/types.ts";
import { zones } from "../../content/zones.ts";
import { playerConfig } from "../config/player.ts";
import {
  LABYRINTH,
  LABYRINTH_HALF,
  LABYRINTH_SIZE,
  cellAt,
  cellCenter,
  findMark,
  isInsideLabyrinth,
  isOpenCell,
  labyrinthWallBoxes,
  reachableFrom,
  ringRoute,
  wallRuns,
} from "./labyrinth.ts";

// Rodar com: npm test

const entrance = findMark("E");
const exit = findMark("X");
const chamber = findMark("M");

test("a planta é quadrada e tem uma entrada, uma saída e uma câmara", () => {
  assert.equal(LABYRINTH_SIZE % 2, 1, "lado ímpar: existe uma coluna central");
  assert.equal(entrance.col, (LABYRINTH_SIZE - 1) / 2, "entrada no meio do lado sul");
  assert.equal(exit.col, (LABYRINTH_SIZE - 1) / 2, "saída no meio do lado norte");
  assert.equal(entrance.row, LABYRINTH_SIZE - 1);
  assert.equal(exit.row, 0);
});

test("dá para ir da entrada à saída e até a câmara da lembrança", () => {
  const reachable = reachableFrom(entrance);
  assert.ok(reachable.has(`${exit.row},${exit.col}`), "a saída é alcançável");
  assert.ok(reachable.has(`${chamber.row},${chamber.col}`), "a câmara é alcançável");
});

test("a câmara é escondida: uma entrada só, longe da porta", () => {
  const neighbours = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ].filter(([dr, dc]) => isOpenCell(chamber.row + dr, chamber.col + dc));
  assert.equal(neighbours.length, 1, "um único acesso");
  const steps = Math.abs(chamber.row - entrance.row) + Math.abs(chamber.col - entrance.col);
  assert.ok(steps >= 6, `a câmara fica a ${steps} células da entrada`);
});

test("o corredor em anel é fechado: a ronda da máquina dá a volta", () => {
  const route = ringRoute();
  assert.equal(route.length, 4, "quatro cantos");
  for (const [x, z] of route) {
    const cell = cellAt(x, z);
    assert.ok(isOpenCell(cell.row, cell.col), `canto (${cell.row},${cell.col}) é corredor`);
  }
  // Andando pelo anel de um canto ao outro sem entrar no miolo.
  const corner = cellAt(route[0][0], route[0][1]);
  const reachable = reachableFrom(corner);
  for (const [x, z] of route.slice(1)) {
    const cell = cellAt(x, z);
    assert.ok(reachable.has(`${cell.row},${cell.col}`), "os cantos se ligam");
  }
});

test("o miolo é abrigo, o anel não", () => {
  const [chamberX, chamberZ] = cellCenter(chamber.row, chamber.col);
  assert.equal(isInsideLabyrinth(chamberX, chamberZ), true, "a câmara está no miolo");
  for (const [x, z] of ringRoute()) {
    assert.equal(isInsideLabyrinth(x, z), false, "o anel fica exposto");
  }
  const [entranceX, entranceZ] = cellCenter(entrance.row, entrance.col);
  assert.equal(isInsideLabyrinth(entranceX, entranceZ), false, "a porta não protege ninguém");
});

test("as paredes unidas cobrem exatamente as células de parede", () => {
  const boxes = labyrinthWallBoxes();
  assert.ok(boxes.length < LABYRINTH_SIZE * LABYRINTH_SIZE / 2, `${boxes.length} caixas: bem menos que uma por célula`);

  const inside = (x: number, z: number) =>
    boxes.some((box) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ);
  for (let row = 0; row < LABYRINTH_SIZE; row++) {
    for (let col = 0; col < LABYRINTH_SIZE; col++) {
      const [x, z] = cellCenter(row, col);
      assert.equal(inside(x, z), !isOpenCell(row, col), `célula (${row},${col})`);
    }
  }
});

test("os corredores cabem a Aysha com folga", () => {
  assert.ok(LABYRINTH.cell > playerConfig.bodyRadius * 2 + 1, "passagem larga o bastante para não raspar");
  assert.ok(wallRuns().length > 0);
});

test("as paredes são baixas: a colina continua visível por cima delas", () => {
  // Olhando por cima da parede mais próxima (meio corredor de distância),
  // a linha de visão sobe menos que o ângulo em que o cume aparece.
  const overWall = Math.atan2(LABYRINTH.wallHeight - playerConfig.eyeHeight, LABYRINTH.cell / 2);
  const summit = Math.atan2(120, 640); // altura e distância aproximadas da colina
  assert.ok(overWall < summit, `parede esconde até ${(overWall * 180) / Math.PI}°, colina a ${(summit * 180) / Math.PI}°`);
});

test("os pontos de interesse do labirinto estão em passagens, não em paredes", () => {
  const inZone = Object.entries(pointsOfInterest).filter(([, poi]) => (poi as PointOfInterest).zone === "labyrinth");
  assert.ok(inZone.length >= 4, "o labirinto tem o que explorar");

  for (const [id, entry] of inZone) {
    const poi = entry as PointOfInterest;
    const [x, z] = poi.position;
    const cell = cellAt(x, z);
    const outside = Math.abs(x - LABYRINTH.x) > LABYRINTH_HALF || Math.abs(z - LABYRINTH.z) > LABYRINTH_HALF;
    assert.ok(outside || isOpenCell(cell.row, cell.col), `"${id}" caiu dentro de uma parede`);
  }
});

test("a lembrança do labirinto está na câmara escondida", () => {
  const note = pointsOfInterest.labyrinthNote as PointOfInterest;
  const cell = cellAt(note.position[0], note.position[1]);
  assert.deepEqual({ row: cell.row, col: cell.col }, chamber, "o papel está no centro");
  assert.equal(note.memory?.id, "the-names");
  assert.equal(isInsideLabyrinth(note.position[0], note.position[1]), true, "e a máquina não chega lá");
});

test("a saída norte está bloqueada: o labirinto não leva a lugar nenhum ainda", () => {
  const exitPoi = pointsOfInterest.labyrinthExit as PointOfInterest;
  const cell = cellAt(exitPoi.position[0], exitPoi.position[1]);
  assert.deepEqual({ row: cell.row, col: cell.col }, exit);
  assert.ok((exitPoi.obstacleRadius ?? 0) + playerConfig.bodyRadius > LABYRINTH.cell / 2, "tapa o vão inteiro");
});

test("o labirinto cabe dentro da área explorável da zona", () => {
  const zone = zones.labyrinth;
  const [circle] = zone.bounds;
  const distance = Math.hypot(LABYRINTH.x - circle.center[0], LABYRINTH.z - circle.center[1]);
  assert.ok(distance + LABYRINTH_HALF <= circle.radius + LABYRINTH.cell, "a muralha não fica fora do mundo");
  const [spawnX, , spawnZ] = zone.playerSpawn;
  const spawn = cellAt(spawnX, spawnZ);
  assert.ok(
    spawn.row >= LABYRINTH_SIZE - 1 || isOpenCell(spawn.row, spawn.col),
    "a Aysha não nasce dentro de uma parede",
  );
});
