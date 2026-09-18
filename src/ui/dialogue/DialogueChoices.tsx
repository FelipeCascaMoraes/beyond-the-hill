"use client";

import { useState } from "react";
import type { DialogueChoice } from "@/content";
import { useKeyPress } from "../useKeyPress";

const CHOICE_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "KeyW",
  "KeyS",
  "KeyE",
  "Enter",
  "Space",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
]);

interface DialogueChoicesProps {
  choices: readonly DialogueChoice[];
  onChoose: (index: number) => void;
}

/** Escolhas da Aysha: setas/W/S para navegar, E/Enter para escolher, 1–4 direto, ou clique. */
export function DialogueChoices({ choices, onChoose }: DialogueChoicesProps) {
  const [selected, setSelected] = useState(0);

  useKeyPress(true, CHOICE_KEYS, (code) => {
    if (code === "ArrowUp" || code === "KeyW") setSelected((index) => (index - 1 + choices.length) % choices.length);
    else if (code === "ArrowDown" || code === "KeyS") setSelected((index) => (index + 1) % choices.length);
    else if (code.startsWith("Digit")) {
      const index = Number(code.slice(5)) - 1;
      if (index < choices.length) onChoose(index);
    } else onChoose(selected);
  });

  return (
    <ul className="flex flex-col gap-1">
      {choices.map((choice, index) => (
        <li key={choice.text}>
          <button
            type="button"
            onClick={() => onChoose(index)}
            onMouseEnter={() => setSelected(index)}
            className={`flex w-full items-baseline gap-3 py-1 text-left font-serif text-lg transition-colors duration-300 ${
              index === selected ? "text-stone-50" : "text-stone-400"
            }`}
          >
            <span className="w-4 text-xs text-stone-500">{index === selected ? "›" : index + 1}</span>
            <span className="italic">{choice.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
