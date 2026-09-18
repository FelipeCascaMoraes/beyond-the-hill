import { test } from "node:test";
import assert from "node:assert/strict";
import { characterLabel, nextConversation } from "./conversation.ts";

// Rodar com: npm test

const conversation = ["encontro", "colina", "repouso"] as const;

test("começa pela primeira conversa", () => {
  assert.equal(nextConversation(conversation, []), "encontro");
});

test("avança para a próxima ainda não vista (mesmo vista com outro NPC)", () => {
  assert.equal(nextConversation(conversation, ["encontro"]), "colina");
});

test("depois de todas, repete a última", () => {
  assert.equal(nextConversation(conversation, ["encontro", "colina", "repouso"]), "repouso");
});

test("conversa vazia é erro de dados", () => {
  assert.throws(() => nextConversation([], []));
});

test("mostra o epíteto até o personagem se apresentar", () => {
  const cassandra = { name: "Cassandra", epithet: "Mulher desconhecida" };
  assert.equal(characterLabel(cassandra, false), "Mulher desconhecida");
  assert.equal(characterLabel(cassandra, true), "Cassandra");
});
