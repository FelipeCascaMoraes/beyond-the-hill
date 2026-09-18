"use client";

import { dialogues } from "@/content";
import { useGameStore } from "@/game/state/gameStore";

export function DialogueBox() {
  const activeDialogue = useGameStore((state) => state.activeDialogue);
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);

  if (!activeDialogue) return null;
  const line = dialogues[activeDialogue.id].lines[activeDialogue.lineIndex];

  return (
    <button
      type="button"
      onClick={advanceDialogue}
      className="pointer-events-auto absolute inset-x-0 bottom-10 mx-auto block w-[min(90%,40rem)] bg-black/60 px-6 py-4 text-left text-stone-100"
    >
      <span className="block text-xs tracking-[0.2em] text-stone-400 uppercase">{line.speaker}</span>
      <span className="mt-1 block text-lg">{line.text}</span>
    </button>
  );
}
