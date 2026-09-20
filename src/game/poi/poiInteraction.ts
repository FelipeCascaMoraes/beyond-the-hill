import type { PointOfInterest } from "../../content/types.ts";
import type { InteractionAction } from "../interaction/types.ts";
import type { MemoryStatus } from "../memory/memoryLogic.ts";

// O que um ponto de interesse oferece agora, conforme o estado da memória ligada a ele.

export interface PoiInteraction {
  prompt: string;
  action: InteractionAction;
}

/**
 * - passagem aberta para outra zona: atravessar (vem antes de tudo);
 * - sem memória, ou memória bloqueada: examinar (pensamento original);
 * - memória desbloqueada e não vivida: entrar na memória;
 * - memória já vivida: pensamento posterior (se houver).
 */
export function poiInteraction(
  poi: PointOfInterest,
  memoryStatus: MemoryStatus | null,
  travelOpen = false,
): PoiInteraction {
  const { memory } = poi;
  if (poi.travel && travelOpen) {
    return { prompt: poi.travel.prompt, action: { type: "travel", zone: poi.travel.zone } };
  }
  if (memory && memoryStatus === "unlocked") {
    return { prompt: memory.prompt, action: { type: "memory", memory: memory.id } };
  }
  const dialogue = memory && memoryStatus === "recovered" && memory.afterDialogue ? memory.afterDialogue : poi.dialogue;
  return { prompt: poi.prompt, action: { type: "dialogue", dialogue } };
}
