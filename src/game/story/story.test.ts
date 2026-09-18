import { test } from "node:test";
import assert from "node:assert/strict";
import { storyBeats } from "../../content/story.ts";
import { nextBeat } from "./beats.ts";
import { meetsRequirement } from "./requirements.ts";

// Rodar com: npm test

test("requisito de marcos e de diálogos vistos", () => {
  const requirement = { flags: ["met-guides"], seenAtLeast: { dialogues: ["poi-cairn", "poi-fence"], count: 2 } } as const;
  assert.equal(meetsRequirement(requirement, { flags: [], seenDialogues: ["poi-cairn", "poi-fence"], recoveredMemories: [] }), false);
  assert.equal(meetsRequirement(requirement, { flags: ["met-guides"], seenDialogues: ["poi-cairn"], recoveredMemories: [] }), false);
  assert.equal(meetsRequirement(requirement, { flags: ["met-guides"], seenDialogues: ["poi-cairn", "poi-fence"], recoveredMemories: [] }), true);
  assert.equal(meetsRequirement(undefined, { flags: [], seenDialogues: [], recoveredMemories: [] }), true);
});

test("nenhum momento antes do encontro", () => {
  assert.equal(nextBeat(storyBeats, "arrival", { flags: [], seenDialogues: [], recoveredMemories: [] }), null);
});

test("depois do encontro vem o convite para explorar", () => {
  assert.equal(nextBeat(storyBeats, "arrival", { flags: ["met-guides"], seenDialogues: ["arrival-meeting"], recoveredMemories: [] }), "arrival-encourage");
});

test("a pergunta sobre a colina só vem depois de 3 pontos de interesse", () => {
  const base = ["arrival-meeting", "arrival-encourage"] as const;
  const flags = ["met-guides"] as const;
  assert.equal(nextBeat(storyBeats, "arrival", { flags, seenDialogues: [...base, "poi-horseshoe", "poi-fence"], recoveredMemories: [] }), null);
  assert.equal(
    nextBeat(storyBeats, "arrival", { flags, seenDialogues: [...base, "poi-horseshoe", "poi-fence", "poi-flowers"], recoveredMemories: [] }),
    "arrival-hill-familiar",
  );
});

test("cada momento acontece uma vez só", () => {
  const seenDialogues = [
    "arrival-meeting",
    "arrival-encourage",
    "poi-horseshoe",
    "poi-fence",
    "poi-flowers",
    "arrival-hill-familiar",
  ] as const;
  assert.equal(nextBeat(storyBeats, "arrival", { flags: ["met-guides", "hill-familiar"], seenDialogues, recoveredMemories: [] }), null);
});

test("momentos são da zona atual", () => {
  assert.equal(nextBeat(storyBeats, "houses", { flags: ["met-guides"], seenDialogues: [], recoveredMemories: [] }), null);
});
