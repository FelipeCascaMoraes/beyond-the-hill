"use client";

import { dialogues } from "@/content";
import { currentStep } from "@/game/dialogue/runner";
import { useGameStore } from "@/game/state/gameStore";
import { DialogueChoices } from "./DialogueChoices";
import { DialogueLineView } from "./DialogueLineView";

/**
 * Caixa de diálogo genérica: mostra a etapa atual (fala ou escolhas) do
 * diálogo aberto. Todo o texto vem de `content/dialogues.ts`.
 */
export function DialogueBox() {
  const activeDialogue = useGameStore((state) => state.activeDialogue);
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);
  const chooseDialogueOption = useGameStore((state) => state.chooseDialogueOption);

  if (!activeDialogue) return null;
  const dialogue = dialogues[activeDialogue.id];
  const blocking = dialogue.blocksMovement !== false;
  const step = currentStep(dialogue, activeDialogue.cursor);
  // Uma chave por etapa: cada fala recomeça a animação.
  const stepKey = `${activeDialogue.id}:${activeDialogue.cursor.node}:${activeDialogue.cursor.line}`;

  return (
    <section
      aria-label="Diálogo"
      className={`absolute inset-x-0 bottom-[8vh] mx-auto w-[min(92%,42rem)] animate-[dialogue-box-in_0.45s_ease-out] motion-reduce:animate-none ${
        blocking ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div className="bg-gradient-to-b from-black/55 to-black/70 px-7 py-5 text-stone-100 backdrop-blur-[2px]">
        <div key={stepKey} className="animate-[dialogue-in_0.4s_ease-out] motion-reduce:animate-none">
          {step.kind === "line" ? (
            <DialogueLineView line={step.line} isFinal={step.isFinal} blocking={blocking} onAdvance={advanceDialogue} />
          ) : (
            <DialogueChoices choices={step.choices} onChoose={chooseDialogueOption} />
          )}
        </div>
      </div>
    </section>
  );
}
