import { test } from "node:test";
import assert from "node:assert/strict";
import type { DialogueId } from "../../content/dialogues.ts";
import type { ConversationEntry } from "../../content/types.ts";
import { characterLabel, nextConversation } from "./conversation.ts";

// Rodar com: npm test

const conversation: readonly ConversationEntry[] = [
  "arrival-meeting",
  { dialogue: "cassandra-hill", requires: { flags: ["hill-familiar"] } },
  "cassandra-idle",
];

const context = (seenDialogues: DialogueId[], flags: ("met-guides" | "hill-familiar")[] = []) => ({ seenDialogues, flags });

test("começa pela primeira conversa", () => {
  assert.equal(nextConversation(conversation, context([])), "arrival-meeting");
});

test("pula conversa bloqueada e segue para a próxima disponível", () => {
  assert.equal(nextConversation(conversation, context(["arrival-meeting"])), "cassandra-idle");
});

test("conversa bloqueada abre quando o marco acontece", () => {
  const seen: DialogueId[] = ["arrival-meeting", "cassandra-idle"];
  assert.equal(nextConversation(conversation, context(seen, ["hill-familiar"])), "cassandra-hill");
});

test("depois de todas, repete a última disponível", () => {
  const seen: DialogueId[] = ["arrival-meeting", "cassandra-idle"];
  assert.equal(nextConversation(conversation, context(seen)), "cassandra-idle");
  assert.equal(nextConversation(conversation, context([...seen, "cassandra-hill"], ["hill-familiar"])), "cassandra-idle");
});

test("conversa sem nada disponível é erro de dados", () => {
  assert.throws(() => nextConversation([], context([])));
});

test("mostra o epíteto até o personagem se apresentar", () => {
  const cassandra = { name: "Cassandra", epithet: "a mulher desconhecida" };
  assert.equal(characterLabel(cassandra, false), "a mulher desconhecida");
  assert.equal(characterLabel(cassandra, true), "Cassandra");
});
