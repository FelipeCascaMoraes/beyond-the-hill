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
      className={`absolute inset-x-0 bottom-[8vh] mx-auto w-[min(96%,50rem)] animate-[dialogue-box-in_0.45s_ease-out] motion-reduce:animate-none ${
        blocking ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Sem caixa: uma sombra que se dissolve nas bordas, como legenda de cinema.
          O texto fica legível e a cena continua inteira atrás dele. */}
      <div className="bg-[radial-gradient(closest-side,rgba(8,6,4,0.5)_0%,rgba(8,6,4,0.32)_55%,transparent_100%)] px-16 py-10 text-stone-100 [text-shadow:0_1px_14px_rgba(0,0,0,0.85)]">
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
