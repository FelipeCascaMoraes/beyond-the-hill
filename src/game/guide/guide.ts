import type { GuidePassage, GuideStep, GuideTarget } from "../../content/types.ts";
import type { ZoneId } from "../../content/zones.ts";
import { meetsRequirement, type StoryContext } from "../story/requirements.ts";

// O roteiro: qual passo vale agora e para onde a seta aponta. Lógica pura.

/** O que a tela mostra: o passo atual, ou o caminho até a zona dele. */
export interface GuideView {
  title: string;
  hint: string;
  target?: GuideTarget;
  /** Quantos já foram, de quantos ("2 de 3"). */
  tally?: { done: number; of: number };
}

/** Primeiro passo (na ordem declarada) ainda não cumprido. `null`: não há mais o que dizer. */
export function currentStep<Id extends string>(steps: Readonly<Record<Id, GuideStep>>, context: StoryContext): Id | null {
  for (const id of Object.keys(steps) as Id[]) {
    if (!meetsRequirement(steps[id].until, context)) return id;
  }
  return null;
}

/**
 * O que dizer agora. Na zona do passo, o próprio passo; em outra, a passagem
 * que leva até lá — e, se não houver nenhuma, o passo sem seta.
 */
export function currentGuide<Id extends string>(
  steps: Readonly<Record<Id, GuideStep>>,
  passages: readonly GuidePassage[],
  zone: ZoneId,
  context: StoryContext,
): GuideView | null {
  const id = currentStep(steps, context);
  if (!id) return null;
  const step = steps[id];
  if (step.zone !== zone) {
    const passage = passages.find((candidate) => candidate.from === zone && candidate.to.includes(step.zone));
    if (passage) return { title: passage.title, hint: passage.hint, target: { type: "point", position: passage.position } };
    return { title: step.title, hint: step.hint };
  }
  const tally = step.tally && {
    done: Math.min(step.tally.of, step.tally.dialogues.filter((dialogue) => context.seenDialogues.includes(dialogue)).length),
    of: step.tally.of,
  };
  return { title: step.title, hint: step.hint, target: step.target, ...(tally ? { tally } : {}) };
}

/** Um lugar para a seta, e quanto falta até ele (m). */
export interface GuideDirection {
  x: number;
  z: number;
  distance: number;
}

/** Quantos metros adiante no caminho a seta mira: longe o bastante para não tremer nas curvas. */
const TRAIL_AHEAD = 30;

/** Para onde apontar a partir de (x, z). `null`: nada sobrou para apontar. */
export function resolveTarget(target: GuideTarget, x: number, z: number, context: StoryContext): GuideDirection | null {
  if (target.type === "point") {
    const [px, pz] = target.position;
    return { x: px, z: pz, distance: Math.hypot(px - x, pz - z) };
  }
  if (target.type === "trail") return pointAhead(target.path, x, z, TRAIL_AHEAD);

  let best: GuideDirection | null = null;
  for (const point of target.points) {
    if (context.seenDialogues.includes(point.dialogue)) continue;
    const distance = Math.hypot(point.position[0] - x, point.position[1] - z);
    if (!best || distance < best.distance) best = { x: point.position[0], z: point.position[1], distance };
  }
  return best;
}

/**
 * O ponto do caminho `ahead` metros adiante de onde (x, z) cai nele, e quanto
 * do caminho ainda falta até o fim. Perto do fim, o ponto é o próprio fim.
 */
export function pointAhead(path: readonly { x: number; z: number }[], x: number, z: number, ahead: number): GuideDirection | null {
  if (path.length === 0) return null;
  if (path.length === 1) return { x: path[0].x, z: path[0].z, distance: Math.hypot(path[0].x - x, path[0].z - z) };

  // Onde (x, z) cai no caminho: o trecho mais próximo e o quanto dele já passou.
  let nearest = Infinity;
  let segment = 0;
  let along = 0;
  for (let index = 0; index < path.length - 1; index++) {
    const from = path[index];
    const to = path[index + 1];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) continue;
    const t = Math.min(1, Math.max(0, ((x - from.x) * dx + (z - from.z) * dz) / (length * length)));
    const off = Math.hypot(x - (from.x + dx * t), z - (from.z + dz * t));
    if (off < nearest) {
      nearest = off;
      segment = index;
      along = t * length;
    }
  }

  let remaining = -along;
  for (let index = segment; index < path.length - 1; index++) {
    remaining += Math.hypot(path[index + 1].x - path[index].x, path[index + 1].z - path[index].z);
  }

  // Anda `ahead` metros a partir dali, trecho a trecho.
  let left = along + ahead;
  for (let index = segment; index < path.length - 1; index++) {
    const from = path[index];
    const to = path[index + 1];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (left <= length && length > 1e-6) {
      const t = left / length;
      return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, distance: remaining };
    }
    left -= length;
  }
  const end = path[path.length - 1];
  return { x: end.x, z: end.z, distance: remaining };
}

/**
 * Ângulo da seta na tela (rad, horário, 0 = em frente) para quem está em
 * (x, z) olhando com este `yaw` — a câmera olha para -Z com yaw 0, e yaw
 * positivo vira para a esquerda.
 */
export function arrowAngle(x: number, z: number, yaw: number, targetX: number, targetZ: number): number {
  const bearing = Math.atan2(-(targetX - x), -(targetZ - z));
  const relative = bearing - yaw;
  return -Math.atan2(Math.sin(relative), Math.cos(relative));
}
