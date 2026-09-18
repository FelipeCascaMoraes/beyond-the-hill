"use client";

import { useEffect, useState } from "react";
import type { CharacterId, DialogueLine } from "@/content";
import { useCharacterLabel } from "@/game/dialogue/useCharacterLabel";
import { prefersReducedMotion } from "@/lib/motion";
import { ADVANCE_KEYS, useKeyPress } from "../useKeyPress";
import { readingTime, useTypewriter } from "./useTypewriter";

interface DialogueLineViewProps {
  line: DialogueLine;
  /** Avançar a partir desta fala encerra o diálogo. */
  isFinal: boolean;
  /** Trava o movimento: avança com E/Espaço/Enter/clique. Senão, avança sozinha. */
  blocking: boolean;
  onAdvance: () => void;
}

/**
 * Uma fala: quem fala + texto em máquina de escrever.
 * O primeiro toque completa o texto; o seguinte avança.
 */
export function DialogueLineView({ line, isFinal, blocking, onAdvance }: DialogueLineViewProps) {
  const [instant] = useState(prefersReducedMotion);
  const { visible, hidden, done, finish } = useTypewriter(line.text, instant);
  const handleAdvance = () => (done ? onAdvance() : finish());

  useKeyPress(blocking, ADVANCE_KEYS, handleAdvance);

  // Diálogos que não travam o movimento seguem sozinhos após o tempo de leitura.
  useEffect(() => {
    if (blocking || !done) return;
    const timer = setTimeout(onAdvance, readingTime(line.text));
    return () => clearTimeout(timer);
  }, [blocking, done, line.text, onAdvance]);

  const isNarration = line.speaker === "narrator";
  const textStyle = isNarration
    ? "text-center text-lg text-stone-400 italic"
    : line.speaker === "aysha"
      ? "text-xl text-stone-300 italic"
      : "text-xl text-stone-100";

  const content = (
    <>
      {!isNarration && <SpeakerLabel id={line.speaker as CharacterId} />}
      {/* Leitores de tela recebem a fala inteira de uma vez. */}
      <span className="sr-only">{line.text}</span>
      <span aria-hidden className={`mt-2 block font-serif leading-relaxed ${textStyle}`}>
        {visible}
        {/* O restante ocupa espaço invisível: a caixa não muda de tamanho enquanto digita. */}
        <span className="invisible">{hidden}</span>
      </span>
      {blocking && (
        <span
          className={`mt-3 block text-right text-[0.65rem] tracking-[0.3em] text-stone-400/80 uppercase transition-opacity duration-500 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          {isFinal ? "[ E ] encerrar" : "[ E ] continuar"}
        </span>
      )}
    </>
  );

  return blocking ? (
    <button type="button" onClick={handleAdvance} className="block w-full cursor-pointer text-left">
      {content}
    </button>
  ) : (
    <div>{content}</div>
  );
}

function SpeakerLabel({ id }: { id: CharacterId }) {
  const label = useCharacterLabel(id);
  return <span className="block text-xs tracking-[0.25em] text-stone-400 uppercase">{label}</span>;
}
