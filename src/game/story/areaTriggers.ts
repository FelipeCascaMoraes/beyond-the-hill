import type { AreaTrigger } from "../../content/types.ts";
import type { ZoneId } from "../../content/zones.ts";
import { meetsRequirement, type StoryContext } from "./requirements.ts";

// Gatilhos de área: lógica pura.

/**
 * Primeiro gatilho da zona que contém o ponto, cujo diálogo ainda não
 * aconteceu e cuja condição narrativa já se cumpriu.
 */
export function areaTriggerAt<Id extends string>(
  triggers: Readonly<Record<Id, AreaTrigger>>,
  zone: ZoneId,
  x: number,
  z: number,
  context: StoryContext,
): Id | null {
  for (const id of Object.keys(triggers) as Id[]) {
    const trigger = triggers[id];
    if (trigger.zone !== zone || context.seenDialogues.includes(trigger.dialogue)) continue;
    if (!meetsRequirement(trigger.requires, context)) continue;
    if (Math.hypot(x - trigger.center[0], z - trigger.center[1]) <= trigger.radius) return id;
  }
  return null;
}
