import type { MachineDefinition } from "../../content/types.ts";

// A máquina do Além: lógica pura de patrulha e perseguição.
// Sem React, sem Three.js — recebe onde a Aysha está e move a máquina.
//
//                 ┌──── espera ────┐
//   IDLE ─────────┘                └────► PATROL ──chega ao ponto──► IDLE
//     │                                     │
//     └──────────── vê a Aysha ─────────────┴──► DETECT ──confirma──► CHASE
//                                                  │                    │
//                          perde de vista ─────────┴──► RETURN ◄────────┘
//                                                        │      (sai do território,
//                                                        ▼       se esconde ou some)
//                                                       IDLE
//
// Ela não ataca e não tem arma: chegar perto demais devolve o evento "caught"
// para quem chama, que decide o que fazer (ver ui/machine e o estado do jogo).

export type MachineState = "idle" | "patrol" | "detect" | "chase" | "return";

/** O quanto a ameaça pesa agora, para a UI e o som. */
export type MachineAlert = "calm" | "detect" | "chase";

/** Uma máquina viva no mundo. */
export interface MachineActor {
  state: MachineState;
  x: number;
  z: number;
  /** Para onde olha (rad): a frente é (sin yaw, cos yaw). */
  yaw: number;
  /** Ponto da rota que está buscando. */
  waypoint: number;
  /** Tempo dentro do estado atual (s). */
  elapsed: number;
  /** Há quanto tempo perdeu a Aysha de vista (s). */
  unseen: number;
  /** Onde a viu pela última vez. */
  lastSeenX: number;
  lastSeenZ: number;
}

/** Onde a Aysha está, e se está à vista. */
export interface MachineTarget {
  x: number;
  z: number;
  /** Abrigada (dentro de casa): a máquina não a enxerga, por mais perto que esteja. */
  sheltered: boolean;
}

/** Círculo no plano XZ em que a máquina não entra (a casa). */
export interface KeepOut {
  x: number;
  z: number;
  radius: number;
}

/** O que aconteceu neste passo, para quem chama reagir. */
export type MachineEvent = "caught" | null;

/** Rapidez do giro (maior = vira mais rápido). */
const TURN_RATE = 2.2;
/** Distância que conta como "chegou" a um ponto (m). */
const ARRIVE_RADIUS = 0.6;
/** Tempo mínimo voltando antes de poder detectar de novo (s): ela está de costas. */
const RETURN_GRACE = 1.2;

/** Diferença angular pelo caminho mais curto, em (-π, π]. */
const angleDelta = (from: number, to: number): number => Math.atan2(Math.sin(to - from), Math.cos(to - from));

const distanceBetween = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(bx - ax, bz - az);

export function createMachineActor(machine: MachineDefinition): MachineActor {
  const [x, z] = machine.route[0];
  const [nextX, nextZ] = machine.route[1 % machine.route.length];
  return {
    state: "idle",
    x,
    z,
    yaw: Math.atan2(nextX - x, nextZ - z),
    waypoint: 1 % machine.route.length,
    elapsed: 0,
    unseen: 0,
    lastSeenX: x,
    lastSeenZ: z,
  };
}

/** A Aysha está à vista? Cone de visão, mais um raio em que ela é notada de qualquer jeito. */
export function canSee(actor: MachineActor, target: MachineTarget, machine: MachineDefinition): boolean {
  if (target.sheltered) return false;
  const distance = distanceBetween(actor.x, actor.z, target.x, target.z);
  if (distance > machine.vision.range) return false;
  if (distance <= machine.vision.awareness) return true;
  const toTarget = Math.atan2(target.x - actor.x, target.z - actor.z);
  return Math.abs(angleDelta(actor.yaw, toTarget)) <= machine.vision.halfAngle;
}

/** A Aysha ainda está na área que esta máquina guarda? */
export function inTerritory(target: { x: number; z: number }, machine: MachineDefinition): boolean {
  const [centerX, centerZ] = machine.territory.center;
  return distanceBetween(centerX, centerZ, target.x, target.z) <= machine.territory.radius;
}

/** Peso da ameaça no estado atual: o que a UI e o som seguem. */
export function alertOf(state: MachineState): MachineAlert {
  if (state === "chase") return "chase";
  if (state === "detect") return "detect";
  return "calm";
}

/** Ponto da rota mais próximo: por onde a máquina retoma a patrulha. */
export function nearestWaypoint(actor: { x: number; z: number }, machine: MachineDefinition): number {
  let best = 0;
  let bestDistance = Infinity;
  machine.route.forEach(([x, z], index) => {
    const distance = distanceBetween(actor.x, actor.z, x, z);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

const enter = (actor: MachineActor, state: MachineState): void => {
  actor.state = state;
  actor.elapsed = 0;
};

function turnToward(actor: MachineActor, x: number, z: number, dt: number): void {
  const target = Math.atan2(x - actor.x, z - actor.z);
  actor.yaw += angleDelta(actor.yaw, target) * (1 - Math.exp(-TURN_RATE * dt));
}

/** Avança na direção do ponto (virando para ele). Verdadeiro ao chegar. */
function moveToward(actor: MachineActor, x: number, z: number, speed: number, dt: number): boolean {
  const distance = distanceBetween(actor.x, actor.z, x, z);
  if (distance < 1e-4) return true;
  turnToward(actor, x, z, dt);
  const step = Math.min(speed * dt, distance);
  actor.x += ((x - actor.x) / distance) * step;
  actor.z += ((z - actor.z) / distance) * step;
  return distance - step <= ARRIVE_RADIUS;
}

/** Empurra a máquina para fora dos círculos em que ela não entra (a casa). */
function keepOutOf(actor: MachineActor, circles: readonly KeepOut[]): void {
  for (const circle of circles) {
    const awayX = actor.x - circle.x;
    const awayZ = actor.z - circle.z;
    const distance = Math.hypot(awayX, awayZ);
    if (distance >= circle.radius) continue;
    if (distance < 1e-6) {
      actor.x = circle.x + circle.radius;
      continue;
    }
    actor.x = circle.x + (awayX / distance) * circle.radius;
    actor.z = circle.z + (awayZ / distance) * circle.radius;
  }
}

/**
 * Um passo da máquina. Altera o ator e devolve o que aconteceu.
 * `dt` em segundos; quem chama deve limitá-lo (abas em segundo plano).
 */
export function updateMachine(
  actor: MachineActor,
  target: MachineTarget,
  dt: number,
  machine: MachineDefinition,
  keepOut: readonly KeepOut[] = [],
): MachineEvent {
  actor.elapsed += dt;
  const sees = canSee(actor, target, machine);
  if (sees) {
    actor.unseen = 0;
    actor.lastSeenX = target.x;
    actor.lastSeenZ = target.z;
  } else {
    actor.unseen += dt;
  }

  let event: MachineEvent = null;

  switch (actor.state) {
    // Parada no ponto da rota, olhando o campo.
    case "idle":
      if (sees) enter(actor, "detect");
      else if (actor.elapsed >= machine.pause) enter(actor, "patrol");
      break;

    // Rota em ciclo; cada ponto alcançado vira uma pausa.
    case "patrol": {
      if (sees) {
        enter(actor, "detect");
        break;
      }
      const [x, z] = machine.route[actor.waypoint];
      if (moveToward(actor, x, z, machine.speed.patrol, dt)) {
        actor.waypoint = (actor.waypoint + 1) % machine.route.length;
        enter(actor, "idle");
      }
      break;
    }

    // Viu alguma coisa: para, vira-se e confirma antes de ir atrás.
    case "detect":
      turnToward(actor, actor.lastSeenX, actor.lastSeenZ, dt);
      if (!sees) enter(actor, "return");
      else if (actor.elapsed >= machine.timing.detect) enter(actor, "chase");
      break;

    // Perseguição. Desiste se a Aysha sai do território ou some por tempo demais.
    case "chase": {
      if (!inTerritory(target, machine) || actor.unseen >= machine.timing.lose) {
        enterReturn(actor, machine);
        break;
      }
      const reached = distanceBetween(actor.x, actor.z, actor.lastSeenX, actor.lastSeenZ) <= machine.reach;
      if (sees && reached) event = "caught";
      else moveToward(actor, actor.lastSeenX, actor.lastSeenZ, machine.speed.chase, dt);
      break;
    }

    // Voltando para a rota. Só torna a ver depois de se recompor.
    case "return": {
      if (sees && actor.elapsed >= RETURN_GRACE) {
        enter(actor, "detect");
        break;
      }
      const [x, z] = machine.route[actor.waypoint];
      if (moveToward(actor, x, z, machine.speed.return, dt)) {
        actor.waypoint = (actor.waypoint + 1) % machine.route.length;
        enter(actor, "idle");
      }
      break;
    }
  }

  keepOutOf(actor, keepOut);
  return event;
}

/** Desistiu: retoma a patrulha pelo ponto de rota mais próximo. */
function enterReturn(actor: MachineActor, machine: MachineDefinition): void {
  actor.waypoint = nearestWaypoint(actor, machine);
  enter(actor, "return");
}

/** Problemas estruturais de uma máquina (vazio = ok). Usado pelos testes de dados. */
export function validateMachine(machine: MachineDefinition): string[] {
  const problems: string[] = [];
  if (machine.route.length < 2) problems.push("rota precisa de ao menos dois pontos");
  machine.route.forEach(([x, z], index) => {
    if (!inTerritory({ x, z }, machine)) problems.push(`ponto ${index} da rota fora do território`);
  });
  if (machine.speed.chase <= machine.speed.patrol) problems.push("perseguir devia ser mais rápido que patrulhar");
  if (machine.vision.awareness > machine.vision.range) problems.push("percebe de costas mais longe do que enxerga");
  if (machine.reach <= 0) problems.push("alcance precisa ser positivo");
  return problems;
}
