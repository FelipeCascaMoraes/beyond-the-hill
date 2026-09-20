import { test } from "node:test";
import assert from "node:assert/strict";
import { machines } from "../../content/machines.ts";
import { npcs } from "../../content/npcs.ts";
import type { DialogueId } from "../../content/dialogues.ts";
import type { StoryFlag } from "../../content/story.ts";
import type { MachineDefinition, NpcDefinition } from "../../content/types.ts";
import { isPresent } from "./presence.ts";
import { meetsRequirement, type StoryContext } from "./requirements.ts";
import { worldMoodOf } from "./worldMood.ts";

// Rodar com: npm test

const context = (flags: readonly StoryFlag[] = [], seenDialogues: readonly DialogueId[] = []): StoryContext => ({
  flags,
  seenDialogues,
  recoveredMemories: [],
});

test("chegar e ir embora: as duas condições de uma presença", () => {
  const thing = { requires: { flags: ["first-memory"] }, leavesWhen: { flags: ["they-lied"] } } as const;
  assert.equal(isPresent(thing, context()), false, "ainda não chegou");
  assert.equal(isPresent(thing, context(["first-memory"])), true);
  assert.equal(isPresent(thing, context(["first-memory", "they-lied"])), false, "foi embora");

  // Sem condição nenhuma, está sempre lá.
  assert.equal(isPresent({}, context()), true);
});

test("os dois somem do campo no instante em que a Aysha entende quem são", () => {
  const before = context(["met-guides", "guides-known", "own-death"]);
  const after = context([...before.flags, "they-lied"]);
  for (const id of ["cassandra", "victor"] as const) {
    assert.equal(isPresent(npcs[id], before), true, `${id} ainda espera na trilha`);
    assert.equal(isPresent(npcs[id], after), false, `${id} não está mais lá`);
  }
});

test("o campo perde também a máquina, e sobra uma só no jogo inteiro", () => {
  const hunting = context(["first-memory"]);
  const after = context(["first-memory", "they-lied"]);

  const all: MachineDefinition[] = Object.values(machines);
  assert.equal(isPresent(machines["field-sentinel"], hunting), true);
  assert.equal(isPresent(machines["field-sentinel"], after), false, "não há mais o que vigiar");
  assert.equal(isPresent(machines["labyrinth-warden"] as MachineDefinition, after), true, "a do labirinto continua: é a última");

  const remaining = all.filter((machine) => isPresent(machine, after));
  assert.equal(remaining.length, 1, "de duas máquinas sobra uma");
});

test("nenhuma máquina na encosta: a subida é a única zona sem ameaça", () => {
  const allMachines: MachineDefinition[] = Object.values(machines);
  assert.equal(allMachines.filter((machine) => machine.zone === "hillside").length, 0);
  const allNpcs: NpcDefinition[] = Object.values(npcs);
  assert.equal(allNpcs.filter((npc) => npc.zone === "hillside").length, 0, "nem ninguém para conversar");
});

test("as últimas conversas com os dois cabem antes de eles sumirem", () => {
  // Reconhecidos (lembrança "the-two"), a conta ainda não fechada.
  const window = context(["met-guides", "hill-familiar", "saw-them-again", "guides-known"]);
  for (const id of ["cassandra", "victor"] as const) {
    assert.equal(isPresent(npcs[id], window), true, `${id} ainda está lá para a última conversa`);
    const last = npcs[id].conversation.find(
      (entry) => typeof entry !== "string" && entry.dialogue === `${id}-after-truth`,
    );
    assert.ok(last && typeof last !== "string" && meetsRequirement(last.requires, window), `"${id}-after-truth" ficaria inalcançável`);
  }
});

test("o clima do mundo vira uma vez só, e é a mentira que o vira", () => {
  assert.equal(worldMoodOf(context()), "idle");
  assert.equal(worldMoodOf(context(["own-death"])), "idle", "lembrar da própria morte não basta");
  assert.equal(worldMoodOf(context(["own-death", "they-lied"])), "calling");
});
