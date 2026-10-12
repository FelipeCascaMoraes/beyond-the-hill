"use client";

import { useState } from "react";
import { choices, type Choice, type ChoiceId } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { useKeyPress } from "../useKeyPress";

const CHOICE_KEYS: ReadonlySet<string> = new Set([
  "ArrowLeft",
  "ArrowRight",
  "KeyA",
  "KeyD",
  "KeyE",
  "Enter",
  "Space",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
]);

/** Mostra a decisão pedida agora, se houver. Uma instância nova por decisão. */
export function ChoicePrompt() {
  const id = useGameStore((state) => state.activeChoice);
  if (!id) return null;
  return <ChoiceView key={id} id={id} />;
}

/**
 * Uma decisão da Aysha (`content/choices.ts`): as opções lado a lado, com o
 * mesmo tamanho e o mesmo peso. Nenhuma começa marcada — não há resposta
 * sugerida. A/D ou setas para escolher, E/Enter para confirmar, 1–4 direto,
 * ou clique.
 */
function ChoiceView({ id }: { id: ChoiceId }) {
  const choice: Choice = choices[id];
  const makeChoice = useGameStore((state) => state.makeChoice);
  const [selected, setSelected] = useState<number | null>(null);
  const count = choice.options.length;

  useKeyPress(true, CHOICE_KEYS, (code) => {
    if (code === "ArrowLeft" || code === "KeyA") setSelected((index) => (index === null ? 0 : (index - 1 + count) % count));
    else if (code === "ArrowRight" || code === "KeyD") setSelected((index) => (index === null ? count - 1 : (index + 1) % count));
    else if (code.startsWith("Digit")) {
      const index = Number(code.slice(5)) - 1;
      if (index < count) makeChoice(choice.options[index].value);
    } else if (selected !== null) makeChoice(choice.options[selected].value);
  });

  return (
    <section
      aria-label="Escolha"
      className="pointer-events-auto absolute inset-0 flex animate-[choice-in_1.6s_ease-out] flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.7)_100%)] px-6 text-center motion-reduce:animate-none"
    >
      {choice.prompt && (
        <p className="font-serif text-[clamp(1.1rem,2vw,1.4rem)] font-light tracking-[0.04em] text-stone-200/80 italic [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
          {choice.prompt}
        </p>
      )}
      <ul className="mt-[clamp(2rem,7vh,4rem)] flex flex-col items-center gap-6 sm:flex-row sm:gap-[clamp(3rem,10vw,9rem)]">
        {choice.options.map((option, index) => {
          const active = index === selected;
          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => makeChoice(option.value)}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                className={`group flex items-center gap-4 px-4 py-3 font-light tracking-[0.45em] uppercase transition-colors duration-700 outline-none [text-shadow:0_1px_14px_rgba(0,0,0,0.7)] ${
                  active ? "text-stone-50" : "text-stone-300/70"
                }`}
              >
                <span aria-hidden className={`text-stone-500 transition-transform duration-700 ${active ? "-translate-x-1.5" : ""}`}>
                  [
                </span>
                <span className="pl-[0.45em] text-[clamp(1rem,2.2vw,1.35rem)]">{option.label}</span>
                <span aria-hidden className={`text-stone-500 transition-transform duration-700 ${active ? "translate-x-1.5" : ""}`}>
                  ]
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
