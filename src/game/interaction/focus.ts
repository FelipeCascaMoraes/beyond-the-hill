import { INTERACTION_DEFAULTS, type InteractableEntry, type Point3 } from "./types.ts";

// Decide qual interativo está em foco. Lógica pura e testável.

export interface Viewer {
  /** Posição dos olhos. */
  position: Point3;
  /** Direção do olhar (normalizada). */
  direction: Point3;
}

/**
 * Tolerância extra para o alvo que já está em foco: evita o prompt piscar
 * quando a mira ou a distância oscilam no limite.
 */
export const FOCUS_HYSTERESIS = 1.15;

/** Alvos mirados sempre vencem alvos só por proximidade. */
const PROXIMITY_PENALTY = 1000;

export function findFocus(
  entries: Iterable<InteractableEntry>,
  viewer: Viewer,
  currentId: string | null,
): InteractableEntry | null {
  let best: InteractableEntry | null = null;
  let bestScore = Infinity;

  for (const entry of entries) {
    const { definition, position } = entry;
    if (definition.enabled === false || entry.used) continue;

    const tolerance = definition.id === currentId ? FOCUS_HYSTERESIS : 1;
    const reach = (definition.reach ?? INTERACTION_DEFAULTS.reach) * tolerance;

    const toX = position.x - viewer.position.x;
    const toY = position.y - viewer.position.y;
    const toZ = position.z - viewer.position.z;
    const distanceSq = toX * toX + toY * toY + toZ * toZ;
    if (distanceSq > reach * reach) continue;

    let score: number;
    if ((definition.mode ?? INTERACTION_DEFAULTS.mode) === "look") {
      // Raio do olhar contra uma esfera em volta do objeto.
      const along = toX * viewer.direction.x + toY * viewer.direction.y + toZ * viewer.direction.z;
      if (along <= 0) continue;
      const targetRadius = (definition.targetRadius ?? INTERACTION_DEFAULTS.targetRadius) * tolerance;
      if (distanceSq - along * along > targetRadius * targetRadius) continue;
      score = along;
    } else {
      score = Math.sqrt(distanceSq) + PROXIMITY_PENALTY;
    }

    if (score < bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return best;
}
