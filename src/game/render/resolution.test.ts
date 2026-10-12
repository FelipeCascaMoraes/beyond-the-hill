import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_DPR,
  createResolutionMonitor,
  resolutionAt,
  resolutionCeiling,
  sampleResolution,
  type ResolutionMonitor,
} from "./resolution.ts";

// Rodar com: npm test

const high = { maxDpr: 1.5, pixelBudget: 5_000_000 };
const low = { maxDpr: 1.25, pixelBudget: 2_300_000 };

/** Roda `seconds` de jogo a um FPS fixo e conta quantas vezes o degrau mudou. */
function run(monitor: ResolutionMonitor, fps: number, seconds: number): number {
  let changes = 0;
  for (let i = 0; i < fps * seconds; i++) if (sampleResolution(monitor, 1 / fps)) changes++;
  return changes;
}

test("um monitor 1080p comum desenha em resolução nativa", () => {
  assert.equal(resolutionCeiling(1920, 1080, 1, high), 1);
  assert.equal(resolutionCeiling(1920, 1080, 1, low), 1);
});

test("o teto de pixels segura monitores grandes, e mais nas máquinas fracas", () => {
  const fourK = resolutionCeiling(2560, 1440, 1.5, high);
  assert.ok(fourK < 1.5 && fourK > 1, "4K a 150% não desenha os 8 milhões de pixels inteiros");
  assert.ok(2560 * 1440 * fourK * fourK <= high.pixelBudget + 1);
  assert.ok(resolutionCeiling(2560, 1440, 1, low) < 1, "vídeo integrado num monitor 1440p desce do nativo");
  assert.equal(resolutionCeiling(3840, 2160, 1, low), MIN_DPR, "mas nunca abaixo do piso");
});

test("a 60 FPS nada muda", () => {
  const monitor = createResolutionMonitor();
  assert.equal(run(monitor, 60, 60), 0);
  assert.equal(monitor.level, 0);
});

test("lento por alguns segundos: desce um degrau, e fica se adiantou", () => {
  const monitor = createResolutionMonitor();
  assert.equal(run(monitor, 38, 3), 1);
  assert.equal(monitor.level, 1);
  assert.equal(resolutionAt(monitor, 1.5), 1.27);
  // Com menos pixels o jogo passou a correr: o degrau fica.
  assert.equal(run(monitor, 55, 20), 0);
  assert.equal(monitor.level, 1);
});

test("continua lento mesmo com menos pixels: segue descendo até o piso", () => {
  const monitor = createResolutionMonitor();
  let fps = 20;
  for (let i = 0; i < 12; i++) {
    if (run(monitor, fps, 3)) fps *= 1.15;
  }
  assert.equal(monitor.level, 3);
  assert.equal(resolutionAt(monitor, 1), MIN_DPR, "o fator final nunca passa do piso");
});

test("se descer não adianta, a resolução volta e o ajuste descansa", () => {
  const monitor = createResolutionMonitor();
  // Travado em 30 FPS por outra coisa (economia de energia, processador).
  run(monitor, 30, 8);
  assert.equal(monitor.level, 0, "devolveu a nitidez");
  assert.equal(run(monitor, 30, 30), 0, "e não fica tentando de novo");
});

test("um tranco isolado não derruba a resolução", () => {
  const monitor = createResolutionMonitor();
  run(monitor, 60, 5);
  assert.equal(sampleResolution(monitor, 0.6), false);
  run(monitor, 60, 5);
  assert.equal(monitor.level, 0);
});

test("com folga sobrando ela volta a subir, mas não fica oscilando", () => {
  const monitor = createResolutionMonitor();
  run(monitor, 38, 3);
  run(monitor, 60, 3);
  assert.equal(monitor.level, 1);
  // Folga longa: sobe de volta.
  run(monitor, 60, 12);
  assert.equal(monitor.level, 0);
  // Subiu e ficou lento de novo, duas vezes: desiste de subir.
  for (let round = 0; round < 3; round++) {
    run(monitor, 38, 3);
    run(monitor, 60, 14);
  }
  run(monitor, 38, 3);
  run(monitor, 60, 60);
  assert.ok(monitor.level >= 1, "ficou no degrau que a máquina aguenta");
});
