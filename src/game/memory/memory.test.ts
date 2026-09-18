import { test } from "node:test";
import assert from "node:assert/strict";
import { memories } from "../../content/memories.ts";
import type { Memory } from "../../content/types.ts";
import { canActivate, isLastFragment, memoryStatus, nextAutoMemory, totalDuration, validateMemory } from "./memoryLogic.ts";
import { pointsOfInterest } from "../../content/pointsOfInterest.ts";
import { poiInteraction } from "../poi/poiInteraction.ts";
import { meetsRequirement, type StoryContext } from "../story/requirements.ts";

// Rodar com: npm test

const context = (partial: Partial<StoryContext> = {}): StoryContext => ({
  flags: [],
  seenDialogues: [],
  recoveredMemories: [],
  ...partial,
});

const sample: Record<"a" | "b" | "c", Memory> = {
  a: { title: "A", description: "a", trigger: { type: "interaction" }, fragments: [{ text: "1" }] },
  b: {
    title: "B",
    description: "b",
    unlock: { flags: ["hill-familiar"] },
    trigger: { type: "auto", delay: 1 },
    fragments: [{ text: "1" }, { text: "2" }],
  },
  c: { title: "C", description: "c", unlock: { memories: ["childhood-ride"] }, trigger: { type: "auto", delay: 0 }, fragments: [{ text: "1" }] },
};

test("bloqueada → desbloqueada → recuperada", () => {
  assert.equal(memoryStatus("b", sample.b, context()), "locked");
  assert.equal(memoryStatus("b", sample.b, context({ flags: ["hill-familiar"] })), "unlocked");
  assert.equal(memoryStatus("b", sample.b, context({ flags: ["hill-familiar"], recoveredMemories: ["b" as never] })), "recovered");
  assert.equal(memoryStatus("a", sample.a, context()), "unlocked", "sem condição: desbloqueada desde o início");
});

test("só memórias não bloqueadas podem ser ativadas", () => {
  assert.equal(canActivate("locked"), false);
  assert.equal(canActivate("unlocked"), true);
  assert.equal(canActivate("recovered"), true);
});

test("automática: a primeira desbloqueada e ainda não vivida; interação nunca dispara sozinha", () => {
  assert.equal(nextAutoMemory(sample, context()), null);
  assert.equal(nextAutoMemory(sample, context({ flags: ["hill-familiar"] })), "b");
  assert.equal(nextAutoMemory(sample, context({ flags: ["hill-familiar"], recoveredMemories: ["b" as never] })), null);
});

test("requisito por memória recuperada", () => {
  assert.equal(meetsRequirement({ memories: ["childhood-ride"] }, context()), false);
  assert.equal(meetsRequirement({ memories: ["childhood-ride"] }, context({ recoveredMemories: ["childhood-ride"] })), true);
});

test("último fragmento", () => {
  assert.equal(isLastFragment(sample.b, 0), false);
  assert.equal(isLastFragment(sample.b, 1), true);
});

test("todas as memórias do jogo são válidas", () => {
  for (const [id, memory] of Object.entries(memories)) {
    assert.deepEqual(validateMemory(memory), [], `memória "${id}"`);
  }
});

test("primeira memória: desbloqueia com a pergunta da colina, por interação, 10–20 s", () => {
  const memory = memories["childhood-ride"];
  assert.equal(memoryStatus("childhood-ride", memory, context()), "locked");
  assert.equal(memoryStatus("childhood-ride", memory, context({ flags: ["hill-familiar"] })), "unlocked");
  assert.equal(nextAutoMemory(memories, context({ flags: ["hill-familiar"] })), null, "não dispara sozinha");
  const seconds = totalDuration(memory);
  assert.ok(seconds >= 10 && seconds <= 20, `duração ${seconds}s`);
});

test("a porteira: examinar → tocar (memória) → pensamento posterior", () => {
  const gate = pointsOfInterest.gate;
  assert.deepEqual(poiInteraction(gate, "locked"), { prompt: "Examinar", action: { type: "dialogue", dialogue: "poi-gate" } });
  assert.deepEqual(poiInteraction(gate, "unlocked"), {
    prompt: "Tocar a porteira",
    action: { type: "memory", memory: "childhood-ride" },
  });
  assert.deepEqual(poiInteraction(gate, "recovered"), {
    prompt: "Examinar",
    action: { type: "dialogue", dialogue: "poi-gate-after" },
  });
  assert.deepEqual(poiInteraction(pointsOfInterest.cairn, null), {
    prompt: "Examinar",
    action: { type: "dialogue", dialogue: "poi-cairn" },
  });
});
