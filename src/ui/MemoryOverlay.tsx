"use client";

import { memories } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { ADVANCE_KEYS, useKeyPress } from "./useKeyPress";

export function MemoryOverlay() {
  const activeMemory = useGameStore((state) => state.activeMemory);
  const closeMemory = useGameStore((state) => state.closeMemory);
  useKeyPress(activeMemory !== null, ADVANCE_KEYS, closeMemory);

  if (!activeMemory) return null;
  const memory = memories[activeMemory];

  return (
    <button
      type="button"
      onClick={closeMemory}
      className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-8 text-center text-stone-200"
    >
      <span className="text-xs tracking-[0.3em] text-stone-500 uppercase">{memory.title}</span>
      <span className="max-w-xl text-2xl font-light italic">{memory.text}</span>
    </button>
  );
}
