import { test } from "node:test";
import assert from "node:assert/strict";
import { memories, memoryIds } from "../../content/memories.ts";
import { storyBeats, storyFlags } from "../../content/story.ts";
import { nextBeat } from "../story/beats.ts";
import type { Memory } from "../../content/types.ts";
import {
  canActivate,
  fragmentTone,
  isLastFragment,
  memoryStatus,
  memoryTones,
  nextAutoMemory,
  totalDuration,
  validateMemory,
} from "./memoryLogic.ts";
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

test("segunda memória: exige o desenho e a primeira lembrança, por interação, 15–30 s", () => {
  const memory = memories["parents-night"];
  const found = { flags: ["found-drawing"] } as const;
  const lived = { recoveredMemories: ["childhood-ride"] } as const;
  assert.equal(memoryStatus("parents-night", memory, context()), "locked");
  assert.equal(memoryStatus("parents-night", memory, context(found)), "locked", "sem a primeira memória");
  assert.equal(memoryStatus("parents-night", memory, context(lived)), "locked", "sem o desenho");
  assert.equal(memoryStatus("parents-night", memory, context({ ...found, ...lived })), "unlocked");
  assert.equal(nextAutoMemory(memories, context({ ...found, ...lived })), null, "não dispara sozinha");
  const seconds = totalDuration(memory);
  assert.ok(seconds >= 15 && seconds <= 30, `duração ${seconds}s`);
});

test("a segunda memória vira de clima no meio: a lembrança boa não termina bem", () => {
  const memory: Memory = memories["parents-night"];
  assert.deepEqual(memoryTones(memory), ["warm", "cold"]);
  assert.equal(fragmentTone(memory, 0), "warm");
  const turn = memory.fragments.findIndex((fragment) => fragment.tone === "cold");
  assert.ok(turn > 0, "a virada não pode ser no primeiro fragmento");
  assert.equal(fragmentTone(memory, turn - 1), "warm");
  // Depois da virada, os fragmentos seguintes herdam o clima frio.
  assert.equal(fragmentTone(memory, memory.fragments.length - 1), "cold");
});

test("clima: herdado do fragmento anterior; sem nenhum, o da memória", () => {
  const plain: Memory = { title: "A", description: "a", trigger: { type: "interaction" }, fragments: [{ text: "1" }, { text: "2" }] };
  assert.equal(fragmentTone(plain, 1), "warm", "padrão");
  assert.deepEqual(memoryTones({ ...plain, tone: "cold" }), ["cold"]);
  const turning: Memory = { ...plain, fragments: [{ text: "1" }, { text: "2", tone: "cold" }, { text: "3" }] };
  assert.deepEqual([0, 1, 2].map((index) => fragmentTone(turning, index)), ["warm", "cold", "cold"]);
  assert.deepEqual(validateMemory({ ...plain, fragments: [{ text: "1", tone: "cold" }] }), [
    "o primeiro fragmento vira o clima: declare-o na memória",
  ]);
});

test("o cavalinho: examinar → pegar (memória) → pensamento posterior", () => {
  const horse = pointsOfInterest.houseHorse;
  assert.deepEqual(poiInteraction(horse, "locked"), { prompt: "Examinar", action: { type: "dialogue", dialogue: "poi-house-horse" } });
  assert.deepEqual(poiInteraction(horse, "unlocked"), {
    prompt: "Pegar o cavalinho",
    action: { type: "memory", memory: "parents-night" },
  });
  assert.deepEqual(poiInteraction(horse, "recovered"), {
    prompt: "Examinar",
    action: { type: "dialogue", dialogue: "poi-house-horse-after" },
  });
});

test("terceira memória: só depois da noite, escondida no labirinto, 15–30 s", () => {
  const memory: Memory = memories["the-names"];
  assert.equal(memoryStatus("the-names", memory, context()), "locked");
  assert.equal(memoryStatus("the-names", memory, context({ recoveredMemories: ["parents-night"] })), "unlocked");
  assert.equal(nextAutoMemory(memories, context({ recoveredMemories: ["parents-night"] })), null, "não dispara sozinha");
  assert.deepEqual(memoryTones(memory), ["cold"], "fria do começo ao fim");
  const seconds = totalDuration(memory);
  assert.ok(seconds >= 15 && seconds <= 30, `duração ${seconds}s`);
  // Cassandra e Victor ainda não podem ser nomeados aqui.
  const texto = memory.fragments.map((fragment) => fragment.text).join(" ");
  assert.ok(!/Cassandra|Victor/.test(texto), "os nomes ainda não aparecem");
});

test("quarta memória: precisa de ter lido o papel e de olhar os dois de novo", () => {
  const memory: Memory = memories["the-two"];
  const read = { recoveredMemories: ["the-names" as const] };
  assert.equal(memoryStatus("the-two", memory, context(read)), "locked", "sem voltar e olhar para eles");
  assert.equal(memoryStatus("the-two", memory, context({ flags: ["saw-them-again"] })), "locked", "sem ter lido o papel");
  assert.equal(memoryStatus("the-two", memory, context({ ...read, flags: ["saw-them-again"] })), "unlocked");
  // Esta é a única que vem sozinha: é o reconhecimento, não uma escolha.
  assert.equal(nextAutoMemory(memories, context({ ...read, flags: ["saw-them-again"] })), "the-two");

  const texto = memory.fragments.map((fragment) => fragment.text).join(" ");
  assert.ok(/Victor/.test(texto) && /Cassandra/.test(texto), "aqui os nomes finalmente aparecem");
  const seconds = totalDuration(memory);
  assert.ok(seconds >= 15 && seconds <= 30, `duração ${seconds}s`);
});

test("quinta memória: a vida depois e a morte, terminando na primeira imagem do jogo", () => {
  const memory: Memory = memories["after"];
  assert.equal(memoryStatus("after", memory, context()), "locked");
  assert.equal(memoryStatus("after", memory, context({ recoveredMemories: ["the-two"] })), "unlocked");
  const sequence = memory.fragments.map((_, index) => fragmentTone(memory, index));
  const turns = sequence.filter((tone, index) => index === 0 || tone !== sequence[index - 1]);
  assert.deepEqual(turns, ["cold", "warm", "cold"], "o vazio, os anos mornos, a última noite");
  const seconds = totalDuration(memory);
  assert.ok(seconds >= 15 && seconds <= 30, `duração ${seconds}s`);
  // Fecha exatamente onde o jogo abre: grama, luz de fim de tarde, a colina.
  const last = memory.fragments[memory.fragments.length - 1];
  assert.ok(/colina/.test(last.text), `último fragmento: "${last.text}"`);
});

test("as cinco lembranças vêm em ordem: cada uma depende da anterior", () => {
  assert.deepEqual([...memoryIds], ["childhood-ride", "parents-night", "the-names", "the-two", "after"]);

  // Pular uma lembrança não abre a seguinte: nem com todos os marcos da história.
  for (let index = 1; index < memoryIds.length; index++) {
    const id = memoryIds[index];
    const withoutPrevious = memoryIds.slice(0, index - 1);
    const status = memoryStatus(id, memories[id], context({ flags: [...storyFlags], recoveredMemories: withoutPrevious }));
    assert.equal(status, "locked", `"${id}" abriu sem "${memoryIds[index - 1]}"`);
  }

  // Nenhuma lembrança dura mais que meio minuto: são fragmentos, não vídeos.
  for (const id of memoryIds) {
    const seconds = totalDuration(memories[id]);
    assert.ok(seconds <= 30, `"${id}" dura ${seconds}s`);
  }
});

test("depois da quinta lembrança vem o entendimento — e não o final", () => {
  const lived = {
    flags: ["met-guides", "hill-familiar", "first-memory", "found-drawing", "parents-lost", "hunt-began", "guides-known", "own-death"],
    seenDialogues: ["arrival-meeting", "arrival-encourage", "arrival-hill-familiar", "machine-arrives", "guides-again"],
    recoveredMemories: [...memoryIds],
  } as const;
  const beat = nextBeat(storyBeats, "arrival", context(lived));
  assert.equal(beat, "guides-lied", "o jogo conta a mentira, sem confronto");
  assert.equal(storyBeats["guides-lied"].requires.memories?.[0], "after");

  // E depois disso o jogo para: nada empurra a Aysha para um desfecho ainda.
  const afterwards = context({ ...lived, seenDialogues: [...lived.seenDialogues, "guides-lied"], flags: [...lived.flags, "they-lied"] });
  assert.equal(nextBeat(storyBeats, "arrival", afterwards), null);
  assert.equal(nextAutoMemory(memories, afterwards), null);
});

test("a porteira vira passagem depois das duas primeiras lembranças", () => {
  const gate = pointsOfInterest.gate;
  // Sem as lembranças, continua sendo só uma porteira.
  assert.deepEqual(poiInteraction(gate, "recovered", false), {
    prompt: "Examinar",
    action: { type: "dialogue", dialogue: "poi-gate-after" },
  });
  assert.deepEqual(poiInteraction(gate, "recovered", true), {
    prompt: "Abrir a porteira",
    action: { type: "travel", zone: "labyrinth" },
  });
  assert.equal(
    meetsRequirement(gate.travel.requires, context({ recoveredMemories: ["childhood-ride"] })),
    false,
    "uma lembrança só não abre",
  );
  assert.equal(
    meetsRequirement(gate.travel.requires, context({ recoveredMemories: ["childhood-ride", "parents-night"] })),
    true,
  );
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
