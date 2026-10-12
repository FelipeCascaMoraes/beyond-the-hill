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

  // Na encosta só há gente no refúgio, e só depois da subida: os pais, que
  // aparecem no reencontro e ficam, e os dois, que voltam só para o fim.
  // A subida em si continua sem ninguém para conversar.
  const onHill = (Object.keys(npcs) as (keyof typeof npcs)[]).filter((id) => npcs[id].zone === "hillside");
  assert.deepEqual(onHill.sort(), ["cassandra-refuge", "father", "mother", "victor-refuge"]);
  const climbing = context(["they-lied", "hill-reached", "hill-climbed", "refuge-seen"]);
  for (const id of onHill) {
    assert.equal(isPresent(npcs[id] as NpcDefinition, climbing), false, `${id} não espera na trilha`);
  }

  const reunited = context([...climbing.flags, "parents-found", "remembered"]);
  const confronted = context([...reunited.flags, "guides-return"]);
  const ended = context([...confronted.flags, "guides-gone"]);
  for (const id of ["father", "mother"] as const) {
    assert.equal(isPresent(npcs[id], reunited), true, `${id} aparece no reencontro`);
    assert.equal(isPresent(npcs[id], ended), true, `${id} fica até o fim, nos dois finais`);
  }
  for (const id of ["cassandra-refuge", "victor-refuge"] as const) {
    const npc: NpcDefinition = npcs[id];
    assert.equal(isPresent(npc, reunited), false, `${id} ainda não voltou`);
    assert.equal(isPresent(npc, confronted), true, `${id} está na beira do refúgio`);
    assert.equal(isPresent(npc, ended), false, `${id} foi embora de vez`);
    assert.equal(npc.exit, "fade", `${id} vai embora à vista, não num corte`);
  }
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
