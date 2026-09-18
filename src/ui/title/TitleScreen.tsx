"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { audioManager } from "@/audio/audioManager";
import { useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";
import { TitleBackdrop } from "./TitleBackdrop";

const TITLE_WORDS = ["BEYOND", "THE", "HILL"];
const LETTER_COUNT = TITLE_WORDS.join("").length;

interface TitleScreenProps {
  /** Chamado quando a transição termina e a tela pode ser desmontada. */
  onExited: () => void;
}

export function TitleScreen({ onExited }: TitleScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);
  const [leaving, setLeaving] = useState(false);
  const startGame = useGameStore((state) => state.startGame);

  // Entrada: colina surge, letras se revelam, depois subtítulo e botão.
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      const revealed = "[data-title-hill], [data-title-letter], [data-title-divider], [data-title-subtitle], [data-title-start]";
      if (reduced) {
        gsap.set(revealed, { autoAlpha: 1 });
        return;
      }
      gsap
        .timeline({ defaults: { ease: "power2.out" } })
        .fromTo("[data-title-hill]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 3.4, ease: "power1.out" }, 0)
        .fromTo(
          "[data-title-letter]",
          { autoAlpha: 0, y: 14, filter: "blur(10px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.6, stagger: 0.07 },
          0.6,
        )
        .fromTo("[data-title-divider]", { autoAlpha: 0, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 1.9)
        .fromTo("[data-title-subtitle]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 2.3)
        .fromTo("[data-title-start]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 3.1);
    }, rootRef);
    contextRef.current = context;
    return () => context.revert();
  }, []);

  // Saída: o texto se dissolve, a tela escurece e se abre sobre a cena 3D.
  const handleStart = () => {
    if (leaving) return;
    setLeaving(true);
    // Primeiro gesto do usuário: libera o áudio no navegador.
    audioManager.unlock();

    if (prefersReducedMotion()) {
      startGame();
      onExited();
      return;
    }

    contextRef.current?.add(() => {
      const center = (LETTER_COUNT - 1) / 2;
      gsap
        .timeline({ onComplete: onExited })
        .to("[data-title-start], [data-title-subtitle], [data-title-divider]", { autoAlpha: 0, duration: 0.8, ease: "power2.in" }, 0)
        .to(
          "[data-title-letter]",
          {
            x: (index: number) => (index - center) * 7,
            autoAlpha: 0,
            filter: "blur(8px)",
            duration: 1.8,
            ease: "power2.inOut",
          },
          0.1,
        )
        .to("[data-title-hill]", { autoAlpha: 0, y: 12, duration: 1.4, ease: "power2.in" }, 0.4)
        .add(startGame, 1.9)
        .to(rootRef.current, { autoAlpha: 0, duration: 2.6, ease: "power1.inOut" }, 2.1);
    });
  };

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 bg-[#050505] ${leaving ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      <TitleBackdrop />

      <div className="relative flex h-full flex-col items-center justify-center px-4 pb-[12vh] text-center">
        <h1
          aria-label="Beyond the Hill"
          className="font-serif text-[clamp(2.25rem,min(7.5vw,11vh),5.5rem)] leading-[1.15] font-light pl-[0.2em] tracking-[0.2em] text-balance text-stone-100 sm:pl-[0.32em] sm:tracking-[0.32em]"
        >
          {TITLE_WORDS.map((word, wordIndex) => (
            <Fragment key={word}>
              {/* Espaço comum entre palavras: permite quebra de linha em telas estreitas. */}
              {wordIndex > 0 && " "}
              <span aria-hidden className="inline-block whitespace-nowrap">
                {word.split("").map((letter, index) => (
                  <span key={index} data-title-letter className="invisible inline-block will-change-transform">
                    {letter}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </h1>

        <span
          data-title-divider
          aria-hidden
          className="invisible mt-[clamp(1rem,3vh,2rem)] block h-px w-24 bg-gradient-to-r from-transparent via-stone-300/50 to-transparent sm:w-40"
        />

        <p
          data-title-subtitle
          className="invisible mt-[clamp(0.75rem,2.5vh,1.5rem)] font-serif text-[clamp(1.05rem,2.6vw,1.6rem)] font-light tracking-[0.12em] text-stone-400 italic"
        >
          Além da Colina
        </p>

        <button
          type="button"
          data-title-start
          onClick={handleStart}
          disabled={leaving}
          className="group invisible mt-[clamp(1.5rem,9vh,5rem)] flex items-center gap-4 px-4 py-3 text-xs font-light tracking-[0.45em] text-stone-300 transition-colors duration-700 outline-none hover:text-stone-50 focus-visible:text-stone-50 sm:text-sm"
        >
          <span aria-hidden className="text-stone-500 transition-transform duration-700 group-hover:-translate-x-1.5 group-focus-visible:-translate-x-1.5">
            [
          </span>
          <span className="pl-[0.45em]">COMEÇAR</span>
          <span aria-hidden className="text-stone-500 transition-transform duration-700 group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5">
            ]
          </span>
        </button>
      </div>
    </div>
  );
}
