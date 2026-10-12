"use client";

import { selectCinematicStep, useGameStore } from "@/game/state/gameStore";

/**
 * O fim: a colina fica na tela mais um instante, a tela escurece devagar e
 * sobra o título — o mesmo da abertura, com as mesmas letras — e, por último,
 * a palavra final. O texto vem do passo `finale` da cena que terminou o jogo.
 */
export function EndScreen() {
  const step = useGameStore(selectCinematicStep);
  if (step?.type !== "finale") return null;

  return (
    <div
      role="dialog"
      aria-label={`${step.title}. ${step.subtitle}.`}
      className="pointer-events-auto absolute inset-0 flex animate-[end-dark_4.5s_ease-in-out_both] flex-col items-center justify-center bg-[#050505] px-4 pb-[6vh] text-center motion-reduce:animate-none"
    >
      <h1 className="animate-[end-title_3.2s_ease-out_3.6s_both] pl-[0.2em] font-serif text-[clamp(2.25rem,min(7.5vw,11vh),5.5rem)] leading-[1.15] font-light tracking-[0.2em] text-balance text-stone-100 motion-reduce:animate-none sm:pl-[0.32em] sm:tracking-[0.32em]">
        {step.title}
      </h1>
      <span
        aria-hidden
        className="mt-[clamp(1rem,3vh,2rem)] block h-px w-24 animate-[end-divider_1.6s_ease-in-out_6s_both] bg-gradient-to-r from-transparent via-stone-300/50 to-transparent motion-reduce:animate-none sm:w-40"
      />
      <p className="mt-[clamp(1.5rem,6vh,3.5rem)] animate-[end-title_2.4s_ease-out_7.6s_both] pl-[0.6em] text-sm font-light tracking-[0.6em] text-stone-400 motion-reduce:animate-none">
        {step.subtitle}
      </p>
    </div>
  );
}
