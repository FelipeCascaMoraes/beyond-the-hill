"use client";

import { useSyncExternalStore } from "react";
import { getAscent, subscribeAscent } from "@/game/world/ascentSignal";

/**
 * O quanto da subida já foi vencido (0 a 1), 0 fora da encosta. A interface
 * usa isto para ir saindo da frente: quanto mais alto, menos jogo na tela.
 */
export function useAscent(): number {
  return useSyncExternalStore(subscribeAscent, getAscent, () => 0);
}
