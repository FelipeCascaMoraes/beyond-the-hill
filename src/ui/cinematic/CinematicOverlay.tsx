"use client";

import { useState } from "react";
import { selectCinematicStep, useGameStore } from "@/game/state/gameStore";

/**
 * O que a tela faz durante uma cena: duas faixas escuras, em cima e embaixo,
 * que avisam sem palavras que o controle saiu das mãos do jogador — e, quando
 * a cena pede, uma frase sozinha sobre o mundo escurecido ("Eu me lembro.").
 *
 * A frase continua na tela enquanto o véu se desfaz, depois que o passo acaba:
 * ela sai devagar, não some.
 */
export function CinematicOverlay() {
  const active = useGameStore((state) => state.activeCinematic !== null);
  const step = useGameStore(selectCinematicStep);
  const title = step?.type === "title" ? step.text : null;

  // Guarda a última frase para ela continuar legível enquanto se apaga.
  const [shown, setShown] = useState<string | null>(null);
  if (title && title !== shown) setShown(title);

  return (
    <>
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[7vh] bg-black/90 transition-transform duration-[1400ms] ease-out motion-reduce:duration-200 ${
          active ? "translate-y-0" : "-translate-y-full"
        }`}
      />
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-[7vh] bg-black/90 transition-transform duration-[1400ms] ease-out motion-reduce:duration-200 ${
          active ? "translate-y-0" : "translate-y-full"
        }`}
      />

      <div
        aria-hidden={!title}
        className={`absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(58,38,16,0.72)_0%,rgba(10,6,2,0.92)_100%)] transition-opacity ease-in-out motion-reduce:duration-300 ${
          title ? "opacity-100 duration-[1600ms]" : "opacity-0 duration-[2400ms]"
        }`}
      >
        <p
          role="status"
          aria-live="polite"
          className={`font-serif text-[clamp(2rem,4.5vw,3.4rem)] font-light tracking-[0.04em] text-amber-50/90 italic transition-[opacity,filter] duration-[2000ms] motion-reduce:delay-0 motion-reduce:duration-300 ${
            title ? "opacity-100 blur-0 delay-500" : "opacity-0 blur-[3px]"
          }`}
        >
          {shown}
        </p>
      </div>
    </>
  );
}
