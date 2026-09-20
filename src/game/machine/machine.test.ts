import { test } from "node:test";
import assert from "node:assert/strict";
import { machines } from "../../content/machines.ts";
import { zones } from "../../content/zones.ts";
import { HOUSE } from "../world/house.ts";
import { playerConfig } from "../config/player.ts";
import type { MachineDefinition } from "../../content/types.ts";
import {
  alertOf,
  canSee,
  createMachineActor,
  inTerritory,
  nearestWaypoint,
  updateMachine,
  validateMachine,
  type MachineActor,
  type MachineTarget,
} from "./machineLogic.ts";

// Rodar com: npm test

/** Máquina de teste: rota quadrada em volta da origem, olhando para +Z. */
const sample: MachineDefinition = {
  zone: "arrival",
  title: "teste",
  route: [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ],
  pause: 2,
  territory: { center: [5, 5], radius: 20 },
  vision: { range: 15, halfAngle: 0.7, awareness: 4 },
  speed: { patrol: 1.5, chase: 3, return: 2.2 },
  timing: { detect: 1.3, lose: 3.5 },
  reach: 1.6,
  hover: 1.9,
};

const target = (x: number, z: number, sheltered = false): MachineTarget => ({ x, z, sheltered });

/** Roda a máquina por `seconds` em passos de 1/60 s, como no jogo. */
function run(actor: MachineActor, at: MachineTarget, seconds: number, machine = sample): string | null {
  let caught: string | null = null;
  for (let step = 0; step < Math.round(seconds * 60); step++) {
    if (updateMachine(actor, at, 1 / 60, machine) === "caught") caught = "caught";
  }
  return caught;
}

test("visão: cone à frente, alcance e um raio em que percebe de costas", () => {
  const actor = createMachineActor(sample);
  actor.x = 0;
  actor.z = 0;
  actor.yaw = 0; // olhando para +Z

  assert.equal(canSee(actor, target(0, 10), sample), true, "bem à frente");
  assert.equal(canSee(actor, target(0, 20), sample), false, "longe demais");
  assert.equal(canSee(actor, target(0, -10), sample), false, "atrás, fora do raio de percepção");
  assert.equal(canSee(actor, target(0, -3), sample), true, "atrás, mas colada nela");
  assert.equal(canSee(actor, target(10, 5), sample), false, "fora do cone");
  assert.equal(canSee(actor, target(0, 6, true), sample), false, "abrigada: some da vista");
});

test("patrulha: anda até o ponto, espera e segue para o próximo", () => {
  const actor = createMachineActor(sample);
  assert.equal(actor.state, "idle");
  assert.equal(actor.waypoint, 1);

  run(actor, target(100, 100), 2.1);
  assert.equal(actor.state, "patrol", "a pausa terminou");

  run(actor, target(100, 100), 8);
  assert.equal(actor.waypoint, 2, "chegou ao ponto e mirou o seguinte");
  assert.equal(actor.state, "idle", "para antes de seguir");
});

test("detecta antes de perseguir: olha, confirma e só então vai", () => {
  const actor = createMachineActor(sample);
  const aysha = target(0, 8);

  run(actor, aysha, 0.5);
  assert.equal(actor.state, "detect", "viu e parou para confirmar");
  run(actor, aysha, 1.2);
  assert.equal(actor.state, "chase", "confirmou");
});

test("desiste quando a Aysha sai do território", () => {
  const actor = createMachineActor(sample);
  run(actor, target(0, 8), 2);
  assert.equal(actor.state, "chase");

  // Um passo com ela fora da área guardada basta.
  updateMachine(actor, target(60, 60), 1 / 60, sample);
  assert.equal(actor.state, "return");
  assert.equal(inTerritory(target(60, 60), sample), false);
});

test("desiste quando a Aysha se esconde e volta à patrulha", () => {
  const actor = createMachineActor(sample);
  run(actor, target(0, 8), 2);
  assert.equal(actor.state, "chase");

  run(actor, target(0, 8, true), sample.timing.lose + 0.2);
  assert.equal(actor.state, "return", "perdeu de vista pelo tempo combinado");

  run(actor, target(0, 8, true), 20);
  assert.ok(actor.state === "idle" || actor.state === "patrol", `retomou a ronda (está em ${actor.state})`);
});

test("alcança a Aysha parada, e não a alcança se ela correr", () => {
  const parada = createMachineActor(sample);
  assert.equal(run(parada, target(0, 8), 8), "caught", "quem fica parado é alcançado");

  // Fugindo em linha reta na velocidade de corrida: a máquina nunca encosta.
  const fugindo = createMachineActor(sample);
  const aysha = { x: 0, z: 8, sheltered: false };
  let caught: string | null = null;
  for (let step = 0; step < 60 * 8; step++) {
    aysha.z += playerConfig.runSpeed / 60;
    if (updateMachine(fugindo, aysha, 1 / 60, sample) === "caught") caught = "caught";
  }
  assert.equal(caught, null, "correr salva");
  assert.ok(playerConfig.runSpeed > sample.speed.chase, "correr precisa ser mais rápido que a perseguição");
  assert.ok(playerConfig.walkSpeed < sample.speed.chase, "andar não pode bastar");
});

test("não entra nos círculos proibidos (a casa)", () => {
  const actor = createMachineActor(sample);
  const house = [{ x: 0, z: 8, radius: 5 }];
  for (let step = 0; step < 60 * 10; step++) updateMachine(actor, target(0, 8), 1 / 60, sample, house);
  assert.ok(Math.hypot(actor.x - 0, actor.z - 8) >= 4.99, "parou na borda da casa");
});

test("ponto de rota mais próximo e leitura da ameaça", () => {
  assert.equal(nearestWaypoint({ x: 9, z: 9 }, sample), 2);
  assert.equal(alertOf("idle"), "calm");
  assert.equal(alertOf("patrol"), "calm");
  assert.equal(alertOf("return"), "calm");
  assert.equal(alertOf("detect"), "detect");
  assert.equal(alertOf("chase"), "chase");
});

test("as máquinas do jogo são válidas e dão chance de fuga", () => {
  for (const [id, machine] of Object.entries(machines)) {
    assert.deepEqual(validateMachine(machine), [], `máquina "${id}"`);
    assert.ok(machine.speed.chase < playerConfig.runSpeed, `"${id}" não pode ser mais rápida que a corrida`);
    assert.ok(machine.speed.chase > playerConfig.walkSpeed, `"${id}" precisa forçar a corrida`);
  }
});

/**
 * O gargalo: a única passagem entre o campo e a área da casa, onde os dois
 * círculos da zona se encontram. Se uma máquina guardar este ponto, quem
 * entra na casa não tem como voltar — a desistência por território nunca
 * dispara e não há desvio.
 */
function houseNeck() {
  const [field, house] = zones.arrival.bounds;
  const distance = Math.hypot(house.center[0] - field.center[0], house.center[1] - field.center[1]);
  const ux = (house.center[0] - field.center[0]) / distance;
  const uz = (house.center[1] - field.center[1]) / distance;
  return {
    x: (field.center[0] + field.radius * ux + house.center[0] - house.radius * ux) / 2,
    z: (field.center[1] + field.radius * uz + house.center[1] - house.radius * uz) / 2,
  };
}

test("nenhuma máquina guarda a única passagem para a casa", () => {
  const neck = houseNeck();
  for (const [id, machine] of Object.entries(machines)) {
    if (machine.zone !== "arrival") continue;
    assert.equal(inTerritory(neck, machine), false, `"${id}" acampa no gargalo da casa`);
    assert.equal(inTerritory({ x: HOUSE.x, z: HOUSE.z }, machine), false, `"${id}" persegue até dentro da casa`);
  }
});

test("a máquina do campo deixa livres a trilha dos guias e as duas pontas da travessia", () => {
  const sentinel = machines["field-sentinel"];
  assert.equal(inTerritory({ x: 0, z: 0 }, sentinel), false, "onde a Aysha desperta");
  assert.equal(inTerritory({ x: -2.4, z: -13 }, sentinel), false, "onde Cassandra espera");

  // E a ronda dela cabe inteira no território: ninguém patrulha fora de casa.
  for (const [x, z] of sentinel.route) {
    assert.equal(inTerritory({ x, z }, sentinel), true, `ponto de rota (${x}, ${z})`);
  }
});

test("dá para escapar da máquina do campo correndo até qualquer uma das pontas", () => {
  const sentinel = machines["field-sentinel"];
  const neck = houseNeck();
  const [centerX, centerZ] = sentinel.territory.center;
  // Do centro do território até sair dele, pelos dois lados.
  const paraOGargalo = Math.hypot(neck.x - centerX, neck.z - centerZ) - sentinel.territory.radius;
  const paraATrilha = Math.hypot(0 - centerX, 0 - centerZ) - sentinel.territory.radius;
  assert.ok(paraOGargalo > 0 && paraOGargalo < 8, `gargalo a ${paraOGargalo.toFixed(1)} m fora do território`);
  assert.ok(paraATrilha > 0 && paraATrilha < 8, `trilha a ${paraATrilha.toFixed(1)} m fora do território`);

  // Correndo, a distância até a borda mais longe se faz com folga sobre a máquina.
  const vantagem = playerConfig.runSpeed - sentinel.speed.chase;
  const fuga = (sentinel.territory.radius * 2) / playerConfig.runSpeed;
  assert.ok(vantagem * fuga > sentinel.reach, "a corrida abre distância suficiente antes da borda");
});
