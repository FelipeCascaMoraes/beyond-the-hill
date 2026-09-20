import { test } from "node:test";
import assert from "node:assert/strict";
import { areaTriggers } from "../../content/areas.ts";
import { pointsOfInterest } from "../../content/pointsOfInterest.ts";
import type { AreaTrigger, PointOfInterest } from "../../content/types.ts";
import { zones } from "../../content/zones.ts";
import { playerConfig } from "../config/player.ts";
import { ascentAt, hillsideBounds, hillsideGrassPatches, hillsideTrailClearings, shelterAt } from "./hillside.ts";
import { CLIMB_PATH, HOLLOW, SUMMIT, terrainHeight } from "./terrain.ts";

// Rodar com: npm test

const bounds = hillsideBounds();

/** Quanto ainda cabe até a borda da área explorável (negativo = fora dela). */
const slack = (x: number, z: number) =>
  Math.max(...bounds.map((circle) => circle.radius - Math.hypot(x - circle.center[0], z - circle.center[1])));

/** Percorre o caminho de metro em metro. */
function walkPath(visit: (x: number, z: number) => void): void {
  for (let i = 0; i < CLIMB_PATH.length - 1; i++) {
    const from = CLIMB_PATH[i];
    const to = CLIMB_PATH[i + 1];
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z));
    for (let s = 0; s <= steps; s++) {
      visit(from.x + ((to.x - from.x) * s) / steps, from.z + ((to.z - from.z) * s) / steps);
    }
  }
}

/**
 * O ponto é visível da posição dada, na altura dos olhos? `above` levanta o
 * alvo do chão — serve para mirar a copa da árvore e não a terra sob ela.
 */
function visibleFrom(fromX: number, fromZ: number, toX: number, toZ: number, above = 0): boolean {
  const eyeY = terrainHeight(fromX, fromZ) + playerConfig.eyeHeight;
  const targetY = terrainHeight(toX, toZ) + above;
  for (let s = 1; s < 160; s++) {
    const t = s / 160;
    const ground = terrainHeight(fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t);
    if (ground > eyeY + (targetY - eyeY) * t + 0.2) return false;
  }
  return true;
}

test("o caminho inteiro cabe na área explorável, com folga para não frear", () => {
  let worst = Infinity;
  walkPath((x, z) => {
    worst = Math.min(worst, slack(x, z));
  });
  // O limite suave começa a freiar a `boundsSoftMargin` da borda: a caminhada
  // mais importante do jogo não pode passar por nenhum estreitamento.
  assert.ok(worst > playerConfig.boundsSoftMargin, `folga mínima de ${worst.toFixed(1)} m na trilha`);
});

test("a subida é íngreme mas caminhável, e a rampa não aplaina a colina", () => {
  // Medida ao longo do caminho, não na direção da colina: boa parte da subida
  // é uma travessia de través, e é isso que a torna possível.
  let steepest = 0;
  let previous: { x: number; z: number; y: number } | null = null;
  walkPath((x, z) => {
    const y = terrainHeight(x, z);
    if (previous) {
      const run = Math.hypot(x - previous.x, z - previous.z);
      if (run > 0) steepest = Math.max(steepest, Math.abs(Math.atan2(y - previous.y, run)));
    }
    previous = { x, z, y };
  });
  assert.ok(steepest < 0.56, `pior inclinação na trilha: ${((steepest * 180) / Math.PI).toFixed(1)}°`);

  // E a rampa é um corte, não uma reforma: no trecho mais bravo da cara da
  // colina, quem sai da trilha encontra a encosta bruta poucos passos ao lado.
  const fallLine = (x: number, z: number) => Math.atan2(terrainHeight(x, z - 8) - terrainHeight(x, z), 8);
  for (const [x, z] of [[-12, -560], [-6, -620]] as const) {
    const onTrail = fallLine(x, z);
    const aside = Math.min(fallLine(x + 60, z), fallLine(x - 60, z));
    assert.ok(
      aside > onTrail + 0.1,
      `em (${x},${z}) a trilha tem ${((onTrail * 180) / Math.PI).toFixed(1)}° e o morro ao lado ${((aside * 180) / Math.PI).toFixed(1)}°`,
    );
  }
});

test("a rampa sobe sempre: nenhum degrau para trás no meio da subida", () => {
  const climbing = CLIMB_PATH.filter((point) => point.y !== undefined);
  const summit = Math.max(...climbing.map((point) => point.y ?? 0));
  let previous = -Infinity;
  for (const point of climbing) {
    const height = point.y ?? 0;
    if (height === summit) break;
    assert.ok(height > previous, `o perfil desce em (${point.x},${point.z})`);
    previous = height;
  }
});

test("a concha só aparece na borda: escondida da subida, entrevista do cume", () => {
  const [floorX, floorZ] = [HOLLOW.x, HOLLOW.z];
  assert.equal(visibleFrom(26, -468, floorX, floorZ), false, "do pé da subida não se vê nada");
  assert.equal(visibleFrom(-12, -560, floorX, floorZ), false, "do meio da encosta, também não");
  assert.equal(visibleFrom(0, 0, floorX, floorZ), false, "e do campo onde a Aysha acorda, muito menos");

  // Do cume aparece um pedaço; inteira, só depois de passar a borda.
  const seenFromSummit = sampleFloor().filter(([x, z]) => visibleFrom(SUMMIT.x, SUMMIT.z, x, z)).length;
  const total = sampleFloor().length;
  assert.ok(seenFromSummit > 0, "debaixo da árvore já dá para desconfiar");
  assert.ok(seenFromSummit < total * 0.6, `do cume se vê ${seenFromSummit}/${total} do fundo — deveria ser só um pedaço`);
  assert.equal(visibleFrom(HOLLOW.x, HOLLOW.z + HOLLOW.radius, floorX, floorZ), true, "da borda, tudo");
});

function sampleFloor(): [number, number][] {
  const points: [number, number][] = [];
  for (let a = 0; a < 12; a++) {
    for (let r = 5; r <= HOLLOW.radius - 5; r += 8) {
      points.push([HOLLOW.x + Math.cos((a * Math.PI) / 6) * r, HOLLOW.z + Math.sin((a * Math.PI) / 6) * r]);
    }
  }
  return points;
}

test("tudo que há para ver na encosta está ao alcance", () => {
  const items = Object.entries(pointsOfInterest).filter(([, poi]) => (poi as PointOfInterest).zone === "hillside");
  assert.ok(items.length >= 6, "a subida tem em que parar");
  for (const [id, entry] of items) {
    const [x, z] = (entry as PointOfInterest).position;
    assert.ok(slack(x, z) > playerConfig.boundsSoftMargin, `"${id}" fica na beira ou fora da área`);
  }

  const triggers = Object.entries(areaTriggers).filter(([, trigger]) => (trigger as AreaTrigger).zone === "hillside");
  assert.ok(triggers.length >= 5, "a caminhada é pontuada");
  for (const [id, entry] of triggers) {
    const [x, z] = (entry as AreaTrigger).center;
    assert.ok(slack(x, z) > 0, `o gatilho "${id}" cairia fora do mundo`);
  }
});

test("a Aysha nasce na crista, de onde a colina inteira aparece", () => {
  const [x, , z] = zones.hillside.playerSpawn;
  assert.ok(slack(x, z) > playerConfig.boundsSoftMargin);
  // A terra do cume some atrás da testa da colina quando se chega perto — a
  // árvore, não: são 26 m de tronco e copa, e é por ela que se sabe para onde ir.
  assert.equal(visibleFrom(x, z, SUMMIT.x, SUMMIT.z, 18), true, "a árvore precisa estar à vista desde o primeiro passo");
  assert.ok(terrainHeight(x, z) < 20, "e ela começa embaixo, não no meio da subida");
});

test("a subida é medida pela altura, e o abrigo pelo fundo da concha", () => {
  assert.equal(ascentAt(terrainHeight(15, -330)), 0, "na crista ainda não se subiu nada");
  assert.equal(ascentAt(terrainHeight(SUMMIT.x, SUMMIT.z)), 1, "no cume, tudo");
  assert.ok(ascentAt(80) > 0.3 && ascentAt(80) < 0.7, "e no meio da encosta, o meio");

  assert.equal(shelterAt(HOLLOW.x, HOLLOW.z), 1, "no fundo da concha não venta");
  assert.equal(shelterAt(HOLLOW.x, HOLLOW.z + HOLLOW.radius), 0, "na borda, venta");
  assert.equal(shelterAt(SUMMIT.x, SUMMIT.z), 0, "no cume, muito");
});

test("a grama rareia com a altura e volta na concha", () => {
  const patches = hillsideGrassPatches();
  assert.ok(patches.length >= 6, "meio quilômetro não cabe numa mancha só");

  const byHeight = patches.map((patch) => ({ y: terrainHeight(patch.x, patch.z), density: patch.density }));
  const low = byHeight.reduce((a, b) => (a.y < b.y ? a : b));
  const high = byHeight.reduce((a, b) => (a.y > b.y ? a : b));
  assert.ok(high.density < low.density * 0.6, "em cima sobra pedra e vento");

  const hollow = patches.reduce((a, b) => (shelterAt(a.x, a.z) > shelterAt(b.x, b.z) ? a : b));
  assert.ok(hollow.density > high.density, "dentro da concha a grama cresce de novo");
});

test("a trilha aberta na grama é contínua do começo ao fim", () => {
  const clearings = hillsideTrailClearings();
  for (let i = 1; i < clearings.length; i++) {
    const gap = Math.hypot(clearings[i].x - clearings[i - 1].x, clearings[i].z - clearings[i - 1].z);
    assert.ok(gap < clearings[i].radius * 2, `buraco de ${gap.toFixed(1)} m na trilha`);
  }
});
