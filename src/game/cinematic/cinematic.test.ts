import { test } from "node:test";
import assert from "node:assert/strict";
import { choices, isChoiceValue, type EndingChoice } from "../../content/choices.ts";
import { cinematics, type CinematicId } from "../../content/cinematics.ts";
import { dialogues, type DialogueId } from "../../content/dialogues.ts";
import { memories } from "../../content/memories.ts";
import { npcs } from "../../content/npcs.ts";
import type { Cinematic, CinematicStep, Dialogue, DialogueNode, NpcDefinition } from "../../content/types.ts";
import { playerConfig } from "../config/player.ts";
import { memoryStatus } from "../memory/memoryLogic.ts";
import { createPlayerState, updatePlayer } from "../player/playerController.ts";
import { getPlayerEnvironment } from "../player/spawn.ts";
import { isPresent } from "../story/presence.ts";
import { meetsRequirement } from "../story/requirements.ts";
import { hillsideBounds } from "../world/hillside.ts";
import { REFUGE, refugeHedge, refugeObstacles, refugePaceAt } from "../world/refuge.ts";
import { HOLLOW, SUMMIT, terrainHeight } from "../world/terrain.ts";
import { cinematicAt, stepDuration, stepsFor, validateCinematic, type CinematicContext } from "./cinematicLogic.ts";

// Rodar com: npm test

const reunion: Cinematic = cinematics.reunion;

const context = (partial: Partial<CinematicContext> = {}): CinematicContext => ({
  flags: [],
  seenDialogues: [],
  recoveredMemories: [],
  seenCinematics: [],
  ...partial,
});

/** Tudo o que já aconteceu quando a Aysha passa pela borda da concha. */
const atTheRim = context({
  flags: ["they-lied", "hill-reached", "hill-climbed", "refuge-seen"],
  recoveredMemories: ["childhood-ride", "parents-night", "the-names", "the-two", "after"],
});

const bounds = hillsideBounds();
const slack = (x: number, z: number) =>
  Math.max(...bounds.map((circle) => circle.radius - Math.hypot(x - circle.center[0], z - circle.center[1])));

test("as cenas estão bem formadas", () => {
  for (const [id, cinematic] of Object.entries(cinematics) as [CinematicId, Cinematic][]) {
    assert.deepEqual(validateCinematic(cinematic), [], `"${id}"`);
  }
});

test("o tempo de cada passo: o relógio, ou quem o jogador está ouvindo", () => {
  assert.equal(stepDuration({ type: "shot", shot: { position: [0, 0, 0], target: [0, 0, 1] }, move: 3 }), 3);
  assert.equal(stepDuration({ type: "shot", shot: { position: [0, 0, 0], target: [0, 0, 1] }, move: 3, wait: 0 }), 0);
  assert.equal(stepDuration({ type: "pause", seconds: 2 }), 2);
  assert.equal(stepDuration({ type: "flags", flags: [] }), 0);
  assert.equal(stepDuration({ type: "dialogue", dialogue: "reunion-see" }), null, "o diálogo acaba quando o jogador o termina");
  assert.equal(stepDuration({ type: "memory", memory: "whole" }), null);
});

test("o reencontro só acontece depois de ver a concha, e uma vez só", () => {
  const [x, z] = reunion.trigger.center;
  assert.equal(cinematicAt(cinematics, "hillside", x, z, context()), null, "antes da borda, o patamar é só chão");
  assert.equal(cinematicAt(cinematics, "hillside", x, z, atTheRim), "reunion");
  assert.equal(cinematicAt(cinematics, "hillside", x, z, { ...atTheRim, seenCinematics: ["reunion"] }), null);
  assert.equal(cinematicAt(cinematics, "arrival", x, z, atTheRim), null, "cenas são da zona atual");
  assert.equal(cinematicAt(cinematics, "hillside", x, z + 30, atTheRim), null, "e do lugar");
});

test("quem desce a trilha pisa no gatilho, sem precisar procurar", () => {
  // A trilha desce da brecha até o patamar em linha quase reta.
  let crossed = false;
  for (let z = HOLLOW.z + HOLLOW.radius; z >= REFUGE.center.z; z -= 0.5) {
    const x = 44 + ((z + 752) / (-800 + 752)) * 1;
    if (cinematicAt(cinematics, "hillside", x, z, atTheRim) === "reunion") crossed = true;
  }
  assert.ok(crossed);
  assert.ok(slack(...reunion.trigger.center) > playerConfig.boundsSoftMargin, "o gatilho fica dentro do mundo, longe da borda");
});

test("a cena segue a ordem pedida: controle, câmera, os pais, o reencontro, a lembrança, e a frase", () => {
  const kinds = reunion.steps.map((step) => step.type);
  assert.equal(kinds[0], "shot", "a primeira coisa é a câmera assumir");
  const parents = reunion.steps.findIndex((step) => step.type === "flags" && step.flags.includes("parents-found"));
  const memory = reunion.steps.findIndex((step) => step.type === "memory" && step.memory === "whole");
  const firstWords = reunion.steps.findIndex((step) => step.type === "dialogue");
  assert.ok(parents > 0 && parents < firstWords, "eles aparecem antes de qualquer palavra");
  assert.ok(firstWords < memory, "e só depois do reencontro vem a lembrança");

  const last = reunion.steps[reunion.steps.length - 1];
  assert.equal(memory, reunion.steps.length - 2, "a lembrança é o penúltimo passo");
  assert.ok(last.type === "title" && last.text === "Eu me lembro.", "e o último é a frase, sozinha");
});

test("o reencontro fala pouco", () => {
  let lines = 0;
  for (const step of reunion.steps) {
    if (step.type !== "dialogue") continue;
    const dialogue: Dialogue = dialogues[step.dialogue];
    for (const node of Object.values(dialogue.nodes)) {
      assert.equal(node.choices, undefined, `"${step.dialogue}" não tem escolhas: não é hora de decidir nada`);
      lines += node.lines.length;
      for (const line of node.lines) assert.ok(line.text.length <= 90, `fala longa demais: "${line.text}"`);
    }
  }
  assert.ok(lines <= 10, `${lines} falas na cena inteira`);
});

test("a lembrança inteira só abre com os dois presentes, e depois das outras cinco", () => {
  const whole = memories.whole;
  assert.equal(memoryStatus("whole", whole, atTheRim), "locked", "sozinha na concha, ainda não");
  const withParents = { ...atTheRim, flags: [...atTheRim.flags, "parents-found" as const] };
  assert.equal(memoryStatus("whole", whole, withParents), "unlocked");
  assert.equal(memoryStatus("whole", whole, { ...withParents, recoveredMemories: [] }), "locked");
});

test("os pais aparecem no reencontro, perto dela, e o controle volta sem esbarrar em ninguém", () => {
  const withParents = { ...atTheRim, flags: [...atTheRim.flags, "parents-found" as const] };
  assert.ok(reunion.release, "o reencontro devolve o controle");
  const [rx, rz] = reunion.release.position;
  for (const id of ["father", "mother"] as const) {
    const npc: NpcDefinition = npcs[id];
    assert.equal(isPresent(npc, atTheRim), false);
    assert.equal(isPresent(npc, withParents), true);
    const [x, z] = npc.position;
    assert.ok(slack(x, z) > playerConfig.boundsSoftMargin, `${id} fica dentro do mundo`);
    const distance = Math.hypot(rx - x, rz - z);
    assert.ok(distance > 3 && distance < 7, `${id} a ${distance.toFixed(1)} m de onde ela para`);
  }

  // Onde ela é posta no fim, nada a empurra: nem os pais, nem a árvore, nem a cerca.
  const environment = getPlayerEnvironment("hillside", withParents);
  for (const obstacle of environment.obstacles ?? []) {
    const gap = Math.hypot(rx - obstacle.x, rz - obstacle.z) - obstacle.radius - playerConfig.bodyRadius;
    assert.ok(gap > 0.5, `o obstáculo em (${obstacle.x.toFixed(1)}, ${obstacle.z.toFixed(1)}) está em cima dela`);
  }
});

test("o refúgio é pequeno, plano e fechado atrás", () => {
  const { x, z } = REFUGE.center;
  // Plano: o patamar inteiro cabe em meio metro de desnível.
  const around = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => terrainHeight(x + Math.cos(i) * 5, z + Math.sin(i) * 5));
  assert.ok(Math.max(...around) - Math.min(...around) < 1, "o chão onde os três ficam é plano");

  // Escondido: do campo e do pé da subida, ninguém o vê.
  assert.ok(terrainHeight(x, z) < terrainHeight(SUMMIT.x, SUMMIT.z) - 15, "fica bem abaixo do cume");

  // A cerca viva não tem fresta: entre dois arbustos não passa ninguém.
  const obstacles = refugeObstacles();
  const hedge = refugeHedge();
  for (let i = 1; i < hedge.length; i++) {
    const gap = Math.hypot(hedge[i].x - hedge[i - 1].x, hedge[i].z - hedge[i - 1].z) - 2 * obstacles[i].radius;
    assert.ok(gap < 2 * playerConfig.bodyRadius, `fresta de ${gap.toFixed(2)} m entre os arbustos ${i - 1} e ${i}`);
  }
  // E ela fica do lado de trás: quem chega pela brecha nunca a encontra de frente.
  for (const bush of hedge) assert.ok(bush.z < z - 2, "a cerca fecha o norte, não o caminho");
});

test("o passo encurta dentro da concha, e só lá", () => {
  assert.equal(refugePaceAt(SUMMIT.x, SUMMIT.z), 1, "no cume, o passo de sempre");
  const deep = refugePaceAt(HOLLOW.x, HOLLOW.z);
  assert.ok(deep < 0.7 && deep >= 0.6, `no fundo, ${deep.toFixed(2)} do passo`);

  // O controlador respeita o pedido: a mesma entrada anda menos lá dentro.
  const walk = (x: number, z: number) => {
    const state = createPlayerState({ x, z, eyeY: 0, yaw: 0, pitch: 0 });
    const environment = { heightAt: () => 0, bounds: [{ centerX: x, centerZ: z, radius: 100 }], paceAt: refugePaceAt };
    for (let i = 0; i < 120; i++) updatePlayer(state, { forward: 1, strafe: 0, lookDeltaX: 0, lookDeltaY: 0 }, 1 / 60, environment, playerConfig);
    return Math.hypot(state.x - x, state.z - z);
  };
  assert.ok(walk(HOLLOW.x, HOLLOW.z) < walk(SUMMIT.x, SUMMIT.z) * 0.75);
});

// ── O fim ────────────────────────────────────────────────────────────────

const confrontation: Cinematic = cinematics.confrontation;

/** A Aysha em paz no refúgio, depois de lembrar de tudo. */
const remembered = context({
  flags: [...atTheRim.flags, "parents-found", "remembered"],
  recoveredMemories: [...atTheRim.recoveredMemories, "whole"],
  seenDialogues: ["reunion-see", "reunion-hold", "refuge-after"],
  seenCinematics: ["reunion"],
});

const branch = (ending: EndingChoice) => stepsFor(confrontation, { ...remembered, choices: { ending } });
const dialoguesOf = (steps: readonly CinematicStep[]) =>
  steps.flatMap((step) => (step.type === "dialogue" ? [step.dialogue] : []));
const linesOf = (id: DialogueId) => Object.values<DialogueNode>(dialogues[id].nodes).flatMap((node) => node.lines);

test("uma escolha guarda um valor que é dela, e as condições sabem ler", () => {
  assert.equal(isChoiceValue("ending", "forgive"), true);
  assert.equal(isChoiceValue("ending", "revenge"), true);
  assert.equal(isChoiceValue("ending", "esquecer"), false, "valor fora das opções é recusado");
  assert.deepEqual(
    choices.ending.options.map((option) => option.label.toUpperCase()),
    ["PERDOAR", "VINGAR-SE"],
  );

  const asked = { choices: { ending: "forgive" } } as const;
  assert.equal(meetsRequirement(asked, context()), false, "sem decisão, nenhum ramo");
  assert.equal(meetsRequirement(asked, { ...remembered, choices: { ending: "forgive" } }), true);
  assert.equal(meetsRequirement(asked, { ...remembered, choices: { ending: "revenge" } }), false);
});

test("o fim só vem depois de lembrar de tudo, com o refúgio em silêncio por um tempo", () => {
  const [x, z] = confrontation.trigger.center;
  assert.equal(cinematicAt(cinematics, "hillside", x, z, { ...remembered, seenDialogues: [] }), null, "nem no meio da primeira fala");
  assert.equal(cinematicAt(cinematics, "hillside", x, z, { ...remembered, flags: atTheRim.flags }), null);
  assert.equal(cinematicAt(cinematics, "hillside", x, z, remembered), "confrontation");
  assert.ok((confrontation.trigger.delay ?? 0) >= 5, "não em cima do reencontro: primeiro, um tempo com os pais");

  // O círculo cobre o refúgio inteiro: em qualquer canto dele, o fim acontece.
  for (const [px, pz] of [REFUGE.father, REFUGE.mother, [REFUGE.tree.x, REFUGE.tree.z + 2]] as const) {
    assert.equal(cinematicAt(cinematics, "hillside", px, pz, remembered), "confrontation");
  }
});

test("a conversa final vem antes da escolha, com os dois falando e nenhuma saída pelo meio", () => {
  const steps = confrontation.steps;
  const talk = steps.findIndex((step) => step.type === "dialogue" && step.dialogue === "final-confrontation");
  const choice = steps.findIndex((step) => step.type === "choice");
  const back = steps.findIndex((step) => step.type === "flags" && step.flags.includes("guides-return"));
  assert.ok(back >= 0 && back < talk && talk === choice - 1, "eles aparecem, falam, e só então ela decide");
  assert.equal(steps.slice(0, choice + 1).some((step) => step.when), false, "até a escolha, a cena é uma só");

  const speakers = new Set(linesOf("final-confrontation").map((line) => line.speaker));
  for (const who of ["aysha", "cassandra", "victor"] as const) assert.ok(speakers.has(who), `${who} fala na conversa final`);
  const talkDialogue: Dialogue = dialogues["final-confrontation"];
  assert.equal(talkDialogue.nodes.main.choices, undefined, "a decisão é da escolha, não do diálogo");

  // O que a conversa precisa dizer.
  const text = linesOf("final-confrontation").map((line) => line.text).join(" ");
  assert.match(text, /sabiam quem eu era/, "eles sabiam quem ela era");
  assert.match(text, /para você não lembrar/, "tentaram impedir que ela lembrasse");
  assert.match(text, /some\b/, "têm medo de desaparecer");
  assert.match(text, /não vieram pedir perdão/i, "e não estão arrependidos");
});

for (const ending of ["forgive", "revenge"] as const) {
  test(`final "${ending}": os dois vão embora, ela fica com os pais, e o jogo acaba na colina`, () => {
    const steps = branch(ending);
    const other = branch(ending === "forgive" ? "revenge" : "forgive");
    assert.deepEqual(validateCinematic({ ...confrontation, steps }), [], "o ramo, sozinho, é uma cena inteira");

    // Cada ramo tem falas próprias: nenhum toca o que é do outro.
    const own = dialoguesOf(steps).filter((id) => id.startsWith("ending-"));
    assert.ok(own.length >= 2);
    for (const id of dialoguesOf(other).filter((id) => id.startsWith("ending-"))) {
      assert.ok(!own.includes(id), `"${id}" é do outro final`);
    }

    // Eles saem de vez — e antes de ela voltar aos pais.
    const gone = steps.findIndex((step) => step.type === "flags" && step.flags.includes("guides-gone"));
    assert.ok(gone > 0, "Cassandra e Victor deixam o refúgio");

    // A última palavra antes da colina é dos pais: é com eles que ela fica.
    const lastTalk = dialoguesOf(steps).at(-1);
    assert.ok(lastTalk);
    assert.ok(steps.findIndex((step) => step.type === "dialogue" && step.dialogue === lastTalk) > gone);
    const lastSpeakers = new Set(linesOf(lastTalk).map((line) => line.speaker));
    assert.ok(lastSpeakers.has("father") || lastSpeakers.has("mother"), `"${lastTalk}" termina com os pais`);

    // E termina na colina: a última viagem da câmera olha para o cume, e depois vem o fim.
    const finale = steps[steps.length - 1];
    assert.ok(finale.type === "finale" && finale.title === "BEYOND THE HILL" && finale.subtitle === "FIM");
    const lastShot = [...steps].reverse().find((step) => step.type === "shot");
    assert.ok(lastShot?.type === "shot");
    const [tx, , tz] = lastShot.shot.target;
    assert.ok(Math.hypot(tx - SUMMIT.x, tz - SUMMIT.z) < 1, "o último quadro é a colina");
  });
}

test("o final da vingança vai até eles e volta: ela retorna ao refúgio", () => {
  const shots = branch("revenge").flatMap((step) => (step.type === "shot" ? [step.shot.position] : []));
  const toward = shots.findIndex(([, , z]) => z > REFUGE.center.z + 8);
  assert.ok(toward > 0, "ela anda até a beira, onde os dois estão");
  const back = shots.findIndex(([, , z], index) => index > toward && Math.abs(z - REFUGE.center.z) < 3);
  assert.ok(back > toward, "e desce de volta para o patamar");
});

test("nenhum dos finais mostra violência", () => {
  const ids = [...new Set([...dialoguesOf(branch("forgive")), ...dialoguesOf(branch("revenge"))])];
  const text = ids.flatMap((id) => linesOf(id)).map((line) => line.text).join(" ");
  assert.doesNotMatch(text, /sangue|faca|arma|tiro|golpe|soco|mat(ou|ar)\b|mort[oa]s?\b/i);
  assert.match(text, /Ninguém levanta a mão/, "no perdão, ninguém encosta em ninguém");
  assert.match(text, /Ela não levanta a mão/, "na vingança, também não");
});

test("a câmera do fim nunca atravessa o morro", () => {
  for (const ending of ["forgive", "revenge"] as const) {
    const shots = branch(ending).flatMap((step) => (step.type === "shot" ? [step.shot.position] : []));
    const world = shots.map(([x, y, z]) => [x, terrainHeight(x, z) + y, z] as const);
    for (let i = 1; i < world.length; i++) {
      const [ax, ay, az] = world[i - 1];
      const [bx, by, bz] = world[i];
      // A folga exigida vem das pontas: uma viagem de quem anda fica na altura
      // dos olhos, e uma viagem pelo ar não pode chegar a menos de 6 m do chão.
      const ends = Math.min(shots[i - 1][1], shots[i][1], 10);
      for (let s = 0; s <= 200; s++) {
        const t = s / 200;
        const [x, y, z] = [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t];
        const clearance = y - terrainHeight(x, z);
        const needed = ends * 0.6;
        assert.ok(clearance > needed, `"${ending}", viagem ${i}: a ${clearance.toFixed(1)} m do chão em (${x.toFixed(0)}, ${z.toFixed(0)})`);
      }
    }
    // E a árvore do cume (26 m) também fica por baixo da última viagem.
    const [, ay, az] = world[world.length - 2];
    const [, by, bz] = world[world.length - 1];
    const t = (SUMMIT.z - az) / (bz - az);
    assert.ok(t > 0 && t < 1, "a última viagem cruza o cume");
    assert.ok(ay + (by - ay) * t > terrainHeight(SUMMIT.x, SUMMIT.z) + 30, "e passa por cima da copa");
  }
});

test("os dois voltam para a beira do refúgio, entre ela e a saída", () => {
  for (const id of ["cassandra-refuge", "victor-refuge"] as const) {
    const npc: NpcDefinition = npcs[id];
    const [x, z] = npc.position;
    assert.ok(slack(x, z) > playerConfig.boundsSoftMargin, `${id} fica dentro do mundo`);
    assert.ok(z > REFUGE.center.z + 10, `${id} fica do lado da saída, não do lado dos pais`);
    assert.ok(npc.character, `${id} é alguém que já existe`);
  }
  // Quem não diz quem é precisa ter o id de um personagem.
  for (const [id, npc] of Object.entries(npcs) as [string, NpcDefinition][]) {
    if (!npc.character) assert.ok(["cassandra", "victor", "father", "mother"].includes(id), `"${id}" precisa de character`);
  }
});
