import type { DialogueId } from "../../content/dialogues.ts";
import type { AreaTrigger } from "../../content/types.ts";
import type { ZoneId } from "../../content/zones.ts";

// Gatilhos de área: lógica pura.

/** Primeiro gatilho da zona que contém o ponto e cujo diálogo ainda não aconteceu. */
export function areaTriggerAt<Id extends string>(
  triggers: Readonly<Record<Id, AreaTrigger>>,
  zone: ZoneId,
  x: number,
  z: number,
  seenDialogues: readonly DialogueId[],
): Id | null {
  for (const id of Object.keys(triggers) as Id[]) {
    const trigger = triggers[id];
    if (trigger.zone !== zone || seenDialogues.includes(trigger.dialogue)) continue;
    if (Math.hypot(x - trigger.center[0], z - trigger.center[1]) <= trigger.radius) return id;
  }
  return null;
}
