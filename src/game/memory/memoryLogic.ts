import type { Memory } from "../../content/types.ts";
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

/** Problemas estruturais de uma memória (vazio = ok). Usado pelos testes de dados. */
export function validateMemory(memory: Memory): string[] {
  const problems: string[] = [];
  if (!memory.title.trim()) problems.push("sem título");
  if (!memory.description.trim()) problems.push("sem descrição");
  if (memory.fragments.length === 0) problems.push("sem fragmentos");
  memory.fragments.forEach((fragment, index) => {
    if (!fragment.text.trim()) problems.push(`fragmento ${index} sem texto`);
  });
  if (memory.trigger.type === "auto" && memory.trigger.delay < 0) problems.push("atraso negativo");
  return problems;
}
