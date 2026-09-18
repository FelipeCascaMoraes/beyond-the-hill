"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { memories, type Memory, type MemoryId, type MemoryTone } from "@/content";
import { fragmentDuration, isLastFragment } from "@/game/memory/memoryLogic";
import { useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";
import { ADVANCE_KEYS, useKeyPress } from "../useKeyPress";

/** Mostra a memória ativa, se houver. Uma instância nova por memória. */
export function MemoryOverlay() {
  const id = useGameStore((state) => state.activeMemory?.id ?? null);
  if (!id) return null;
  return <MemorySequence key={id} id={id} />;
}

type Stage = "entering" | "showing" | "leaving";

/** Aparência de cada clima de lembrança. */
const tones: Record<MemoryTone, { veil: string; shade: string; leak: string; flash: string }> = {
  // Dourada, afetiva: sépia quente e uma luz vazando pelo canto, como um filme antigo.
  warm: {
    veil: "backdrop-blur-[6px] backdrop-brightness-90 backdrop-contrast-90 backdrop-sepia-75 backdrop-saturate-125",
    shade: "bg-[radial-gradient(ellipse_at_center,rgba(140,95,35,0.14)_0%,rgba(22,12,3,0.8)_100%)]",
    leak: "bg-[radial-gradient(circle_at_85%_12%,rgba(255,200,120,0.35),transparent_45%)]",
    flash: "bg-[#f7ecd6]",
  },
  // Fria, dolorosa: quase sem cor, escura.
  cold: {
    veil: "backdrop-blur-[6px] backdrop-brightness-75 backdrop-grayscale-80",
    shade: "bg-[radial-gradient(ellipse_at_center,rgba(40,55,70,0.12)_0%,rgba(4,6,10,0.85)_100%)]",
    leak: "",
    flash: "bg-[#dfe6ee]",
  },
};

/**
 * Sequência de uma memória:
 *   entrada (clarão quente → mundo em sépia e desfocado) → fragmentos um a um
 *   → saída (clarão → mundo normal) → `completeMemory()` devolve o controle.
 * O conteúdo vem de `content/memories.ts`; nada aqui é específico de uma memória.
 */
function MemorySequence({ id }: { id: MemoryId }) {
  const memory: Memory = memories[id];
  const fragmentIndex = useGameStore((state) => state.activeMemory?.fragment ?? 0);
  const advanceMemory = useGameStore((state) => state.advanceMemory);
  const completeMemory = useGameStore((state) => state.completeMemory);

  const rootRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);
  const [stage, setStage] = useState<Stage>("entering");

  // Entrada.
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      gsap
        .timeline({ onComplete: () => setStage("showing") })
        .fromTo(
          "[data-memory-flash]",
          { autoAlpha: 0 },
          { autoAlpha: reduced ? 0 : 0.92, duration: reduced ? 0 : 0.45, ease: "power2.in" },
        )
        .set("[data-memory-veil]", { autoAlpha: 1 })
        .to("[data-memory-flash]", { autoAlpha: 0, duration: reduced ? 0.2 : 1.2, ease: "power2.out" })
        .fromTo("[data-memory-content]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 1 }, reduced ? ">" : "-=0.7");
    }, rootRef);
    contextRef.current = context;
    return () => context.revert();
  }, []);

  // Saída: só depois dela a memória é registrada e o controle volta.
  const leave = () => {
    setStage("leaving");
    const reduced = prefersReducedMotion();
    contextRef.current?.add(() => {
      gsap
        .timeline({ onComplete: completeMemory })
        .to("[data-memory-content]", { autoAlpha: 0, duration: reduced ? 0.15 : 0.5 })
        .to("[data-memory-flash]", { autoAlpha: reduced ? 0 : 0.8, duration: reduced ? 0 : 0.35, ease: "power2.in" })
        .set("[data-memory-veil]", { autoAlpha: 0 })
        .to("[data-memory-flash]", { autoAlpha: 0, duration: reduced ? 0.15 : 0.9, ease: "power2.out" });
    });
  };

  const isLast = isLastFragment(memory, fragmentIndex);
  const handleAdvance = () => {
    if (stage !== "showing") return;
    if (isLast) leave();
    else advanceMemory();
  };
  useKeyPress(stage === "showing", ADVANCE_KEYS, handleAdvance);

  // Memórias em reprodução automática avançam sozinhas (E ainda adianta).
  const advanceRef = useRef(handleAdvance);
  useEffect(() => {
    advanceRef.current = handleAdvance;
  });
  const duration = fragmentDuration(memory, fragmentIndex);
  useEffect(() => {
    if (!memory.autoplay || stage !== "showing") return;
    const timer = setTimeout(() => advanceRef.current(), duration * 1000);
    return () => clearTimeout(timer);
  }, [memory.autoplay, stage, fragmentIndex, duration]);

  const tone = tones[memory.tone ?? "warm"];
  const fragment = memory.fragments[fragmentIndex];
  const isVoice = fragment.kind === "voice";
  const textStyle = fragment.soft
    ? "text-[clamp(1.1rem,2vw,1.5rem)] tracking-[0.04em] text-amber-50/80 italic"
    : isVoice
      ? "text-[clamp(1.35rem,2.6vw,2rem)] text-amber-100 italic"
      : "text-[clamp(1.35rem,2.6vw,2rem)] font-light text-stone-100";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`Lembrança: ${memory.title}`}
      onClick={handleAdvance}
      className="pointer-events-auto absolute inset-0 cursor-pointer overflow-hidden"
    >
      {/* O mundo continua ali atrás, mas em sépia, desfocado e escurecido nas bordas. */}
      <div data-memory-veil className={`invisible absolute inset-0 overflow-hidden ${tone.veil}`}>
        <div className={`absolute inset-0 ${tone.shade}`} />
        {tone.leak && <div className={`hill-glow absolute inset-0 mix-blend-screen ${tone.leak}`} />}
        <div className="film-grain" />
      </div>

      <div data-memory-content className="invisible relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[0.65rem] tracking-[0.45em] text-amber-100/55 uppercase">Lembrança</p>
        <p className="mt-2 font-serif text-lg text-amber-50/75 italic">{memory.title}</p>

        {/* key: cada fragmento entra com a própria animação. */}
        <p
          key={fragmentIndex}
          aria-live="polite"
          className={`mt-12 max-w-2xl font-serif leading-relaxed animate-[memory-fragment-in_1.4s_ease-out] motion-reduce:animate-none ${textStyle}`}
        >
          {isVoice ? `“${fragment.text}”` : fragment.text}
        </p>

        <div aria-hidden className="mt-12 flex gap-2">
          {memory.fragments.map((_, index) => (
            <span
              key={index}
              className={`size-1 rounded-full transition-colors duration-700 ${index <= fragmentIndex ? "bg-amber-100/70" : "bg-amber-100/20"}`}
            />
          ))}
        </div>

        {/* Em reprodução automática não há instrução: só a lembrança. */}
        {!memory.autoplay && (
          <p
            className={`absolute bottom-[10vh] text-[0.65rem] tracking-[0.3em] text-stone-300/60 uppercase transition-opacity duration-700 ${
              stage === "showing" ? "opacity-100" : "opacity-0"
            }`}
          >
            {isLast ? "[ E ] voltar" : "[ E ] continuar"}
          </p>
        )}
      </div>

      <div data-memory-flash className={`pointer-events-none invisible absolute inset-0 ${tone.flash}`} />
    </div>
  );
}
