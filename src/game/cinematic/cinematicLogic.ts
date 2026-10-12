import { choices, isChoiceValue, type ChoiceId } from "../../content/choices.ts";
import type { Cinematic, CinematicStep } from "../../content/types.ts";
import type { ZoneId } from "../../content/zones.ts";
import { meetsRequirement, type StoryContext } from "../story/requirements.ts";

// Regras genéricas das cenas. Lógica pura: não conhece nenhuma cena específica.

/** O progresso, mais as cenas que já começaram (cada uma acontece uma vez). */
export interface CinematicContext extends StoryContext {
  seenCinematics: readonly string[];
}

/**
 * Primeira cena da zona cujo círculo contém o ponto, ainda não vista e com a
 * condição narrativa cumprida. `null` se nenhuma. (A espera de `delay` é de
 * quem chama: aqui só se diz se o lugar e a hora são estes.)
 */
export function cinematicAt<Id extends string>(
  cinematics: Readonly<Record<Id, Cinematic>>,
  zone: ZoneId,
  x: number,
  z: number,
  context: CinematicContext,
): Id | null {
  for (const id of Object.keys(cinematics) as Id[]) {
    const cinematic = cinematics[id];
    if (cinematic.zone !== zone || context.seenCinematics.includes(id)) continue;
    if (!meetsRequirement(cinematic.requires, context)) continue;
    const [cx, cz] = cinematic.trigger.center;
    if (Math.hypot(x - cx, z - cz) <= cinematic.trigger.radius) return id;
  }
  return null;
}

/** O passo acontece agora? Sem `when`, sempre; com `when`, se a história deixar. */
export const stepApplies = (step: CinematicStep, context: StoryContext): boolean => meetsRequirement(step.when, context);

/**
 * Quanto tempo o passo segura a cena (s). `null` quando quem decide o fim é
 * outra coisa: um diálogo que o jogador avança, uma lembrança que termina,
 * uma escolha feita — ou nada, no fim do jogo.
 */
export function stepDuration(step: CinematicStep): number | null {
  switch (step.type) {
    case "shot":
      return step.wait ?? step.move;
    case "pause":
    case "title":
      return step.seconds;
    case "flags":
      return 0;
    case "dialogue":
    case "memory":
    case "choice":
    case "finale":
      return null;
  }
}

/** Problemas estruturais de uma cena (vazio = ok). Usado pelos testes de dados. */
export function validateCinematic(cinematic: Cinematic): string[] {
  const problems: string[] = [];
  if (cinematic.steps.length === 0) problems.push("sem passos");
  if (cinematic.trigger.radius <= 0) problems.push("gatilho sem raio");
  if ((cinematic.trigger.delay ?? 0) < 0) problems.push("espera negativa");

  const asked = new Set<ChoiceId>();
  cinematic.steps.forEach((step, index) => {
    const seconds = stepDuration(step);
    if (seconds !== null && seconds < 0) problems.push(`passo ${index} com tempo negativo`);
    if (step.type === "shot" && step.move <= 0) problems.push(`passo ${index}: a câmera não pode saltar`);
    if (step.type === "title" && !step.text.trim()) problems.push(`passo ${index}: título vazio`);
    if (step.type === "finale" && index !== cinematic.steps.length - 1) problems.push(`passo ${index}: nada vem depois do fim`);
    if (step.type === "choice") {
      if (choices[step.choice].options.length < 2) problems.push(`passo ${index}: uma escolha precisa de duas opções`);
      asked.add(step.choice);
    }
    // Um ramo que depende de uma escolha precisa vir depois dela, e pedir um
    // valor que existe — senão é um trecho que nunca toca.
    for (const id of Object.keys(step.when?.choices ?? {}) as ChoiceId[]) {
      const value = step.when?.choices?.[id] ?? "";
      if (!isChoiceValue(id, value)) problems.push(`passo ${index}: "${value}" não é opção de "${id}"`);
      if (!asked.has(id)) problems.push(`passo ${index}: depende de "${id}" antes de ela ser pedida`);
    }
  });

  const ends = cinematic.steps[cinematic.steps.length - 1]?.type === "finale";
  if (ends && cinematic.release) problems.push("uma cena que termina o jogo não devolve o controle");
  if (!ends && !cinematic.release) problems.push("sem lugar para devolver o controle");

  // A volta do controle não pode ter emenda: a Aysha fica exatamente onde o
  // último enquadramento estava.
  const lastShot = [...cinematic.steps].reverse().find((step) => step.type === "shot");
  if (cinematic.release && lastShot?.type === "shot") {
    const [x, , z] = lastShot.shot.position;
    const [rx, rz] = cinematic.release.position;
    if (Math.hypot(x - rx, z - rz) > 0.05) problems.push("o controle volta longe do último enquadramento");
  }
  return problems;
}

/**
 * Os passos que tocam, na ordem, para um conjunto de decisões. Serve para
 * conferir cada ramo de uma cena como se fosse uma cena só.
 */
export function stepsFor(cinematic: Cinematic, context: StoryContext): readonly CinematicStep[] {
  return cinematic.steps.filter((step) => stepApplies(step, context));
}
