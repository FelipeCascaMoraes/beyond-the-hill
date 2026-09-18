import { test } from "node:test";
import assert from "node:assert/strict";
import { dialogues } from "../../content/dialogues.ts";
import type { Dialogue } from "../../content/types.ts";
import { advanceCursor, beginDialogue, chooseOption, currentStep, introducedBy, validateDialogue } from "./runner.ts";

// Rodar com: npm test

const branching: Dialogue = {
  start: "intro",
  nodes: {
    intro: {
      lines: [
        { speaker: "cassandra", text: "Olá." },
        { speaker: "victor", text: "Tudo bem?", introduces: "victor" },
      ],
      choices: [
        { text: "Quem são vocês?", next: "who" },
        { text: "Preciso ir.", },
      ],
    },
    who: { lines: [{ speaker: "cassandra", text: "Amigos." }], next: "outro" },
    empty: { lines: [], next: "outro" },
    outro: { lines: [{ speaker: "victor", text: "Até logo." }] },
  },
};

test("percorre as falas em sequência e para nas escolhas", () => {
  let cursor = beginDialogue(branching);
  assert.deepEqual(cursor, { node: "intro", line: 0 });
  cursor = advanceCursor(branching, cursor!);
  const step = currentStep(branching, cursor!);
  assert.equal(step.kind, "line");
  assert.equal(step.kind === "line" && step.isFinal, false);
  cursor = advanceCursor(branching, cursor!);
  assert.equal(currentStep(branching, cursor!).kind, "choices");
  // Avançar diante de escolhas não muda nada.
  assert.deepEqual(advanceCursor(branching, cursor!), cursor);
});

test("escolha leva ao nó indicado e segue `next` até o fim", () => {
  const atChoices = { node: "intro", line: 2 };
  let cursor = chooseOption(branching, atChoices, 0);
  assert.deepEqual(cursor, { node: "who", line: 0 });
  cursor = advanceCursor(branching, cursor!);
  assert.deepEqual(cursor, { node: "outro", line: 0 });
  const last = currentStep(branching, cursor!);
  assert.equal(last.kind === "line" && last.isFinal, true);
  assert.equal(advanceCursor(branching, cursor!), null);
});

test("escolha sem `next` encerra; índice inválido não muda nada", () => {
  const atChoices = { node: "intro", line: 2 };
  assert.equal(chooseOption(branching, atChoices, 1), null);
  assert.deepEqual(chooseOption(branching, atChoices, 9), atChoices);
});

test("nós vazios são atravessados", () => {
  const dialogue: Dialogue = { ...branching, start: "empty" };
  assert.deepEqual(beginDialogue(dialogue), { node: "outro", line: 0 });
});

test("apresentações da fala atual", () => {
  const step = currentStep(branching, { node: "intro", line: 1 });
  assert.deepEqual(introducedBy(step), ["victor"]);
  assert.deepEqual(introducedBy(currentStep(branching, { node: "intro", line: 0 })), []);
});

test("validação aponta nós inexistentes e escolhas em diálogo sem bloqueio", () => {
  const broken: Dialogue = {
    start: "a",
    blocksMovement: false,
    nodes: { a: { lines: [{ speaker: "aysha", text: "Oi" }], choices: [{ text: "x", next: "fantasma" }] } },
  };
  const problems = validateDialogue(broken);
  assert.ok(problems.some((p) => p.includes("fantasma")));
  assert.ok(problems.some((p) => p.includes("não pode ter escolhas")));
  assert.deepEqual(validateDialogue(branching), []);
});

test("todos os diálogos do jogo são válidos", () => {
  for (const [id, dialogue] of Object.entries(dialogues)) {
    assert.deepEqual(validateDialogue(dialogue), [], `diálogo "${id}"`);
    assert.ok(beginDialogue(dialogue), `diálogo "${id}" não pode começar vazio`);
  }
});
