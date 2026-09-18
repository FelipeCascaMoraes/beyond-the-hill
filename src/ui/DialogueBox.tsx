"use client";

import { dialogues, type CharacterId } from "@/content";
import { useCharacterLabel } from "@/game/dialogue/useCharacterLabel";
import { useGameStore } from "@/game/state/gameStore";
import { useAdvanceKeys } from "./useAdvanceKeys";

/** Caixa de diálogo: quem fala, a fala e como continuar. Clique ou E / Espaço / Enter. */
export function DialogueBox() {
  const activeDialogue = useGameStore((state) => state.activeDialogue);
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);
  useAdvanceKeys(activeDialogue !== null, advanceDialogue);

  if (!activeDialogue) return null;
  const { lines } = dialogues[activeDialogue.id];
  const line = lines[activeDialogue.lineIndex];
  const isLast = activeDialogue.lineIndex === lines.length - 1;

  return (
    <button
      type="button"
      onClick={advanceDialogue}
      className="pointer-events-auto absolute inset-x-0 bottom-[8vh] mx-auto block w-[min(92%,42rem)] bg-gradient-to-b from-black/55 to-black/70 px-7 py-5 text-left text-stone-100 backdrop-blur-[2px]"
    >
      {/* key: reinicia a animação de entrada a cada fala. */}
      <span key={`${activeDialogue.id}-${activeDialogue.lineIndex}`} className="block animate-[dialogue-in_0.5s_ease-out] motion-reduce:animate-none">
        <SpeakerLabel id={line.speaker} />
        <span className={`mt-2 block font-serif text-xl leading-relaxed ${line.speaker === "aysha" ? "text-stone-300 italic" : ""}`}>
          {line.text}
        </span>
      </span>
      <span className="mt-3 block text-right text-[0.65rem] tracking-[0.3em] text-stone-400/80 uppercase">
        {isLast ? "[ E ] encerrar" : "[ E ] continuar"}
      </span>
    </button>
  );
}

function SpeakerLabel({ id }: { id: CharacterId }) {
  const label = useCharacterLabel(id);
  return <span className="block text-xs tracking-[0.25em] text-stone-400 uppercase">{label}</span>;
}
