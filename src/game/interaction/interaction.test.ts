import { test } from "node:test";
import assert from "node:assert/strict";
import { registerInteractionHandler, runInteraction } from "./actions.ts";
import { FOCUS_HYSTERESIS, findFocus, type Viewer } from "./focus.ts";
import { getInteractables, registerInteractable } from "./registry.ts";
import type { InteractableDefinition, InteractableEntry } from "./types.ts";

// Rodar com: npm test

const entry = (definition: Partial<InteractableDefinition> & { id: string }, x: number, y: number, z: number): InteractableEntry => ({
  definition: { prompt: "Interagir", action: { type: "event", event: "teste" }, ...definition },
  position: { x, y, z },
  used: false,
});

/** Olhos na origem olhando para -Z. */
const viewer: Viewer = { position: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } };

test("foca o objeto mirado dentro do alcance", () => {
  const target = entry({ id: "a" }, 0, 0, -2);
  assert.equal(findFocus([target], viewer, null), target);
});

test("ignora objeto fora do alcance, atrás ou fora da mira", () => {
  const far = entry({ id: "longe", reach: 2 }, 0, 0, -3);
  const behind = entry({ id: "atras" }, 0, 0, 1);
  const aside = entry({ id: "lado", targetRadius: 0.5 }, 1, 0, -2);
  assert.equal(findFocus([far, behind, aside], viewer, null), null);
});

test("entre dois mirados, escolhe o mais próximo", () => {
  const near = entry({ id: "perto" }, 0, 0, -1);
  const farther = entry({ id: "longe" }, 0.1, 0, -2);
  assert.equal(findFocus([farther, near], viewer, null), near);
});

test("proximidade não exige mira, mas perde para um objeto mirado", () => {
  const npc = entry({ id: "npc", mode: "proximity", reach: 3 }, 2, 0, 1);
  assert.equal(findFocus([npc], viewer, null), npc);
  const looked = entry({ id: "objeto" }, 0, 0, -2);
  assert.equal(findFocus([npc, looked], viewer, null), looked);
});

test("desligado ou já usado não recebe foco", () => {
  const disabled = entry({ id: "off", enabled: false }, 0, 0, -1);
  const used = { ...entry({ id: "usado" }, 0, 0, -1), used: true };
  assert.equal(findFocus([disabled, used], viewer, null), null);
});

test("histerese mantém o foco atual perto do limite", () => {
  const edge = entry({ id: "borda", reach: 2 }, 0, 0, -2 * (1 + (FOCUS_HYSTERESIS - 1) / 2));
  assert.equal(findFocus([edge], viewer, null), null);
  assert.equal(findFocus([edge], viewer, "borda"), edge);
});

test("runInteraction chama o handler do tipo e respeita `once`", () => {
  const calls: string[] = [];
  const remove = registerInteractionHandler("event", (action) => calls.push(action.event));
  const target = entry({ id: "unico", once: true }, 0, 0, -1);
  assert.equal(runInteraction(target), true);
  assert.deepEqual(calls, ["teste"]);
  assert.equal(target.used, true);
  remove();
});

test("runInteraction sem handler retorna false", () => {
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    assert.equal(runInteraction(entry({ id: "sem", action: { type: "scene", scene: "x" } }, 0, 0, -1)), false);
  } finally {
    console.warn = warn;
  }
});

test("registro adiciona e remove interativos", () => {
  const target = entry({ id: "reg" }, 0, 0, -1);
  const unregister = registerInteractable("reg", target);
  assert.ok([...getInteractables()].includes(target));
  unregister();
  assert.ok(![...getInteractables()].includes(target));
});
