import type { Memory, MemoryTone } from "../../content/types.ts";
import { meetsRequirement, type StoryContext } from "../story/requirements.ts";

// Regras genéricas de memórias. Lógica pura: não conhece nenhuma memória específica.

export type MemoryStatus = "locked" | "unlocked" | "recovered";

export function memoryStatus<Id extends string>(id: Id, memory: Memory, context: StoryContext): MemoryStatus {
  if ((context.recoveredMemories as readonly string[]).includes(id)) return "recovered";
  return meetsRequirement(memory.unlock, context) ? "unlocked" : "locked";
}

/** Memórias recuperadas podem ser revividas; bloqueadas, não. */
export const canActivate = (status: MemoryStatus): boolean => status !== "locked";

/** Primeira memória automática desbloqueada e ainda não vivida (na ordem declarada). */
export function nextAutoMemory<Id extends string>(
  memories: Readonly<Record<Id, Memory>>,
  context: StoryContext,
): Id | null {
  for (const id of Object.keys(memories) as Id[]) {
    const memory = memories[id];
    if (memory.trigger.type === "auto" && memoryStatus(id, memory, context) === "unlocked") return id;
  }
  return null;
}

export const isLastFragment = (memory: Memory, index: number): boolean => index >= memory.fragments.length - 1;

/** Clima padrão de uma lembrança. */
export const DEFAULT_TONE: MemoryTone = "warm";

/**
 * Clima em vigor num fragmento: o último declarado até ele (uma memória pode
 * virar no meio), ou o clima da própria memória.
 */
export function fragmentTone(memory: Memory, index: number): MemoryTone {
  for (let i = Math.min(index, memory.fragments.length - 1); i >= 0; i--) {
    const tone = memory.fragments[i].tone;
    if (tone) return tone;
  }
  return memory.tone ?? DEFAULT_TONE;
}

/** Climas pelos quais a memória passa, na ordem em que aparecem (nunca vazio). */
export function memoryTones(memory: Memory): readonly MemoryTone[] {
  const tones: MemoryTone[] = [];
  for (let index = 0; index < memory.fragments.length; index++) {
    const tone = fragmentTone(memory, index);
    if (!tones.includes(tone)) tones.push(tone);
  }
  return tones.length ? tones : [memory.tone ?? DEFAULT_TONE];
}

/** Tempo padrão de um fragmento em memórias que avançam sozinhas (s). */
export const DEFAULT_FRAGMENT_DURATION = 2.5;

export const fragmentDuration = (memory: Memory, index: number): number =>
  memory.fragments[index]?.duration ?? DEFAULT_FRAGMENT_DURATION;

/** Duração total dos fragmentos (sem as transições de entrada e saída), em segundos. */
export const totalDuration = (memory: Memory): number =>
  memory.fragments.reduce((sum, _, index) => sum + fragmentDuration(memory, index), 0);

/** Problemas estruturais de uma memória (vazio = ok). Usado pelos testes de dados. */
export function validateMemory(memory: Memory): string[] {
  const problems: string[] = [];
  if (!memory.title.trim()) problems.push("sem título");
  if (!memory.description.trim()) problems.push("sem descrição");
  if (memory.fragments.length === 0) problems.push("sem fragmentos");
  memory.fragments.forEach((fragment, index) => {
    if (!fragment.text.trim()) problems.push(`fragmento ${index} sem texto`);
    if (fragment.duration !== undefined && fragment.duration < 1) problems.push(`fragmento ${index} curto demais para ler`);
  });
  if (memory.fragments[0]?.tone && memory.fragments[0].tone !== (memory.tone ?? DEFAULT_TONE)) {
    problems.push("o primeiro fragmento vira o clima: declare-o na memória");
  }
  if (memory.trigger.type === "auto" && memory.trigger.delay < 0) problems.push("atraso negativo");
  return problems;
}
