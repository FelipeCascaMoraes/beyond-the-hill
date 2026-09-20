"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Tempo máximo do apagão (ms), mesmo se a animação não terminar. */
const RESCUE_AFTER = 8000;

/** Mostra o apagão enquanto uma máquina estiver com a Aysha. */
export function CaptureOverlay() {
  const captured = useGameStore((state) => state.captured);
  if (!captured) return null;
  return <CaptureSequence />;
}

/**
 * O que acontece quando uma máquina alcança a Aysha: nenhuma luta, nenhum
 * golpe. Uma luz branca cobre tudo, o campo some e ela acorda de novo no
 * começo, como no primeiro instante do Além.
 *
 *   clarão → escuro → `completeCapture()` devolve a Aysha ao início da zona.
 */
function CaptureSequence() {
  const completeCapture = useGameStore((state) => state.completeCapture);
  const rootRef = useRef<HTMLDivElement>(null);

  // Se a animação não terminar (aba em segundo plano, GSAP interrompido), o
  // apagão acaba assim mesmo: o jogador nunca fica sem controle para sempre.
  useEffect(() => {
    const rescue = setTimeout(completeCapture, RESCUE_AFTER);
    return () => clearTimeout(rescue);
  }, [completeCapture]);

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      gsap
        .timeline({ onComplete: completeCapture })
        .fromTo("[data-capture-flash]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 0.22, ease: "power2.in" })
        .to("[data-capture-flash]", { autoAlpha: 0, duration: reduced ? 0.2 : 0.9, ease: "power2.out" }, "+=0.15")
        .fromTo("[data-capture-dark]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 0.7 }, "<")
        .fromTo("[data-capture-text]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 0.8 })
        .to("[data-capture-text]", { autoAlpha: 0, duration: reduced ? 0.2 : 0.7 }, "+=1.1")
        .to("[data-capture-dark]", { autoAlpha: 0, duration: reduced ? 0.2 : 1 }, "-=0.3");
    }, rootRef);
    return () => context.revert();
  }, [completeCapture]);

  return (
    <div ref={rootRef} role="presentation" className="pointer-events-auto absolute inset-0 overflow-hidden">
      <div data-capture-dark className="invisible absolute inset-0 bg-black" />
      <div data-capture-text className="invisible absolute inset-0 flex items-center justify-center px-6 text-center">
        <p className="max-w-xl font-serif text-[clamp(1.1rem,2.2vw,1.6rem)] leading-relaxed font-light text-stone-200/80 italic">
          O zumbido cobre tudo. O campo se apaga.
        </p>
      </div>
      <div data-capture-flash className="invisible absolute inset-0 bg-[#eef3f8]" />
    </div>
  );
}
