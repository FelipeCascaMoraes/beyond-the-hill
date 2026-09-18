import { test } from "node:test";
import assert from "node:assert/strict";
import { memories } from "../../content/memories.ts";
import type { Memory } from "../../content/types.ts";
import { canActivate, isLastFragment, memoryStatus, nextAutoMemory, validateMemory } from "./memoryLogic.ts";
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
  c: { title: "C", description: "c", unlock: { memories: ["first-ride"] }, trigger: { type: "auto", delay: 0 }, fragments: [{ text: "1" }] },
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
  assert.equal(meetsRequirement({ memories: ["first-ride"] }, context()), false);
  assert.equal(meetsRequirement({ memories: ["first-ride"] }, context({ recoveredMemories: ["first-ride"] })), true);
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

test("a memória de teste desbloqueia com a pergunta sobre a colina", () => {
  assert.equal(nextAutoMemory(memories, context()), null);
  assert.equal(nextAutoMemory(memories, context({ flags: ["hill-familiar"] })), "first-ride");
});
