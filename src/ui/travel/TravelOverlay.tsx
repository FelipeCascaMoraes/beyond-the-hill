"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { zones } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Mostra a travessia enquanto a Aysha estiver indo de uma zona para outra. */
export function TravelOverlay() {
  const traveling = useGameStore((state) => state.traveling);
  if (!traveling) return null;
  return <TravelSequence key={traveling} />;
}

/**
 * Atravessar o Além não é andar: o lugar se fecha e se abre em outro. A tela
 * escurece, o nome do lugar aparece, e a Aysha já está lá.
 *
 *   escurece → nome do lugar → `completeTravel()` troca a zona → clareia
 */
function TravelSequence() {
  const traveling = useGameStore((state) => state.traveling);
  const completeTravel = useGameStore((state) => state.completeTravel);
  const title = traveling ? zones[traveling].title : "";
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      gsap
        .timeline()
        .fromTo("[data-travel-dark]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 1.1, ease: "power2.in" })
        // Só depois do escuro completo a zona troca: ninguém vê o mundo saltar.
        .add(completeTravel)
        .fromTo("[data-travel-title]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 1.2 })
        .to("[data-travel-title]", { autoAlpha: 0, duration: reduced ? 0.2 : 1 }, "+=1.4")
        .to("[data-travel-dark]", { autoAlpha: 0, duration: reduced ? 0.2 : 1.4 }, "-=0.4");
    }, rootRef);
    return () => context.revert();
  }, [completeTravel]);

  return (
    <div ref={rootRef} role="presentation" className="pointer-events-auto absolute inset-0 overflow-hidden">
      <div data-travel-dark className="invisible absolute inset-0 bg-black" />
      <div data-travel-title className="invisible absolute inset-0 flex flex-col items-center justify-center gap-3">
        <p className="text-[0.65rem] tracking-[0.45em] text-stone-400/60 uppercase">O Além</p>
        <p className="font-serif text-[clamp(1.5rem,3vw,2.4rem)] font-light tracking-[0.08em] text-stone-200/85 italic">{title}</p>
      </div>
    </div>
  );
}
