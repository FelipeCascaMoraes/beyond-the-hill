import { test } from "node:test";
import assert from "node:assert/strict";
import { areaTriggers } from "../../content/areas.ts";
import { cinematics } from "../../content/cinematics.ts";
import { guidePassages, guideSteps, type GuideStepId } from "../../content/guide.ts";
import type { DialogueId } from "../../content/dialogues.ts";
import type { MemoryId } from "../../content/memories.ts";
import { storyFlags, type StoryFlag } from "../../content/story.ts";
import type { GuideStep, GuideTarget } from "../../content/types.ts";
import { zones } from "../../content/zones.ts";
import type { StoryContext } from "../story/requirements.ts";
import { arrowAngle, currentGuide, currentStep, pointAhead, resolveTarget } from "./guide.ts";

// Rodar com: npm test

const context = (
  flags: readonly StoryFlag[] = [],
  recoveredMemories: readonly MemoryId[] = [],
  seenDialogues: readonly DialogueId[] = [],
): StoryContext => ({ flags, recoveredMemories, seenDialogues });

test("o roteiro segue a história, um passo de cada vez", () => {
  const journey: [StoryContext, GuideStepId | null][] = [
    [context(), "meet-guides"],
    [context(["met-guides"]), "look-around"],
    [context(["met-guides", "hill-familiar"]), "gate"],
    [context(["met-guides", "hill-familiar", "first-memory"], ["childhood-ride"]), "house"],
    [context(["met-guides", "hill-familiar", "first-memory", "found-drawing"], ["childhood-ride"]), "toy-horse"],
    [context(["met-guides", "hill-familiar", "first-memory", "found-drawing"], ["childhood-ride", "parents-night"]), "labyrinth-note"],
    [context([...storyFlags], ["childhood-ride", "parents-night", "the-names", "the-two", "after", "whole"]), null],
  ];
  for (const [state, expected] of journey) assert.equal(currentStep(guideSteps, state), expected);
});

test("em outra zona, o roteiro diz por onde ir", () => {
  const state = context(["met-guides", "hill-familiar", "first-memory", "found-drawing"], ["childhood-ride", "parents-night"]);
  assert.equal(currentGuide(guideSteps, guidePassages, "arrival", state)?.title, "Abra a porteira no fim da trilha");
  assert.equal(currentGuide(guideSteps, guidePassages, "labyrinth", state)?.title, guideSteps["labyrinth-note"].title);

  // De volta ao campo com o papel lido — e, se ela ainda estiver no labirinto, o caminho de volta.
  const after = context([...state.flags, "hunt-began"], [...state.recoveredMemories, "the-names"]);
  assert.equal(currentGuide(guideSteps, guidePassages, "labyrinth", after)?.title, "Volte para o campo");
  assert.equal(currentGuide(guideSteps, guidePassages, "arrival", after)?.title, guideSteps["see-them-again"].title);
});

test("a contagem dos pontos examinados para em 3", () => {
  const flags = ["met-guides"] as const;
  assert.deepEqual(currentGuide(guideSteps, guidePassages, "arrival", context(flags))?.tally, { done: 0, of: 3 });
  const seen = ["poi-horseshoe", "poi-fence", "poi-cairn", "poi-flowers"] as const;
  assert.deepEqual(currentGuide(guideSteps, guidePassages, "arrival", context(flags, [], seen))?.tally, { done: 3, of: 3 });
});

test("a seta dos pontos de interesse pula o que já foi examinado", () => {
  const target = guideSteps["look-around"].target;
  const nearest = resolveTarget(target, 0, 0, context());
  assert.ok(nearest);
  const point = target.points.find(({ position }) => position[0] === nearest.x && position[1] === nearest.z);
  assert.ok(point);
  const next = resolveTarget(target, 0, 0, context([], [], [point.dialogue]));
  assert.ok(next && (next.x !== nearest.x || next.z !== nearest.z), "aponta para outro");
  assert.ok(next.distance >= nearest.distance);
});

/** Um alvo pode ficar na beira da zona: basta estar ao alcance da mão de quem está dentro. */
const REACH = 2;

const inBounds = (zone: keyof typeof zones, x: number, z: number): boolean =>
  zones[zone].bounds.some(({ center, radius }) => Math.hypot(x - center[0], z - center[1]) <= radius + REACH);

const targetPoints = (target: GuideTarget): (readonly [number, number])[] => {
  if (target.type === "point") return [target.position];
  if (target.type === "any") return target.points.map(({ position }) => position);
  return target.path.map(({ x, z }) => [x, z] as const);
};

test("toda seta aponta para dentro da zona do passo", () => {
  for (const [id, step] of Object.entries<GuideStep>(guideSteps)) {
    for (const [x, z] of step.target ? targetPoints(step.target) : []) {
      assert.ok(inBounds(step.zone, x, z), `"${id}" aponta para fora de "${step.zone}" (${x}, ${z})`);
    }
  }
  for (const passage of guidePassages) {
    assert.ok(inBounds(passage.from, passage.position[0], passage.position[1]), `passagem "${passage.title}" fora de "${passage.from}"`);
  }
});

test("toda zona de um passo é alcançável de onde a Aysha pode estar", () => {
  // Da encosta não se volta: os passos de lá são os últimos.
  const order = Object.values<GuideStep>(guideSteps).map((step) => step.zone);
  assert.ok(order.lastIndexOf("arrival") < order.indexOf("hillside"), "nenhum passo no campo depois da colina");
  for (const from of ["arrival", "labyrinth"] as const) {
    for (const to of ["arrival", "labyrinth", "hillside"] as const) {
      if (from === to) continue;
      assert.ok(guidePassages.some((passage) => passage.from === from && (passage.to as readonly string[]).includes(to)), `${from} → ${to}`);
    }
  }
});

test("a trilha da colina leva a seta até os gatilhos do cume, da concha e do reencontro", () => {
  const within = (x: number, z: number, center: readonly [number, number], radius: number) => Math.hypot(x - center[0], z - center[1]) < radius;
  const end = (target: GuideTarget | undefined) => {
    assert.ok(target?.type === "trail");
    return target.path[target.path.length - 1];
  };
  const summit = end(guideSteps.climb.target);
  assert.ok(within(summit.x, summit.z, areaTriggers["hillside-summit"].center, areaTriggers["hillside-summit"].radius));
  const refuge = end(guideSteps.refuge.target);
  assert.ok(within(refuge.x, refuge.z, cinematics.reunion.trigger.center, cinematics.reunion.trigger.radius));
  // E o caminho passa por dentro do gatilho da concha.
  const hollow = areaTriggers["hillside-hollow"];
  const path = guideSteps["over-the-top"].target.path;
  assert.ok(path.some(({ x, z }) => within(x, z, hollow.center, hollow.radius)));
});

test("ponto adiante no caminho: anda pelas curvas e para no fim", () => {
  const path = [
    { x: 0, z: 0 },
    { x: 0, z: -10 },
    { x: 10, z: -10 },
  ];
  assert.deepEqual(pointAhead(path, 1, -4, 3), { x: 0, z: -7, distance: 16 });
  assert.deepEqual(pointAhead(path, 1, -4, 10), { x: 4, z: -10, distance: 16 });
  assert.deepEqual(pointAhead(path, 8, -11, 30), { x: 10, z: -10, distance: 2 });
});

test("a seta: em frente, à esquerda, à direita e atrás", () => {
  const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
  // Olhando para -Z (yaw 0).
  close(arrowAngle(0, 0, 0, 0, -10), 0);
  close(arrowAngle(0, 0, 0, -10, 0), -Math.PI / 2);
  close(arrowAngle(0, 0, 0, 10, 0), Math.PI / 2);
  close(Math.abs(arrowAngle(0, 0, 0, 0, 10)), Math.PI);
  // Virada para a esquerda (-X): o que estava à esquerda fica em frente.
  close(arrowAngle(0, 0, Math.PI / 2, -10, 0), 0);
});
